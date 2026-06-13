"""add_checksum_md5_to_media

Revision ID: b1c2d3e4f5a6
Revises: 9f8e7d6c5b4a
Create Date: 2026-06-13 18:31:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
import hashlib
import os


# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5a6'
down_revision = '9f8e7d6c5b4a'
branch_labels = None
depends_on = None


def _compute_md5(file_path: str) -> str | None:
    """Calcula el MD5 de un archivo dado su ruta relativa desde /app."""
    # El servidor FastAPI corre con /app como directorio de trabajo
    full_path = os.path.join('/app', file_path)
    if not os.path.exists(full_path):
        print(f"[checksum migration] Archivo no encontrado: {full_path}, omitiendo.")
        return None
    md5 = hashlib.md5()
    try:
        with open(full_path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                md5.update(chunk)
        return md5.hexdigest()
    except Exception as e:
        print(f"[checksum migration] Error leyendo {full_path}: {e}")
        return None


def upgrade() -> None:
    # 1. Agregar la columna checksum_md5 (nullable por ahora)
    op.add_column('media', sa.Column('checksum_md5', sa.String(length=32), nullable=True))

    # 2. Calcular MD5 para todos los archivos existentes
    bind = op.get_bind()
    media_table = table(
        'media',
        column('id', sa.Integer),
        column('file_path', sa.String),
        column('is_deleted', sa.Boolean),
        column('checksum_md5', sa.String),
    )

    rows = bind.execute(sa.select(media_table.c.id, media_table.c.file_path).where(
        media_table.c.is_deleted == False
    )).fetchall()

    updated = 0
    skipped = 0
    for row in rows:
        checksum = _compute_md5(row.file_path)
        if checksum:
            bind.execute(
                media_table.update()
                .where(media_table.c.id == row.id)
                .values(checksum_md5=checksum)
            )
            updated += 1
        else:
            skipped += 1

    print(f"[checksum migration] Completado: {updated} archivos con checksum, {skipped} archivos no encontrados.")


def downgrade() -> None:
    op.drop_column('media', 'checksum_md5')
