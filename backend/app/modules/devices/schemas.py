from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, time

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
    resolution: str
    layout: str
    layout_config: Optional[Dict[str, Any]] = None
    baud_rate: Optional[int] = 9600
    playlist_id: Optional[int]
    playlist_b_id: Optional[int]
    playlist_c_id: Optional[int]

    class Config:
        from_attributes = True

class DeviceConfigUpdate(BaseModel):
    resolution: Optional[str] = None
    layout: Optional[str] = None
    layout_config: Optional[Dict[str, Any]] = None
    baud_rate: Optional[int] = None
    playlist_id: Optional[int] = None
    playlist_b_id: Optional[int] = None
    playlist_c_id: Optional[int] = None

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

class DeviceScheduleBase(BaseModel):
    zone: str
    playlist_id: int
    start_time: time
    end_time: time
    days_of_week: List[int]

class DeviceScheduleCreate(DeviceScheduleBase):
    pass

class DeviceScheduleOut(DeviceScheduleBase):
    id: int
    device_id: int

    class Config:
        from_attributes = True
