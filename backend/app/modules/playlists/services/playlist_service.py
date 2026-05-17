from sqlalchemy.orm import Session
from app.modules.playlists.models import Playlist, PlaylistItem
from app.modules.playlists.schemas import PlaylistItemCreate
from app.modules.media.models import Media

class PlaylistService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, playlist_id: int) -> Playlist:
        return self.db.query(Playlist).filter(Playlist.id == playlist_id).first()

    def get_user_playlists(self, user_id: int) -> list[Playlist]:
        return self.db.query(Playlist).filter(Playlist.user_id == user_id).order_by(Playlist.created_at.desc()).all()

    def create_playlist(self, user_id: int, name: str, is_active: bool = True) -> Playlist:
        playlist = Playlist(
            name=name,
            is_active=is_active,
            user_id=user_id
        )
        self.db.add(playlist)
        self.db.commit()
        self.db.refresh(playlist)
        return playlist

    def update_playlist_items(self, user_id: int, playlist_id: int, items_in: list[PlaylistItemCreate]) -> tuple[bool, str, Playlist]:
        playlist = self.db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == user_id).first()
        if not playlist:
            return False, "La lista de reproducción no existe o no pertenece a tu cuenta.", None

        # 1. Validación de seguridad: Verificar que todos los media_id existen y pertenecen al usuario
        media_ids = [item.media_id for item in items_in]
        if media_ids:
            owned_media_count = self.db.query(Media).filter(Media.id.in_(media_ids), Media.user_id == user_id).count()
            if owned_media_count != len(set(media_ids)):
                return False, "Uno o más recursos multimedia no pertenecen a tu biblioteca de medios.", None

        # 2. Sincronización limpia: Borrar elementos anteriores e insertar la nueva secuencia ordenada
        self.db.query(PlaylistItem).filter(PlaylistItem.playlist_id == playlist_id).delete()

        # Registrar nueva secuencia
        for item in items_in:
            new_item = PlaylistItem(
                playlist_id=playlist_id,
                media_id=item.media_id,
                position=item.position,
                duration_seconds=item.duration_seconds
            )
            self.db.add(new_item)

        self.db.commit()
        self.db.refresh(playlist)
        return True, "Lista de reproducción guardada y reordenada exitosamente.", playlist

    def delete_playlist(self, user_id: int, playlist_id: int) -> tuple[bool, str]:
        playlist = self.db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == user_id).first()
        if not playlist:
            return False, "La lista de reproducción no existe o no pertenece a tu cuenta."

        self.db.delete(playlist)
        self.db.commit()
        return True, "Lista de reproducción eliminada con éxito."
