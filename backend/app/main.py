from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from fastapi.staticfiles import StaticFiles
import os
from app.db.session import engine
from app.db.base_class import Base
from app.models.user import User # Import models to ensure they are registered with Base
from app.modules.devices.models import Device
from app.modules.media.models import Media
from app.modules.playlists.models import Playlist, PlaylistItem

Base.metadata.create_all(bind=engine)

# Seed default admin user if not exists
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core import security

db_session: Session = SessionLocal()
try:
    admin_user = db_session.query(User).filter(User.email == "admin@ad-mesh.com").first()
    if not admin_user:
        hashed_pw = security.get_password_hash("admin")
        new_admin = User(
            full_name="Roberto Olmos",
            email="admin@ad-mesh.com",
            phone="5512345678",
            company_name="ad-mesh",
            hashed_password=hashed_pw,
            is_active=True,
            is_superuser=True,
            max_devices=20,
            max_storage_gb=100
        )
        db_session.add(new_admin)
        db_session.commit()
        print("DEBUG: Seeded default admin user admin@ad-mesh.com / admin")
except Exception as e:
    print(f"DEBUG: Error seeding database: {e}")
finally:
    db_session.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Mount static folder for media hosting
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set all CORS enabled origins
print(f"DEBUG: Loading CORS Origins: {settings.BACKEND_CORS_ORIGINS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS] or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    import asyncio
    from app.core.mqtt import mqtt_service
    asyncio.create_task(mqtt_service.start())

@app.on_event("shutdown")
async def shutdown_event():
    from app.core.mqtt import mqtt_service
    await mqtt_service.stop()

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API", "status": "online"}
