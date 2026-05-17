from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger, Boolean
from sqlalchemy.orm import relationship
from app.db.base_class import Base
import datetime

class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, index=True, nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", backref="media_files")
