from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.models.user import User
from app.modules.devices.schemas import (
    DeviceOut, DevicePairRequest, DevicePairResponse, 
    PairingCodeRequest, PairingCodeResponse, DeviceHeartbeat,
    DeviceConfigUpdate, DeviceScheduleCreate, DeviceScheduleOut
)
from app.modules.devices.services.device_service import DeviceService

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, serial_number: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[serial_number] = websocket

    def disconnect(self, serial_number: str):
        if serial_number in self.active_connections:
            del self.active_connections[serial_number]

    async def send_personal_message(self, message: dict, serial_number: str):
        if serial_number in self.active_connections:
            websocket = self.active_connections[serial_number]
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error sending WebSocket message to {serial_number}: {e}")
                self.disconnect(serial_number)

manager = ConnectionManager()

@router.websocket("/ws/{serial_number}")
async def websocket_endpoint(websocket: WebSocket, serial_number: str):
    await manager.connect(serial_number, websocket)
    print(f"WebSocket: Pantalla conectada: {serial_number}")
    try:
        while True:
            # Mantener conexión activa y recibir respuestas ping/pong del cliente si existieran
            data = await websocket.receive_text()
            await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(serial_number)
        print(f"WebSocket: Pantalla desconectada: {serial_number}")

@router.get("/", response_model=List[DeviceOut])
def list_devices(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Obtener todas las pantallas emparejadas del cliente actual logueado.
    """
    service = DeviceService(db)
    return service.get_user_devices(current_user.id)

@router.post("/request-pairing", response_model=PairingCodeResponse)
def request_pairing_code(
    payload: PairingCodeRequest,
    db: Session = Depends(deps.get_db)
):
    """
    Invocado por el reproductor físico para solicitar un código de emparejamiento.
    """
    service = DeviceService(db)
    device = service.generate_pairing_code(payload.serial_number)
    return {
        "serial_number": device.serial_number,
        "pairing_code": device.pairing_code or "",
        "is_paired": device.is_paired
    }

@router.post("/pair", response_model=DevicePairResponse)
def pair_device(
    payload: DevicePairRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Invocado por el Dashboard Web del usuario para enlazar una pantalla usando el código.
    """
    service = DeviceService(db)
    success, message, device = service.pair_device(
        user_id=current_user.id,
        pairing_code=payload.pairing_code,
        name=payload.name
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    return {
        "success": True,
        "message": message,
        "device": device
    }

@router.post("/{serial_number}/heartbeat", response_model=DeviceOut)
def player_heartbeat(
    serial_number: str,
    payload: DeviceHeartbeat,
    db: Session = Depends(deps.get_db)
):
    """
    Invocado por el reproductor físico de forma periódica para reportar signos vitales y telemetría.
    """
    service = DeviceService(db)
    return service.register_heartbeat(
        serial_number=serial_number,
        ip_address=payload.ip_address,
        storage_used_gb=payload.storage_used_gb,
        status=payload.status
    )

def _serialize_playlist_helper(playlist_id: int | None, db: Session):
    if not playlist_id:
        return {
            "playlist_id": None,
            "name": "Sin Playlist",
            "items": []
        }
    from app.modules.playlists.models import Playlist
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        return {
            "playlist_id": None,
            "name": "Sin Playlist",
            "items": []
        }
    
    items = []
    for item in playlist.items:
        if not item.media.is_deleted:
            items.append({
                "id": item.id,
                "media_id": item.media_id,
                "name": item.media.name,
                "file_path": item.media.file_path,
                "file_type": item.media.file_type,
                "position": item.position,
                "duration_seconds": item.duration_seconds
            })
    return {
        "playlist_id": playlist.id,
        "name": playlist.name,
        "items": items
    }

@router.get("/{serial_number}/playlist")
def get_device_playlist(
    serial_number: str,
    db: Session = Depends(deps.get_db)
):
    """
    Obtener la lista de reproducción activa y sus recursos multimedia para la Raspberry Pi.
    """
    service = DeviceService(db)
    device = service.get_by_serial(serial_number)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado."
        )
    if not device.is_paired or not device.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El dispositivo no está emparejado."
        )

    # Si no tiene una playlist principal asignada, buscar la activa general del usuario como fallback
    playlist_id = device.playlist_id
    if not playlist_id:
        from app.modules.playlists.models import Playlist
        active_p = db.query(Playlist).filter(
            Playlist.user_id == device.user_id,
            Playlist.is_active == True
        ).first()
        if active_p:
            playlist_id = active_p.id

    from app.modules.devices.models import DeviceSchedule
    schedules = db.query(DeviceSchedule).filter(DeviceSchedule.device_id == device.id).all()
    schedules_data = []
    for s in schedules:
        schedules_data.append({
            "id": s.id,
            "zone": s.zone,
            "playlist_id": s.playlist_id,
            "start_time": s.start_time.strftime("%H:%M:%S") if s.start_time else "00:00:00",
            "end_time": s.end_time.strftime("%H:%M:%S") if s.end_time else "00:00:00",
            "days_of_week": s.days_of_week,
            "playlist": _serialize_playlist_helper(s.playlist_id, db)
        })

    return {
        "serial_number": device.serial_number,
        "resolution": device.resolution,
        "layout": device.layout,
        "layout_config": device.layout_config,
        "playlist_id": playlist_id,
        "zone_a": _serialize_playlist_helper(playlist_id, db),
        "zone_b": _serialize_playlist_helper(device.playlist_b_id, db),
        "zone_c": _serialize_playlist_helper(device.playlist_c_id, db),
        "schedules": schedules_data
    }

