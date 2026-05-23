#!/bin/bash
set -e

PI_IP="172.21.58.79"
PI_USER="pico"
PI_PASS="190700Edgar"
LOCAL_DIR="/home/Sistemas/Proyectos/Clientes/Roberto Olmos/ad-mesh/player-client"

cd "$LOCAL_DIR"

echo "🔐 Creando script de autenticación temporal..."
cat << 'EOF' > askpass.sh
#!/bin/sh
echo "190700Edgar"
EOF
chmod +x askpass.sh
export SSH_ASKPASS="$LOCAL_DIR/askpass.sh"
export SSH_ASKPASS_REQUIRE=force

echo "🔥 Paso 1/4: Eliminando wifi-connect (portal antiguo)..."
setsid ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" "echo '$PI_PASS' | sudo -S systemctl stop wifi-portal.service 2>/dev/null; echo '$PI_PASS' | sudo -S systemctl disable wifi-portal.service 2>/dev/null; echo '$PI_PASS' | sudo -S rm -f /usr/local/bin/wifi-connect /usr/local/bin/wifi-autostart.sh /etc/systemd/system/wifi-portal.service; echo '$PI_PASS' | sudo -S systemctl daemon-reload; echo 'Limpieza completada'"

echo "📦 Paso 2/4: Instalando dependencias del nuevo portal..."
setsid ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" "echo '$PI_PASS' | sudo -S apt-get install -y python3 dnsmasq 2>&1 | tail -5; echo 'Dependencias listas'"

echo "📝 Paso 3/4: Creando nuevo script de portal cautivo nativo..."
setsid ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" "echo '$PI_PASS' | sudo -S tee /usr/local/bin/admesh-hotspot.sh > /dev/null << 'SCRIPTEOF'
#!/bin/bash
SSID=\"ad-mesh-Setup\"
HOTSPOT_IP=\"192.168.42.1\"

