from sqlalchemy import Column, Integer, String, Boolean
from app.db.base_class import Base

class User(Base):
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, index=True)
    hashed_password = Column(String, nullable=True) # Nullable for Google users
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    google_id = Column(String, unique=True, index=True, nullable=True)
