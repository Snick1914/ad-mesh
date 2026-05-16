from app.api.v1.endpoints import devices, telemetry, media, login

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(devices.router, prefix="/devices", tags=["devices"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["telemetry"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
