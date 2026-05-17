from fastapi import APIRouter
from app.api.v1.endpoints import telemetry, media, login, admin
from app.modules.devices.endpoints.device_endpoints import router as devices_router

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(devices_router, prefix="/devices", tags=["devices"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["telemetry"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
