#!/bin/bash
set -e

PI_IP="100.88.210.34"
PI_USER="kiosk"
LOCAL_DIR="/home/sistemas/Proyectos/Clientes/Roberto Olmos/ad-mesh/player-client"

echo "📂 Cambiando al directorio local..."
cd "$LOCAL_DIR"

echo "🔐 Creando script de autenticación temporal..."
cat << 'EOF' > askpass.sh
#!/bin/sh
echo "admin1234"
EOF
chmod +x askpass.sh

# Configurar variables para que SSH use el script de password
export SSH_ASKPASS="$LOCAL_DIR/askpass.sh"
export SSH_ASKPASS_REQUIRE=force
export DISPLAY=:0

echo "📦 Comprimiendo archivos del reproductor..."
tar -czf player-client.tar.gz docker-compose.yml player-daemon

echo "🚀 Transfiriendo archivo .tar.gz a la Mini PC..."
setsid scp -o StrictHostKeyChecking=no player-client.tar.gz "$PI_USER@$PI_IP:/home/$PI_USER/"

echo "📡 Extrayendo y levantando Docker en la Mini PC..."
setsid ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" << 'SSHEOF'
mkdir -p /home/kiosk/admesh-player
tar -xzf /home/kiosk/player-client.tar.gz -C /home/kiosk/admesh-player --strip-components=0
rm /home/kiosk/player-client.tar.gz
cd /home/kiosk/admesh-player
echo "⏹️  Deteniendo contenedor anterior..."
docker compose down
echo "🔨 Construyendo nueva imagen..."
docker compose up -d --build
echo "⏳ Esperando 5 segundos para que arranque..."
sleep 5
echo "📜 Logs del contenedor:"
docker logs admesh-player-daemon --tail 30
SSHEOF

echo "🧹 Limpiando archivos temporales..."
rm -f player-client.tar.gz
rm -f askpass.sh

echo "🎉 ¡Despliegue completado con éxito! El reproductor está corriendo en tu Mini PC."
