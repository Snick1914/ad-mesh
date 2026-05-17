from fastapi import APIRouter
from app.api.v1.endpoints import telemetry, login, admin
from app.modules.devices.endpoints.device_endpoints import router as devices_router
from app.modules.media.endpoints.media_endpoints import router as media_router
from app.modules.playlists.endpoints.playlist_endpoints import router as playlists_router

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(devices_router, prefix="/devices", tags=["devices"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["telemetry"])
api_router.include_router(media_router, prefix="/media", tags=["media"])
api_router.include_router(playlists_router, prefix="/playlists", tags=["playlists"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
