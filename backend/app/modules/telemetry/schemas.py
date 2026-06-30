from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TelemetryDataBase(BaseModel):
    device_serial: str
    cpu_temp: Optional[float] = None
    cpu_usage: Optional[float] = None
    ram_usage: Optional[float] = None
    sensor_value: Optional[float] = None

class TelemetryDataCreate(TelemetryDataBase):
    pass

class TelemetryDataOut(TelemetryDataBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
