#!/usr/bin/env bash
# =========================================================================
# 🧼 SCRIPT DE PREPARACIÓN DE IMAGEN DE ORO (RESET Y APAGADO AUTOMÁTICO)
# =========================================================================
# Este script prepara la Mini PC para clonación física (SSD a SSD).
# Borra toda la identidad local para que las máquinas clonadas generen su 
# propio número de serie único y solicita vinculación fresca en su primer inicio.
# Al terminar, apaga el equipo automáticamente.

set -e

# Asegurar que se ejecuta con privilegios de root (sudo)
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Por favor, ejecuta este script usando sudo:"
  echo "sudo $0"
  exit 1
fi

echo "=========================================================="
echo "🧹 Preparando Mini PC para clonación masiva..."
echo "=========================================================="

# 1. Detener servicios y Docker
echo "🛑 Deteniendo el reproductor Docker..."
if [ -d "/home/kiosk/admesh-player" ]; then
  cd /home/kiosk/admesh-player
  docker-compose down || true
fi

# 2. Resetear perfiles de red (limpiar Wi-Fi del taller)
echo "📡 Limpiando configuraciones de red y perfiles de Wi-Fi..."
# Borrar hotspot anterior si existiera
nmcli con delete admesh-hotspot 2>/dev/null || true
# Borrar otras conexiones Wi-Fi cacheadas para que la máquina clonada empiece limpia
for conn in $(nmcli --fields NAME,TYPE connection show | grep wifi | awk '{print $1}'); do
  nmcli con delete "$conn" 2>/dev/null || true
done

# 3. Borrar la identidad y datos del Kiosko (Para generar números de serie únicos al clonar)
echo "🗑️ Borrando base de datos de vinculación local, playlists y videos..."
rm -f /home/kiosk/admesh-player/data/device.json
rm -f /home/kiosk/admesh-player/data/playlist.json
rm -rf /home/kiosk/admesh-player/data/media/*

# 4. Limpiar logs y archivos temporales del sistema
echo "🧹 Limpiando archivos temporales y caché..."
rm -rf /tmp/* 2>/dev/null || true
rm -f /var/log/journal/*/*.journal 2>/dev/null || true

echo "=========================================================="
echo "✅ ¡Mini PC de Referencia lista para clonar!"
echo "🔌 El equipo se apagará en 5 segundos..."
echo "=========================================================="
sleep 5

# Apagar el equipo de forma segura
poweroff
