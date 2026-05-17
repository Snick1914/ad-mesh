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
