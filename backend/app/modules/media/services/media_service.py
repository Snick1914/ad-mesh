import os
import uuid
import shutil
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import UploadFile
from app.modules.media.models import Media
from app.models.user import User

class MediaService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, media_id: int) -> Media:
        return self.db.query(Media).filter(Media.id == media_id).first()

    def get_user_media(self, user_id: int) -> list[Media]:
        try:
            self.purge_expired_deleted_files()
        except Exception as e:
            print(f"Error en purga pasiva de archivos expitados: {e}")
            
        return self.db.query(Media).filter(Media.user_id == user_id, Media.is_deleted == False).order_by(Media.created_at.desc()).all()

    def get_user_storage_used_bytes(self, user_id: int) -> int:
        # Sumar el espacio consumido por todos los medios del usuario en bytes
        result = self.db.query(func.sum(Media.file_size_bytes)).filter(Media.user_id == user_id).scalar()
        return result or 0

    def save_media_file(self, user: User, file: UploadFile) -> tuple[bool, str, Media]:
        # 1. Validación de Límites de Almacenamiento (SaaS Quota Check)
        limit_bytes = user.max_storage_gb * 1024 * 1024 * 1024
        
        # Calcular el tamaño del archivo subido
        file.file.seek(0, os.SEEK_END)
        file_size_bytes = file.file.tell()
        file.file.seek(0) # Restablecer el puntero
        
        current_used_bytes = self.get_user_storage_used_bytes(user.id)
        if current_used_bytes + file_size_bytes > limit_bytes:
            used_gb = current_used_bytes / (1024**3)
            return False, f"Límite de almacenamiento SaaS excedido. Has consumido {used_gb:.2f} GB de los {user.max_storage_gb} GB permitidos por tu plan.", None

        # 2. Creación del Directorio Físico Seguro
        base_dir = "static"
        media_subdir = os.path.join("media", str(user.id))
        target_dir = os.path.join(base_dir, media_subdir)
        os.makedirs(target_dir, exist_ok=True)

        # 3. Nombre de Archivo Seguro y Único
        file_extension = os.path.splitext(file.filename or "")[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        physical_path = os.path.join(target_dir, unique_filename)
        relative_web_path = f"static/media/{user.id}/{unique_filename}"

        # 4. Guardar archivo en disco
        try:
            with open(physical_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            return False, f"Error de escritura en el servidor: {str(e)}", None

        # 5. Registro en Base de Datos
        media_item = Media(
            name=file.filename or "archivo_sin_nombre",
            file_path=relative_web_path,
            file_type=file.content_type or "application/octet-stream",
            file_size_bytes=file_size_bytes,
            user_id=user.id
        )
        self.db.add(media_item)
        self.db.commit()
        self.db.refresh(media_item)

        return True, "Archivo subido con éxito a tu biblioteca.", media_item

    def delete_media_file(self, user_id: int, media_id: int) -> tuple[bool, str]:
        media_item = self.db.query(Media).filter(
            Media.id == media_id, 
            Media.user_id == user_id,
            Media.is_deleted == False
        ).first()
        if not media_item:
            return False, "El recurso multimedia no existe o no pertenece a tu cuenta."

        # Borrado lógico: marcar como borrado
        media_item.is_deleted = True
        media_item.deleted_at = datetime.datetime.utcnow()
        self.db.commit()
        return True, "El recurso ha sido enviado a la papelera. Se eliminará permanentemente en 7 días."

    def purge_expired_deleted_files(self) -> int:
        threshold = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        expired_files = self.db.query(Media).filter(
            Media.is_deleted == True, 
            Media.deleted_at < threshold
        ).all()
        
        count = 0
        for media_item in expired_files:
            system_path = media_item.file_path
            try:
                if os.path.exists(system_path):
                    os.remove(system_path)
            except Exception as e:
                print(f"Error borrando archivo físico {system_path}: {e}")
            
            self.db.delete(media_item)
            count += 1
            
        if count > 0:
            self.db.commit()
        return count
