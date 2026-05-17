from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float
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

    user = relationship("User", backref="devices")
