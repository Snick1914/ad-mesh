from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DeviceBase(BaseModel):
    name: Optional[str] = None
    serial_number: str
    status: Optional[str] = "offline"
    storage_limit_gb: Optional[float] = 10.0

class DeviceCreate(DeviceBase):
    pass

class DeviceOut(BaseModel):
    id: int
    name: Optional[str]
    serial_number: str
    status: str
    is_paired: bool
    user_id: Optional[int]
    last_heartbeat: Optional[datetime]
    ip_address: Optional[str]
    storage_used_gb: float
    storage_limit_gb: float

    class Config:
        from_attributes = True

class DevicePairRequest(BaseModel):
    pairing_code: str
    name: str

class DevicePairResponse(BaseModel):
    success: bool
    message: str
    device: Optional[DeviceOut] = None

class DeviceHeartbeat(BaseModel):
    ip_address: Optional[str] = None
    storage_used_gb: Optional[float] = 0.0
    status: Optional[str] = "online"

class PairingCodeRequest(BaseModel):
    serial_number: str

class PairingCodeResponse(BaseModel):
    serial_number: str
    pairing_code: str
    is_paired: bool
