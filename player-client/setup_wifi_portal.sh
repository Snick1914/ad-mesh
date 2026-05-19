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

echo "🚀 Transfiriendo script de configuración de Wi-Fi a la Raspberry Pi..."
# Crear el script que se ejecutará DENTRO de la Pi (Se ejecutará COMPLETO como root!)
cat << 'EOF' > remote_wifi_setup.sh
#!/bin/bash
set -e

# Como este script ya corre como ROOT, no necesitamos usar 'sudo' en ninguna línea.

echo "[ROOT] 📥 Descargando la herramienta oficial wifi-connect para ARM64..."
curl -L https://github.com/balena-os/wifi-connect/releases/download/v4.11.84/wifi-connect-aarch64-unknown-linux-gnu.tar.gz | tar -xz
echo "[ROOT] ✓ Binario descargado."

echo "[ROOT] 📥 Descargando la interfaz web del portal cautivo..."
curl -L -o wifi-connect-ui.tar.gz https://github.com/balena-os/wifi-connect/releases/download/v4.11.84/wifi-connect-ui.tar.gz
echo "[ROOT] ✓ Interfaz web descargada."

echo "[ROOT] 🔧 Instalando en el sistema..."
mv wifi-connect /usr/local/bin/

# Instalar los archivos de la interfaz web
mkdir -p /usr/local/share/wifi-connect/ui
tar -xzf wifi-connect-ui.tar.gz -C /usr/local/share/wifi-connect/ui --strip-components=1
rm -f wifi-connect-ui.tar.gz

echo "[ROOT] 📡 Creando el script de control automático del portal..."
cat << 'PORTAL' > /usr/local/bin/wifi-autostart.sh
#!/bin/bash

# Esperar un momento a que las interfaces de red carguen
sleep 5

while true; do
    # Probar si hay conexión real haciendo ping a DNS públicos de Cloudflare
    if ping -c 1 -w 5 1.1.1.1 >/dev/null 2>&1; then
        echo "[WIFI] Conexión a internet activa. Modo reproductor."
        sleep 60
    else
        echo "[WIFI] Sin conexión a internet. Lanzando Portal Cautivo..."
        # Ejecuta wifi-connect. Crea la red abierta 'ad-mesh-Setup'
        /usr/local/bin/wifi-connect -a 192.168.42.1 -s ad-mesh-Setup
        
        # Una vez configurado exitosamente, espera unos segundos y re-evalúa
        sleep 10
    fi
done
PORTAL

chmod +x /usr/local/bin/wifi-autostart.sh

echo "[ROOT] ⚙️ Configurando servicio de sistema (Systemd)..."
cat << 'SYSTEMD' > /etc/systemd/system/wifi-portal.service
[Unit]
Description=Portal Cautivo Wi-Fi ad-mesh
After=NetworkManager.service
Wants=NetworkManager.service

[Service]
Type=simple
ExecStart=/usr/local/bin/wifi-autostart.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSTEMD

echo "[ROOT] 🔄 Activando el servicio..."
systemctl daemon-reload
systemctl enable wifi-portal.service
systemctl start wifi-portal.service

echo "[ROOT] 🎉 ¡Portal Cautivo Wi-Fi configurado con éxito en la Pi!"
EOF

# Subir el script a la Pi
setsid scp -o StrictHostKeyChecking=no remote_wifi_setup.sh "$PI_USER@$PI_IP:/home/$PI_USER/"

# Ejecutar el script remoto pasándole la contraseña a sudo -S
echo "📡 Lanzando instalación remota con privilegios root en la Pi..."
setsid ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" "chmod +x /home/$PI_USER/remote_wifi_setup.sh && echo '190700Edgar' | sudo -S /home/$PI_USER/remote_wifi_setup.sh && rm /home/$PI_USER/remote_wifi_setup.sh"

echo "🧹 Limpiando archivos temporales locales..."
rm -f askpass.sh
rm -f remote_wifi_setup.sh

echo "🎉 ¡Todo listo! El sistema de Portal Cautivo automático está activo en tu Raspberry Pi."
