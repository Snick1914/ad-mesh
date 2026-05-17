from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.models.user import User
from app.modules.media.schemas import MediaOut, MediaUploadResponse, MediaDeleteResponse
from app.modules.media.services.media_service import MediaService

router = APIRouter()

@router.get("/", response_model=List[MediaOut])
def list_media(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Obtener el listado completo de archivos multimedia del cliente logueado.
    """
    service = MediaService(db)
    return service.get_user_media(current_user.id)

@router.post("/upload", response_model=MediaUploadResponse)
def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Subir una imagen o video a la biblioteca validando límites de espacio en tiempo real.
    """
    service = MediaService(db)
    success, message, media = service.save_media_file(current_user, file)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    return {
        "success": True,
        "message": message,
        "media": media
    }

@router.delete("/{media_id}", response_model=MediaDeleteResponse)
def delete_file(
    media_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Eliminar un archivo multimedia de la biblioteca y liberar cuota de espacio en la nube.
    """
    service = MediaService(db)
    success, message = service.delete_media_file(current_user.id, media_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    return {
        "success": True,
        "message": message
    }
