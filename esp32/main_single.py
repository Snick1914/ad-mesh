"""
AD-Mesh Telemetría – ESP32 30 pines  (archivo único)
Copia este archivo al ESP32 como main.py y borra los demás.
También necesitas solo boot.py con: import micropython; micropython.kbd_intr(-1)
"""
import gc
import os
import sys
import time
import ujson
import network
import socket
import struct
import urequests
from machine import UART, Pin, WDT, reset


# ============================================================================
# CONFIGURACIÓN  – edita aquí todo lo que necesitas cambiar
# ============================================================================
# Wi-Fi por defecto (se sobrescribe con el portal si guardas credenciales)
DEFAULT_SSID     = "WireShapes"
DEFAULT_PASSWORD = "WireSh@pes_2025#?"

# Backend AD-Mesh
API_BASE_URL  = "http://api.admesh.com/api/v1"
DEVICE_SERIAL = "ESP32_Mesh_01"   # ← cambia al serial de tu dispositivo

# UART RS485 — UART2 del ESP32 (TX=GPIO17, RX=GPIO16)
UART_ID   = 2
TX_PIN    = 17
RX_PIN    = 16

# Modbus RTU
SLAVE_ID          = 1
DEFAULT_BAUD_RATE = 9600
TIMEOUT_MS        = 200   # ms esperando respuesta del sensor
FUNCTION_CODE     = 4     # 4=Input Registers (ADAM-4018+) | 3=Holding Registers
EU_FACTOR         = 100.0 # raw 4202 → 42.02 °C

# Botón de reseteo de WiFi (GPIO0 = botón BOOT del ESP32)
BUTTON_PIN  = 0
AP_SSID     = "AD-Mesh_config"
CONFIG_FILE = "wifi_config.json"

# Watchdog
WDT_TIMEOUT_MS = 30000   # 30 s


# ============================================================================
# PORTAL CAPTIVO – HTML de configuración WiFi
# ============================================================================
HTML_PORTAL = """\
<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AD-Mesh Configuración</title>
<style>
body{background:#0b0f19;color:#f3f4f6;font-family:sans-serif;
     display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
   border-radius:16px;padding:2rem;width:100%;max-width:380px}
h2{text-align:center;background:linear-gradient(45deg,#3b82f6,#8b5cf6);
   -webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-top:0}
p{text-align:center;color:#9ca3af;font-size:.9rem}
.g{margin-bottom:1.2rem}
label{display:block;margin-bottom:.4rem;font-size:.85rem;color:#9ca3af}
input{width:100%;padding:.7rem 1rem;background:rgba(0,0,0,.3);
      border:1px solid rgba(255,255,255,.1);border-radius:8px;
      color:#fff;box-sizing:border-box}
button{width:100%;padding:.75rem;background:#3b82f6;border:none;
       border-radius:8px;color:#fff;font-weight:600;cursor:pointer}
</style></head><body><div class="c">
<h2>AD-Mesh</h2><p>Configuración de Red WiFi</p>
<form method="POST" action="/save">
<div class="g"><label>SSID</label><input type="text" name="ssid" required></div>
<div class="g"><label>Contraseña</label><input type="password" name="password"></div>
<div class="g"><label>Código de vinculación</label><input type="text" name="linking_code" placeholder="USR-ABC12345" required></div>
<button type="submit">Guardar y Conectar</button>
</form><p style="margin-top:1.5rem;font-size:.75rem;color:#4b5563">ESP32 Telemetry Node</p>
</div></body></html>"""

HTML_OK = """\
<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Guardado</title>
<style>body{background:#0b0f19;color:#f3f4f6;font-family:sans-serif;
display:flex;align-items:center;justify-content:center;min-height:100vh}
.c{text-align:center;padding:2rem}h2{color:#10b981}</style></head>
<body><div class="c"><h2>¡Configuración guardada!</h2>
<p>El dispositivo se está reiniciando.</p></div></body></html>"""


