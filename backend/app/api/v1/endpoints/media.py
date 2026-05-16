from fastapi import APIRouter
from typing import List

router = APIRouter()

@router.get("/")
async def read_media():
    return {"message": "Media library list"}
