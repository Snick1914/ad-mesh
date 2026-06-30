from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.modules.telemetry.models import TelemetryData
from app.modules.telemetry.schemas import TelemetryDataOut, TelemetryDataCreate

router = APIRouter()

@router.post("/", response_model=TelemetryDataOut)
async def create_telemetry_log(
    data: TelemetryDataCreate,
    db: Session = Depends(deps.get_db)
):
    """
    Ingest a new telemetry log from a device, save to DB, and publish to MQTT.
    """
    # 1. Save to database
    db_obj = TelemetryData(
        device_serial=data.device_serial,
        cpu_temp=data.cpu_temp,
        cpu_usage=data.cpu_usage,
        ram_usage=data.ram_usage,
        sensor_value=data.sensor_value
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # 2. Publish to MQTT broker internally for real-time frontend streaming
    try:
        from app.core.mqtt import mqtt_service
        if mqtt_service.client and mqtt_service.client.is_connected:
            import json
            payload = {
                "cpu_temp": data.cpu_temp,
                "cpu_usage": data.cpu_usage,
                "ram_usage": data.ram_usage,
                "sensor_value": data.sensor_value
            }
            mqtt_service.client.publish(
                f"devices/{data.device_serial}/telemetry",
                json.dumps(payload),
                qos=1
            )
    except Exception as mqtt_err:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to publish telemetry to MQTT: {mqtt_err}")

    return db_obj

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