# ============================================================================
# UTILIDADES
# ============================================================================
def url_decode(s):
    res, i = "", 0
    while i < len(s):
        if s[i] == '%':
            try: res += chr(int(s[i+1:i+3], 16)); i += 3
            except: res += s[i]; i += 1
        elif s[i] == '+': res += ' '; i += 1
        else: res += s[i]; i += 1
    return res

def parse_post(req):
    try:
        body = req.split("\r\n\r\n", 1)[1]
        return {k: url_decode(v) for k, v in (p.split("=", 1) for p in body.split("&") if "=" in p)}
    except: return {}


# ============================================================================
# CREDENCIALES WIFI
# ============================================================================
def wifi_load():
    try:
        with open(CONFIG_FILE) as f:
            d = ujson.load(f)
            return d.get("SSID") or DEFAULT_SSID, d.get("PASSWORD", DEFAULT_PASSWORD), d.get("LINKING_CODE")
    except:
        return DEFAULT_SSID, DEFAULT_PASSWORD, None

def wifi_save(ssid, password, linking_code):
    with open(CONFIG_FILE, "w") as f:
        ujson.dump({"SSID": ssid, "PASSWORD": password, "LINKING_CODE": linking_code}, f)


# ============================================================================
# PORTAL CAPTIVO AP
# ============================================================================
def iniciar_portal(wdt=None):
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    ap.config(essid=AP_SSID, authmode=network.AUTH_OPEN)
    time.sleep_ms(500)
    print(f"AP: {AP_SSID}  →  http://192.168.4.1")

    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(socket.getaddrinfo("0.0.0.0", 80)[0][-1])
    s.listen(1)

    guardado = False
    while not guardado:
        if wdt: wdt.feed()
        try:
            s.settimeout(1.0)
            conn, _ = s.accept()
        except OSError: continue

        if wdt: wdt.feed()
        try:
            conn.settimeout(2.0)
            raw = b""
            while b"\r\n\r\n" not in raw:
                chunk = conn.recv(512)
                if not chunk: break
                raw += chunk
            req = raw.decode("utf-8", "ignore")

            if "POST /save" in req:
                p = parse_post(req)
                ssid = p.get("ssid", "")
                if ssid:
                    wifi_save(ssid, p.get("password", ""), p.get("linking_code", ""))
                    guardado = True
                    print(f"Credenciales guardadas: {ssid}")
                conn.send("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n")
                conn.send(HTML_OK)
            else:
                conn.send("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n")
                conn.send(HTML_PORTAL)
        except Exception as e:
            print("Portal error:", e)
        finally:
            try: conn.close()
            except: pass

    s.close()
    print("Reiniciando en 3 s...")
    time.sleep(3)
    reset()


# ============================================================================
# WIFI MANAGER
# ============================================================================
def wifi_conectar(wdt=None):
    ssid, password, _ = wifi_load()
    wlan = network.WLAN(network.STA_IF)
    try: wlan.active(False); time.sleep_ms(200)
    except: pass
    wlan.active(True); time.sleep_ms(200)
    try: wlan.config(pm=0)
    except: pass

    if not ssid:
        print("Sin credenciales → modo AP")
        iniciar_portal(wdt)
        return False

    if not wlan.isconnected():
        print(f"Conectando a {ssid}...")
        try: wlan.disconnect(); time.sleep_ms(200)
        except: pass
        wlan.connect(ssid, password)
        t = 25
        while not wlan.isconnected() and t > 0:
            if wdt: wdt.feed()
            chequear_boton(wdt)
            time.sleep(1); t -= 1
            print(f".({wlan.status()})", end="")

    if wlan.isconnected():
        print(f"\n¡WiFi! IP={wlan.ifconfig()[0]}")
        if wdt: wdt.feed()
        return True
    else:
        print(f"\nError WiFi status={wlan.status()}")
        iniciar_portal(wdt)
        return False

def wifi_conectado():
    return network.WLAN(network.STA_IF).isconnected()


# ============================================================================
# BOTÓN DE RESET WiFi  (GPIO0 = BOOT)
# ============================================================================
_btn = Pin(BUTTON_PIN, Pin.IN, Pin.PULL_UP)