@router.put("/{device_id}/config", response_model=DeviceOut)
async def update_device_configuration(
    device_id: int,
    payload: DeviceConfigUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Actualizar la resolución, el diseño de pantalla (layout) y las playlists de un dispositivo.
    """
    service = DeviceService(db)
    success, message, device = service.update_device_config(
        device_id=device_id,
        user_id=current_user.id,
        resolution=payload.resolution,
        layout=payload.layout,
        layout_config=payload.layout_config,
        playlist_id=payload.playlist_id,
        playlist_b_id=payload.playlist_b_id,
        playlist_c_id=payload.playlist_c_id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    await manager.send_personal_message({"event": "sync_playlist"}, device.serial_number)
    return device

@router.delete("/{device_id}/unpair", response_model=DeviceOut)
async def unpair_device(
    device_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Desvincular una pantalla del usuario actual.
    """
    service = DeviceService(db)
    success, message, device = service.unpair_device(
        device_id=device_id,
        user_id=current_user.id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    await manager.send_personal_message({"event": "unpair"}, device.serial_number)
    return device

@router.get("/{device_id}/schedules", response_model=List[DeviceScheduleOut])
def get_device_schedules(
    device_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Obtener la programación horaria de listas de reproducción de un dispositivo.
    """
    service = DeviceService(db)
    return service.get_schedules(device_id=device_id, user_id=current_user.id)

@router.post("/{device_id}/schedules", response_model=DeviceScheduleOut)
def create_device_schedule(
    device_id: int,
    payload: DeviceScheduleCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Crear una regla de programación horaria para una lista de reproducción en un dispositivo.
    """
    service = DeviceService(db)
    schedule = service.create_schedule(
        device_id=device_id,
        user_id=current_user.id,
        schedule_in=payload
    )
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear la regla de programación. Verifica el dispositivo y permisos."
        )
    return schedule

@router.delete("/schedules/{schedule_id}")
def delete_device_schedule(
    schedule_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Eliminar una regla de programación horaria.
    """
    service = DeviceService(db)
    success = service.delete_schedule(schedule_id=schedule_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al eliminar la programación o permisos insuficientes."
        )
    return {"status": "success", "message": "Programación eliminada con éxito."}


