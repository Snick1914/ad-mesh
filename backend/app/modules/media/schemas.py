from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MediaBase(BaseModel):
    name: str
    file_type: str
    file_size_bytes: int

class MediaOut(BaseModel):
    id: int
    name: str
    file_path: str
    file_type: str
    file_size_bytes: int
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True

class MediaUploadResponse(BaseModel):
    success: bool
    message: str
    media: Optional[MediaOut] = None

class MediaDeleteResponse(BaseModel):
    success: bool
    message: str
