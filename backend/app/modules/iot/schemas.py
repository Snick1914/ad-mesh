from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime

SensorType = Literal["electrical", "environmental", "fluids"]
SensorStatus = Literal["online", "offline"]
MetricStatus = Literal["normal", "warning", "critical"]
MetricTrend = Literal["up", "down", "stable"]
AlertCondition = Literal["gt", "lt", "gte", "lte"]
AlertSeverity = Literal["warning", "critical"]


class SensorMetric(BaseModel):
    name: str
    value: float
    unit: str
    status: MetricStatus = "normal"
    trend: MetricTrend = "stable"


class IotSensorCreate(BaseModel):
    sensor_code: str
    name: str
    location: Optional[str] = None
    type: SensorType = "environmental"
    metrics: Optional[List[SensorMetric]] = None
    send_interval_seconds: Optional[int] = 300
    baud_rate: Optional[int] = 9600
    alert_email: Optional[str] = None


class IotSensorOut(BaseModel):
    id: int
    sensor_code: str
    name: str
    location: Optional[str]
    type: str
    status: str
    last_seen: Optional[datetime]
    metrics: Optional[List[SensorMetric]] = None
    send_interval_seconds: int
    baud_rate: Optional[int]
    ota_version: Optional[str] = None
    ota_file_path: Optional[str] = None
    temperature_unit: Optional[str] = "C"
    alert_email: Optional[str] = None

    class Config:
        from_attributes = True


class IotSensorConfigUpdate(BaseModel):
    name: Optional[str] = None
    send_interval_seconds: int
    baud_rate: Optional[int] = None
    type: Optional[str] = None
    temperature_unit: Optional[str] = None
    alert_email: Optional[str] = None


class SensorIngest(BaseModel):
    metrics: List[SensorMetric]
    linking_code: Optional[str] = None  # código de vinculación del usuario, escrito en el ESP32
    name: Optional[str] = None          # usado solo si el sensor no existe aún (auto-registro)
    location: Optional[str] = None
    type: Optional[SensorType] = None


class AlertRuleCreate(BaseModel):
    sensor_id: int
    name: Optional[str] = None
    custom_message: Optional[str] = None
    metric_name: str
    condition: AlertCondition
    threshold: float
    duration_minutes: Optional[int] = 0
    notify_interval_minutes: Optional[int] = 0
    severity: AlertSeverity = "warning"


class AlertRuleOut(BaseModel):
    id: int
    sensor_id: int
    name: Optional[str] = None
    custom_message: Optional[str] = None
    metric_name: str
    condition: str
    threshold: float
    duration_minutes: int = 0
    notify_interval_minutes: int = 0
    severity: str
    enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FiredAlertOut(BaseModel):
    id: int
    rule_id: int
    sensor_id: int
    metric_name: str
    custom_message: Optional[str] = None
    current_value: float
    unit: Optional[str]
    threshold: float
    condition: str
    severity: str
    fired_at: datetime

    class Config:
        from_attributes = True


class IotTelemetryHistoryOut(BaseModel):
    id: int
    sensor_id: int
    sensor_code: str
    metrics: List[SensorMetric]
    created_at: datetime

    class Config:
        from_attributes = True

