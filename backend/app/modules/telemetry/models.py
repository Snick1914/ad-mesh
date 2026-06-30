from sqlalchemy import Column, Integer, String, Float, DateTime
from app.db.base_class import Base
import datetime

class TelemetryData(Base):
    __tablename__ = "telemetry_data"

    id = Column(Integer, primary_key=True, index=True)
    device_serial = Column(String, index=True, nullable=False)
    cpu_temp = Column(Float, nullable=True)
    cpu_usage = Column(Float, nullable=True)
    ram_usage = Column(Float, nullable=True)
    sensor_value = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
