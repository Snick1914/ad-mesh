from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, JSON, Time
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Device(Base):
    __tablename__ = "device"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True)
    serial_number = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="offline", index=True) # "online", "offline", "syncing"
    pairing_code = Column(String, unique=True, index=True, nullable=True)
    is_paired = Column(Boolean, default=False, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=True)
    last_heartbeat = Column(DateTime, nullable=True)
    ip_address = Column(String, nullable=True)
    storage_used_gb = Column(Float, default=0.0)
    storage_limit_gb = Column(Float, default=10.0)
    
    # Ajustes reales de distribución y listas de reproducción
    resolution = Column(String, default="1920x1080", nullable=False)
    layout = Column(String, default="single", nullable=False)
    layout_config = Column(JSON, nullable=True) # ej. {"zone_a_height": 60, "zone_b_height": 40}
    playlist_id = Column(Integer, ForeignKey("playlist.id", ondelete="SET NULL"), nullable=True)
    playlist_b_id = Column(Integer, ForeignKey("playlist.id", ondelete="SET NULL"), nullable=True)
    playlist_c_id = Column(Integer, ForeignKey("playlist.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", backref="devices")

class DeviceSchedule(Base):
    __tablename__ = "device_schedule"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("device.id", ondelete="CASCADE"), nullable=False)
    zone = Column(String, nullable=False) # "A", "B", "C"
    playlist_id = Column(Integer, ForeignKey("playlist.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    days_of_week = Column(JSON, nullable=False) # ej. [1, 2, 3, 4, 5] para Lun-Vie

    device = relationship("Device", backref="schedules")
    playlist = relationship("Playlist")
