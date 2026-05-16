from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.device import Device, DeviceCreate

router = APIRouter()

@router.get("/", response_model=List[Device])
async def read_devices():
    # Placeholder data
    return [
        {"id": "1", "name": "Pantalla Recepción", "status": "online"},
        {"id": "2", "name": "Vitrina Principal", "status": "offline"}
    ]

@router.post("/", response_model=Device)
async def create_device(device_in: DeviceCreate):
    return {"id": "3", "name": device_in.name, "status": "online"}
