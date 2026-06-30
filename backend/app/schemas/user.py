from typing import Optional
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    max_devices: Optional[int] = 5
    max_storage_gb: Optional[int] = 10
    has_telemetry: Optional[bool] = True
    has_ads: Optional[bool] = True

class UserCreate(UserBase):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    company_name: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class User(UserBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[int] = None

class UserLimitsUpdate(BaseModel):
    max_devices: int
    max_storage_gb: int
    has_telemetry: bool
    has_ads: bool

class UserStatusUpdate(BaseModel):
    is_active: bool