log() { echo \"[ad-mesh WiFi] \$1\"; logger -t admesh-hotspot \"\$1\"; }

stop_portal() {
    if [ -f /tmp/admesh_portal.pid ]; then
        kill \$(cat /tmp/admesh_portal.pid) 2>/dev/null || true
        rm -f /tmp/admesh_portal.pid
    fi
}

start_portal() {
    log \"Iniciando servidor web del portal...\"
    python3 /usr/local/bin/admesh-portal.py &
    echo \$! > /tmp/admesh_portal.pid
}

check_internet() {
    ping -c 1 -W 5 1.1.1.1 > /dev/null 2>&1
}

while true; do
    if check_internet; then
        log \"Internet activo. Modo reproductor.\"
        stop_portal
        nmcli con delete \"admesh-hotspot\" 2>/dev/null || true
        sleep 30
    else
        log \"Sin internet. Activando Hotspot y Portal Cautivo...\"
        stop_portal
        nmcli con delete \"admesh-hotspot\" 2>/dev/null || true
        sleep 2
        nmcli dev wifi hotspot ifname wlan0 ssid \"\$SSID\" password \"admesh123\" 2>/dev/null || true
        sleep 5
        start_portal
        for i in \$(seq 1 60); do
            sleep 5
            if check_internet; then
                log \"Conectado a internet. Reiniciando modo reproductor...\"
                stop_portal
                nmcli con delete \"admesh-hotspot\" 2>/dev/null || true
                sleep 3
                break
            fi
        done
    fi
done
SCRIPTEOF
echo 'Script de hotspot creado'"

setsid ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" "echo '$PI_PASS' | sudo -S tee /usr/local/bin/admesh-portal.py > /dev/null << 'PYEOF'
import http.server, urllib.parse, subprocess, sys

HTML = \"\"\"<!DOCTYPE html>
<html lang=es><head><meta charset=UTF-8>
<meta name=viewport content=\"width=device-width,initial-scale=1\">
<title>ad-mesh Setup</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060913;font-family:sans-serif;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh}
.card{background:rgba(15,22,42,.9);border:1px solid rgba(0,240,255,.2);border-radius:20px;padding:36px;width:90%;max-width:400px;text-align:center}
.logo{font-size:1.8rem;font-weight:800;background:linear-gradient(135deg,#00F0FF,#7928CA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
p{color:#64748B;margin-bottom:24px;font-size:.9rem}
select,input{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(0,240,255,.3);background:#0a1628;color:#fff;font-size:1rem;margin-bottom:12px;outline:none}
button{width:100%;padding:14px;border-radius:10px;border:none;background:linear-gradient(135deg,#00F0FF,#7928CA);color:#fff;font-size:1rem;font-weight:700;cursor:pointer}
.msg{color:#00F0FF;margin-top:16px;font-size:.85rem}
</style></head>
<body><div class=card>
<div class=logo>ad-mesh</div>
<p>Selecciona tu red Wi-Fi para conectar esta pantalla a internet</p>
<form method=POST action=/connect>
<select name=ssid>{options}</select>
<input type=password name=password placeholder=\"Contraseña Wi-Fi\" autocomplete=off>
<button type=submit>Conectar pantalla ✓</button>
</form>
<p class=msg>{msg}</p>
</div></body></html>\"\"\"

def get_networks():
    try:
        out = subprocess.check_output(['nmcli','-t','-f','SSID','dev','wifi','list'],text=True,timeout=5)
        return list(dict.fromkeys([l.strip() for l in out.splitlines() if l.strip() and l.strip()!='--']))
    except: return ['(Sin redes detectadas)']

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, f, *a): pass
    def portal_page(self, msg=''):
        nets = get_networks()
        opts = ''.join(f\"<option value='{n}'>{n}</option>\" for n in nets)
        body = HTML.format(options=opts, msg=msg).encode()
        self.send_response(200)
        self.send_header('Content-Type','text/html;charset=utf-8')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_GET(self):
        captive = ['generate_204','hotspot-detect','ncsi.txt','connecttest','success.txt']
        if any(c in self.path for c in captive):
            self.send_response(302)
            self.send_header('Location','http://192.168.42.1/')
            self.end_headers()
            return
        self.portal_page()
    def do_POST(self):
        n = int(self.headers.get('Content-Length',0))
        d = urllib.parse.parse_qs(self.rfile.read(n).decode())
        ssid = d.get('ssid',[''])[0]
        pwd  = d.get('password',[''])[0]
        if ssid and ssid != '(Sin redes detectadas)':
            subprocess.Popen(['nmcli','dev','wifi','connect',ssid,'password',pwd])
        self.portal_page(msg=f'Conectando a {ssid}... La pantalla se reiniciará en unos segundos.')

http.server.HTTPServer(('0.0.0.0',80), Handler).serve_forever()
PYEOF
echo 'Servidor portal creado'"

setsid ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" "echo '$PI_PASS' | sudo -S chmod +x /usr/local/bin/admesh-hotspot.sh /usr/local/bin/admesh-portal.py

echo '$PI_PASS' | sudo -S tee /etc/systemd/system/admesh-wifi.service > /dev/null << 'SVCEOF'
[Unit]
Description=ad-mesh Portal Cautivo Wi-Fi
After=NetworkManager.service
Wants=NetworkManager.service

[Service]
Type=simple
ExecStart=/usr/local/bin/admesh-hotspot.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SVCEOF

echo '$PI_PASS' | sudo -S systemctl daemon-reload
echo '$PI_PASS' | sudo -S systemctl enable admesh-wifi.service
echo '$PI_PASS' | sudo -S systemctl start admesh-wifi.service
echo 'Servicio activado'"

echo ""
echo "✅ Paso 4/4: Verificando estado del servicio..."
setsid ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_IP" "sleep 3 && echo '$PI_PASS' | sudo -S systemctl status admesh-wifi.service --no-pager -l"

echo ""
echo "🧹 Limpiando archivos temporales locales..."
rm -f askpass.sh

echo ""
echo "🎉 ¡Portal Cautivo nativo instalado con éxito en la Raspberry Pi!"
echo "   Red Wi-Fi: ad-mesh-Setup"
echo "   Al conectar tu celular a esa red, verás el portal de configuración de ad-mesh."