def chequear_boton(wdt=None):
    if _btn.value() == 0:
        print("\n[BOTÓN] Mantén 10 s para borrar WiFi...")
        t0, prev = time.ticks_ms(), -1
        while _btn.value() == 0:
            if wdt: wdt.feed()
            seg = time.ticks_diff(time.ticks_ms(), t0) // 1000
            if seg != prev:
                print(f"  {seg}/10 s"); prev = seg
            if seg >= 10:
                print("Borrando WiFi...")
                try: os.remove(CONFIG_FILE)
                except: pass
                time.sleep(1); reset()
            time.sleep_ms(100)
        print("[BOTÓN] Soltado.")


# ============================================================================
# MODBUS RTU CLIENT
# ============================================================================
def crc16(data):
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 1: crc = (crc >> 1) ^ 0xA001
            else:       crc >>= 1
    return bytes([crc & 0xFF, (crc >> 8) & 0xFF])

def leer_modbus(uart, slave_id, start_reg, count, wdt=None, function_code=4):
    """
    Lee registros Modbus RTU. Usa módulo RS485-TTL automático (sin pin RE/DE).
    Retorna (True, [valores]) o (False, "mensaje de error").
    """
    req = bytearray([slave_id, function_code,
                     (start_reg >> 8) & 0xFF, start_reg & 0xFF,
                     (count >> 8) & 0xFF, count & 0xFF])
    req += crc16(req)

    try:
        # Limpiar buffer residual
        while uart.any(): uart.read(1)

        # Enviar petición
        uart.write(req)

        # Esperar respuesta
        t0 = time.ticks_ms()
        while not uart.any():
            if time.ticks_diff(time.ticks_ms(), t0) > TIMEOUT_MS:
                return False, "Timeout de respuesta UART"
            time.sleep_ms(5)
            if wdt: wdt.feed()

        # Asentamiento para recibir la trama completa
        time.sleep_ms(15)
        resp = uart.read()

        if not resp:                          return False, "Sin datos"
        if len(resp) < 5:                     return False, "Trama incompleta"
        if resp[0] != slave_id:               return False, f"Slave inesperado: {resp[0]}"
        if resp[1] == (function_code | 0x80): return False, f"Modbus Exception {resp[2]}"
        if resp[1] != function_code:          return False, f"FC inesperado: {resp[1]}"

        # Verificar CRC
        if crc16(resp[:-2]) != resp[-2:]:
            print(f"[MODBUS] Error CRC ({len(resp)} bytes): {list(resp)}")
            return False, "Error CRC"

        # Parsear valores con signo
        min_len = 5 + (2 * count)
        if len(resp) < min_len: return False, "Datos incompletos"

        vals, db = [], resp[3:-2]
        for i in range(0, len(db), 2):
            v = (db[i] << 8) | db[i+1]
            if v >= 0x8000: v -= 0x10000
            vals.append(v)
        return True, vals

    except Exception as e:
        return False, str(e)


# ============================================================================
# API CLIENT – AD-Mesh backend
# ============================================================================
def api_fetch_baud(wdt=None):
    try:
        r = urequests.get(f"{API_BASE_URL}/devices/config/{DEVICE_SERIAL}", timeout=10)
        baud = None
        if r.status_code == 200:
            d = r.json()
            if d.get("baud_rate"): baud = int(d["baud_rate"])
        r.close()
        if wdt: wdt.feed()
        return baud
    except Exception as e:
        print("fetch_baud error:", e)
        if wdt: wdt.feed()
        return None

def api_enviar(mediciones, wdt=None):
    try:
        payload = {"device_serial": DEVICE_SERIAL, "mediciones": mediciones}
        r = urequests.post(f"{API_BASE_URL}/telemetry/", json=payload,
                           headers={"Content-Type": "application/json"}, timeout=10)
        r.close()
        if wdt: wdt.feed()
        return True
    except Exception as e:
        print("enviar_telemetria error:", e)
        if wdt: wdt.feed()
        return False

