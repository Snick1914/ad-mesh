from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.modules.telemetry.models import TelemetryData
from app.modules.telemetry.schemas import TelemetryDataOut

router = APIRouter()

@router.get("/{device_serial}", response_model=List[TelemetryDataOut])
async def read_device_telemetry(
    device_serial: str,
    limit: int = 50,
    db: Session = Depends(deps.get_db)
):
    """
    Fetch historical telemetry data logs for a device.
    """
    logs = db.query(TelemetryData)\
        .filter(TelemetryData.device_serial == device_serial)\
        .order_by(TelemetryData.timestamp.desc())\
        .limit(limit)\
        .all()
    logs.reverse()
    return logs
