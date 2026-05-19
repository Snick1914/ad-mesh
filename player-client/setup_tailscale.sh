#!/bin/bash
set -e

PI_IP="10.167.36.79"
PI_USER="pico"
LOCAL_DIR="/home/Sistemas/Proyectos/Clientes/Roberto Olmos/ad-mesh/player-client"

echo "📂 Cambiando al directorio local..."
cd "$LOCAL_DIR"

echo "🔐 Creando script de autenticación temporal..."
cat << 'EOF' > askpass.sh
#!/bin/sh
echo "190700Edgar"
EOF
chmod +x askpass.sh

# Configurar variables para que SSH use el script de password
export SSH_ASKPASS="$LOCAL_DIR/askpass.sh"
export SSH_ASKPASS_REQUIRE=force

echo "🚀 Iniciando instalación de Tailscale en la Raspberry Pi de forma remota..."
# Ejecutar comandos directamente en la Pi para instalar y levantar Tailscale
setsid ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" << 'EOF'
echo "[PI] 📥 Descargando e instalando Tailscale de forma oficial..."
echo "190700Edgar" | sudo -S sh -c "curl -fsSL https://tailscale.com/install.sh | sh"

echo "[PI] ✓ Tailscale instalado correctamente. Generando link de emparejamiento..."
# Iniciar Tailscale pidiendo la URL de autenticación
# Se le añade --accept-dns=false para que no sobreescriba los DNS locales de tu red local
echo "190700Edgar" | sudo -S tailscale up --accept-dns=false
EOF

echo "🧹 Limpiando archivos temporales locales..."
rm -f askpass.sh

echo "🎉 Proceso de instalación finalizado en la Pi."