def api_heartbeat(wdt=None):
    try:
        _, _, linking_code = wifi_load()
        wlan = network.WLAN(network.STA_IF)
        payload = {"ip_address": wlan.ifconfig()[0] if wlan.isconnected() else "0.0.0.0",
                   "storage_used_gb": 0.0, "status": "online"}
        if linking_code: payload["linking_code"] = linking_code
        r = urequests.post(f"{API_BASE_URL}/devices/{DEVICE_SERIAL}/heartbeat",
                           json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        r.close()
        if wdt: wdt.feed()
        return True
    except Exception as e:
        print("heartbeat error:", e)
        if wdt: wdt.feed()
        return False


# ============================================================================
# INICIALIZAR UART RS485
# ============================================================================
def inicializar_uart(baud_rate):
    print(f"[UART] Inicializando UART{UART_ID} → TX=GPIO{TX_PIN}, RX=GPIO{RX_PIN}, {baud_rate} bps")
    return UART(UART_ID, baudrate=baud_rate, tx=TX_PIN, rx=RX_PIN, bits=8, parity=None, stop=1)


# ============================================================================
# BUCLE PRINCIPAL
# ============================================================================
def main():
    print("=== AD-Mesh Telemetría – ESP32 30 pines ===")

    wdt = WDT(timeout=WDT_TIMEOUT_MS)
    wdt.feed()

    # Botón al arranque
    chequear_boton(wdt)

    # Conectar WiFi
    wifi_conectar(wdt)

    # Heartbeat inicial
    api_heartbeat(wdt)

    # Obtener baud rate
    baud_rate = DEFAULT_BAUD_RATE
    server_baud = api_fetch_baud(wdt)
    if server_baud:
        baud_rate = server_baud
        print(f"Baud rate del servidor: {baud_rate}")
    else:
        print(f"Baud rate por defecto: {baud_rate}")

    # Inicializar UART
    uart = inicializar_uart(baud_rate)
    errores_consecutivos = 0

    # Bucle de telemetría
    while True:
        wdt.feed()
        chequear_boton(wdt)
        gc.collect()

        # --- Leer Modbus ---
        ok, result = leer_modbus(uart, SLAVE_ID, 0, 2, wdt, function_code=FUNCTION_CODE)
        mediciones = {}
        if ok:
            mediciones["temp1"]            = result[0] / EU_FACTOR
            mediciones["temp2"]            = result[1] / EU_FACTOR
            mediciones["sensor_temperatura"] = result[0] / EU_FACTOR
            mediciones["sensor_humedad"]     = result[1] / EU_FACTOR
            mediciones["modbus_status"]    = "OK"
            errores_consecutivos = 0
            print(f">>> Temp1={mediciones['temp1']:.2f}°C  Temp2={mediciones['temp2']:.2f}°C")
        else:
            mediciones["modbus_status"] = "ERROR"
            mediciones["error_msg"]     = result
            errores_consecutivos += 1
            print(f"[MODBUS ERROR #{errores_consecutivos}] {result}")

            # Si hay 10 errores seguidos, reinicializar UART
            if errores_consecutivos >= 10:
                print("[UART] Reinicializando UART por errores consecutivos...")
                try: uart.deinit()
                except: pass
                time.sleep_ms(200)
                uart = inicializar_uart(baud_rate)
                errores_consecutivos = 0

        # --- Asegurar WiFi ---
        if not wifi_conectado():
            print("WiFi perdido, reconectando...")
            wifi_conectar(wdt)
            api_heartbeat(wdt)

        # --- Enviar telemetría ---
        if wifi_conectado():
            api_enviar(mediciones, wdt)
            api_heartbeat(wdt)
        else:
            print("Sin WiFi – telemetría no enviada.")

        # Pausa de 10 s en fragmentos, alimentando WDT y monitoreando botón
        for _ in range(100):
            chequear_boton(wdt)
            time.sleep_ms(100)
            wdt.feed()


# ============================================================================
# ENTRADA
# ============================================================================
try:
    main()
except Exception as e:
    print("ERROR CRÍTICO:")
    sys.print_exception(e)
    time.sleep(5)
    reset()
