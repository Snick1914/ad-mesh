#!/bin/bash
# =============================================================
# deploy-player.sh — Sube el player-daemon actualizado al mini PC
# Uso: ./deploy-player.sh
# =============================================================

REMOTE_HOST="100.71.96.32"
REMOTE_USER="kiosk"
REMOTE_PASS="admin1234"
REMOTE_DIR="/home/kiosk/player-daemon"
LOCAL_DIR="./player-client/player-daemon"

echo "🚀 Iniciando despliegue del player-daemon..."
echo "📡 Destino: $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"

# Verificar que sshpass esté instalado
if ! command -v sshpass &> /dev/null; then
  echo "❌ sshpass no está instalado. Instálalo con: sudo pacman -S sshpass"
  echo ""
  echo "🔧 Alternativa manual — Ejecuta estos comandos en tu sesión SSH:"
  echo ""
  echo "  En el mini PC (kiosk@$REMOTE_HOST):"
  echo "  ---------------------------------------------------"
  echo "  # 1. Ver contenedores activos:"
  echo "  docker ps -a"
  echo ""
  echo "  # 2. Buscar ubicación del player:"
  echo "  find /home/kiosk -name 'server.js' 2>/dev/null"
  echo ""
  echo "  # 3. Una vez que sepas la ruta, actualiza con git pull:"
  echo "  cd ~/ad-mesh && git pull origin main"
  echo "  cd player-client/player-daemon"
  echo "  docker build -t player-daemon:latest ."
  echo "  docker stop player-daemon && docker rm player-daemon"
  echo "  docker run -d --name player-daemon --restart unless-stopped \\"
  echo "    -p 8080:8080 \\"
  echo "    -e BACKEND_URL=http://tu-backend/api/v1 \\"
  echo "    -v player-daemon-data:/app/data \\"
  echo "    player-daemon:latest"
  exit 1
fi

SSH_CMD="sshpass -p '$REMOTE_PASS' ssh -o StrictHostKeyChecking=no $REMOTE_USER@$REMOTE_HOST"
SCP_CMD="sshpass -p '$REMOTE_PASS' scp -o StrictHostKeyChecking=no"

echo ""
echo "📋 Verificando estado del mini PC..."
eval "$SSH_CMD 'docker ps -a --format \"table {{.Names}}\t{{.Image}}\t{{.Status}}\"'"

echo ""
echo "📁 Creando directorio en mini PC..."
eval "$SSH_CMD 'mkdir -p $REMOTE_DIR/public'"

echo ""
echo "📤 Copiando archivos actualizados..."
eval "$SCP_CMD $LOCAL_DIR/server.js $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
eval "$SCP_CMD $LOCAL_DIR/package.json $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
eval "$SCP_CMD $LOCAL_DIR/Dockerfile $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
eval "$SCP_CMD $LOCAL_DIR/public/index.html $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/public/"
eval "$SCP_CMD $LOCAL_DIR/public/style.css $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/public/"
eval "$SCP_CMD $LOCAL_DIR/public/logo.svg $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/public/"

echo ""
echo "🔨 Reconstruyendo imagen Docker en el mini PC..."
eval "$SSH_CMD 'cd $REMOTE_DIR && docker build -t player-daemon:latest . 2>&1'"

echo ""
echo "🔄 Reiniciando contenedor..."
eval "$SSH_CMD '
  docker stop player-daemon 2>/dev/null || true
  docker rm player-daemon 2>/dev/null || true
  docker run -d \
    --name player-daemon \
    --restart unless-stopped \
    -p 8080:8080 \
    -e BACKEND_URL=\${BACKEND_URL:-http://localhost:8000/api/v1} \
    -v player-daemon-data:/app/data \
    player-daemon:latest
'"

echo ""
echo "✅ Verificando que el contenedor esté corriendo..."
eval "$SSH_CMD 'docker ps | grep player-daemon && echo \"🎉 player-daemon actualizado y corriendo!\"'"

echo ""
echo "📜 Últimos logs del contenedor:"
eval "$SSH_CMD 'docker logs player-daemon --tail 20'"
