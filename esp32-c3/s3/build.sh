#!/bin/bash
# Script de compilación de firmware a MicroPython bytecode (.mpy)

# Directorios
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SRC_DIR/dist"

# Buscar mpy-cross en el sistema o rutas por defecto
if [ -f "$SRC_DIR/.venv-build/bin/mpy-cross" ]; then
    MPY_CROSS="$SRC_DIR/.venv-build/bin/mpy-cross"
elif command -v mpy-cross &> /dev/null; then
    MPY_CROSS="mpy-cross"
elif [ -f "$HOME/.local/bin/mpy-cross" ]; then
    MPY_CROSS="$HOME/.local/bin/mpy-cross"
else
    MPY_CROSS="/home/sistemas/.local/bin/mpy-cross"
fi

echo "=== Iniciando compilación de firmware ==="

# Crear directorio de distribución limpio
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copiar archivos que deben ser de texto plano
cp "$SRC_DIR/boot.py" "$DIST_DIR/boot.py"
cp "$SRC_DIR/main.py" "$DIST_DIR/main.py"

# Compilar archivos a bytecode .mpy
FILES_TO_COMPILE=("config" "led" "button_handler" "captive_dns" "wifi_manager" "modbus_client" "api_client" "portal" "main_app")

for file in "${FILES_TO_COMPILE[@]}"; do
    echo "Compilando: $file.py -> $file.mpy"
    "$MPY_CROSS" "$SRC_DIR/$file.py" -o "$DIST_DIR/$file.mpy"
    if [ $? -ne 0 ]; then
        echo "Error compilando $file.py"
        exit 1
    fi
done

echo ""
echo "=== Compilación completada con éxito! ==="
echo "Los archivos listos para copiar a tu ESP32 se encuentran en:"
echo "$DIST_DIR"
ls -la "$DIST_DIR"
