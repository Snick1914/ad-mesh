from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.modules.media.schemas import MediaOut

class PlaylistItemCreate(BaseModel):
    media_id: int
    position: int
    duration_seconds: Optional[int] = 15

class PlaylistItemOut(BaseModel):
    id: int
    playlist_id: int
    media_id: int
    position: int
    duration_seconds: int
    media: Optional[MediaOut] = None

    class Config:
        from_attributes = True

class PlaylistBase(BaseModel):
    name: str
    is_active: Optional[bool] = True

class PlaylistCreate(PlaylistBase):
    pass

class PlaylistOut(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime
    user_id: int
    items: List[PlaylistItemOut] = []

    class Config:
        from_attributes = True

class PlaylistUpdateItems(BaseModel):
    items: List[PlaylistItemCreate]

class PlaylistDeleteResponse(BaseModel):
    success: bool
    message: str
