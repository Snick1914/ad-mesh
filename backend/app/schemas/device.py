from pydantic import BaseModel
from typing import Optional

class DeviceBase(BaseModel):
    name: str
    status: Optional[str] = "offline"

class DeviceCreate(DeviceBase):
    pass

class Device(DeviceBase):
    id: str

    class Config:
        from_attributes = True
