from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, JSON
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import datetime

class IotSensor(Base):
    __tablename__ = "iot_sensor"

    id = Column(Integer, primary_key=True, index=True)
    sensor_code = Column(String, unique=True, index=True, nullable=False)  # ej. "MT-942-A"
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    type = Column(String, default="environmental", index=True)  # electrical | environmental | fluids
    status = Column(String, default="offline", index=True)  # online | offline
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=True, index=True)
    last_seen = Column(DateTime, nullable=True)
    metrics = Column(JSON, nullable=True)  # lista de {name, value, unit, status, trend}
    send_interval_seconds = Column(Integer, default=300, nullable=False)
    baud_rate = Column(Integer, default=9600, nullable=True)
    ota_version = Column(String, nullable=True)
    ota_file_path = Column(String, nullable=True)
    temperature_unit = Column(String, default="C")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", backref="iot_sensors")


class AlertRule(Base):
    __tablename__ = "alert_rule"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    sensor_id = Column(Integer, ForeignKey("iot_sensor.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_name = Column(String, nullable=False)
    condition = Column(String, nullable=False)  # gt | lt | gte | lte
    threshold = Column(Float, nullable=False)
    severity = Column(String, default="warning")  # warning | critical
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", backref="alert_rules")
    sensor = relationship("IotSensor", backref="alert_rules")


class FiredAlert(Base):
    __tablename__ = "fired_alert"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("alert_rule.id", ondelete="CASCADE"), nullable=False, index=True)
    sensor_id = Column(Integer, ForeignKey("iot_sensor.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_name = Column(String, nullable=False)
    current_value = Column(Float, nullable=False)
    unit = Column(String, nullable=True)
    threshold = Column(Float, nullable=False)
    condition = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    fired_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    rule = relationship("AlertRule", backref="fired_alerts")
    sensor = relationship("IotSensor", backref="fired_alerts")
