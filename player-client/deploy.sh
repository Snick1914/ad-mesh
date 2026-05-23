#!/bin/bash
set -e

PI_IP="192.168.1.39"
PI_USER="kiosk"
LOCAL_DIR="/home/Sistemas/Proyectos/Clientes/Roberto Olmos/ad-mesh/player-client"

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
# Desactivar interactividad para evitar colgar la sesión
export Setsid="/usr/bin/setsid"

echo "📦 Comprimiendo archivos del reproductor..."
tar -czf player-client.tar.gz docker-compose.yml player-daemon

echo "🚀 Transfiriendo archivo .tar.gz a la Mini PC..."
setsid scp -o StrictHostKeyChecking=no player-client.tar.gz "$PI_USER@$PI_IP:/home/$PI_USER/"

echo "📡 Extrayendo y levantando Docker en la Mini PC..."
setsid ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" << 'EOF'
mkdir -p /home/kiosk/admesh-player
tar -xzf /home/kiosk/player-client.tar.gz -C /home/kiosk/admesh-player
rm /home/kiosk/player-client.tar.gz
cd /home/kiosk/admesh-player
docker compose up -d --build
EOF

echo "🧹 Limpiando archivos temporales..."
rm -f player-client.tar.gz
rm -f askpass.sh

echo "🎉 ¡Despliegue completado con éxito! El reproductor está corriendo en tu Mini PC."
