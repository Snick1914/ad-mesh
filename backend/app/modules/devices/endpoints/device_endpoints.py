from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.models.user import User
from app.modules.devices.schemas import (
    DeviceOut, DevicePairRequest, DevicePairResponse, 
    PairingCodeRequest, PairingCodeResponse, DeviceHeartbeat
)
from app.modules.devices.services.device_service import DeviceService

router = APIRouter()

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

    # Buscar la lista de reproducción activa del usuario
    from app.modules.playlists.models import Playlist
    playlist = db.query(Playlist).filter(
        Playlist.user_id == device.user_id,
        Playlist.is_active == True
    ).first()

    if not playlist:
        return {
            "playlist_id": None,
            "name": "Sin Playlist Activa",
            "items": []
        }

    # Serializar los elementos con sus recursos
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
