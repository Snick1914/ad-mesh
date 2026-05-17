from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.models.user import User
from app.modules.playlists.schemas import PlaylistOut, PlaylistCreate, PlaylistUpdateItems, PlaylistDeleteResponse
from app.modules.playlists.services.playlist_service import PlaylistService

router = APIRouter()

@router.get("/", response_model=List[PlaylistOut])
def list_playlists(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Obtener todas las listas de reproducción (playlists) del cliente actual logueado.
    """
    service = PlaylistService(db)
    return service.get_user_playlists(current_user.id)

@router.post("/", response_model=PlaylistOut)
def create_playlist(
    payload: PlaylistCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Crear una nueva lista de reproducción vacía.
    """
    service = PlaylistService(db)
    return service.create_playlist(
        user_id=current_user.id,
        name=payload.name,
        is_active=payload.is_active
    )

@router.put("/{playlist_id}/items", response_model=PlaylistOut)
def update_playlist_items(
    playlist_id: int,
    payload: PlaylistUpdateItems,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Asignar, reordenar y definir la duración de la secuencia de medios de una playlist.
    """
    service = PlaylistService(db)
    success, message, playlist = service.update_playlist_items(
        user_id=current_user.id,
        playlist_id=playlist_id,
        items_in=payload.items
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    return playlist

@router.delete("/{playlist_id}", response_model=PlaylistDeleteResponse)
def delete_playlist(
    playlist_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Eliminar una lista de reproducción y desvincular su secuencia de medios.
    """
    service = PlaylistService(db)
    success, message = service.delete_playlist(current_user.id, playlist_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    return {
        "success": True,
        "message": message
    }
