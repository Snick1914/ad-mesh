#!/bin/bash
# ============================================================
# Script de despliegue: compila a bytecode .mpy y sube al ESP32
# Requisitos: pip install mpy-cross mpremote
# ============================================================

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SRC_DIR/dist"

# ---- Buscar mpy-cross ----
if [ -f "$SRC_DIR/.venv-build/bin/mpy-cross" ]; then
    MPY_CROSS="$SRC_DIR/.venv-build/bin/mpy-cross"
elif command -v mpy-cross &>/dev/null; then
    MPY_CROSS="mpy-cross"
elif [ -f "$HOME/.local/bin/mpy-cross" ]; then
    MPY_CROSS="$HOME/.local/bin/mpy-cross"
else
    echo "ERROR: mpy-cross no encontrado. Instálalo con: pip install mpy-cross"
    exit 1
fi

echo "=== Compilando firmware ESP32 ==="
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Archivos que se copian como texto plano (no se compilan)
cp "$SRC_DIR/boot.py" "$DIST_DIR/boot.py"
cp "$SRC_DIR/main.py" "$DIST_DIR/main.py"

# Archivos a compilar a bytecode .mpy
FILES_TO_COMPILE=(
    "config"
    "button_handler"
    "wifi_manager"
    "modbus_client"
    "api_client"
    "portal"
    "main_app"
)

for file in "${FILES_TO_COMPILE[@]}"; do
    echo "  Compilando $file.py → $file.mpy"
    "$MPY_CROSS" "$SRC_DIR/$file.py" -o "$DIST_DIR/$file.mpy"
    if [ $? -ne 0 ]; then
        echo "ERROR compilando $file.py"
        exit 1
    fi
done

echo ""
echo "=== Compilación OK ==="
ls -lh "$DIST_DIR"

# ---- Subir al ESP32 por mpremote (opcional, descomenta si lo usas) ----
# PORT="/dev/ttyUSB0"   # Cambia al puerto real de tu ESP32
# echo ""
# echo "=== Subiendo archivos al ESP32 en $PORT ==="
# for f in "$DIST_DIR"/*; do
#     echo "  Subiendo $(basename $f)..."
#     mpremote connect "$PORT" cp "$f" ":$(basename $f)"
# done
# echo "=== ¡Listo! ==="
