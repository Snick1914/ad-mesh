from fastapi import APIRouter
from typing import List

router = APIRouter()

@router.get("/")
async def read_telemetry():
    return {"message": "Telemetry data list"}
