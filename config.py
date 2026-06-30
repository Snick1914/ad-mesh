# ============================================================================
# CONFIGURACIÓN GENERAL Y CREDENCIALES (ESP32 / MicroPython)
# ============================================================================

# Configuración de Wi-Fi
WIFI_SSID = "DYA-Manufacturas"
WIFI_PASS = "DYA_Manu$25"
WIFI_TIMEOUT_SEGUNDOS = 20

# Configuración de Red/NTP (Sincronización horaria)
NTP_SERVER = "pool.ntp.org"
NTP_TZ_OFFSET = -6 * 3600  # Offset de zona horaria en segundos (ej. -6 horas para MX/Central)

# Configuración de Broker MQTT
MQTT_BROKER = "mqtt.ad-mesh.com" 
MQTT_PORT = 443
MQTT_USER = ""       # Dejar vacío si el broker no requiere autenticación
MQTT_PASS = ""       # Dejar vacío si el broker no requiere autenticación
MQTT_KEEPALIVE = 60
MQTT_USE_WS = True   # Conectarse usando MQTT sobre WebSockets
MQTT_WS_PATH = "/mqtt" # Ruta del proxy websocket en Nginx Proxy Manager

CLIENT_ID = "ESP32_MEDIDOR_001"
TOPIC_TELEMETRIA = b"telemetria/cliente_01/medidor_001"

# Configuración de RS485 / Modbus RTU
UART_PORT = 2
BAUDRATE = 9600
TX_PIN = 16
RX_PIN = 17
SLAVE_ID = 0x01
TIMEOUT_MS = 200

# Registros Modbus Input del medidor Eastron SMART X96-5 (Formato float32, 2 registros por lectura)
EASTRON_REGISTERS = {
    "voltaje_l1": 0x0000,
    "voltaje_l2": 0x0002,
    "voltaje_l3": 0x0004,
    "corriente_l1": 0x0006,
    "corriente_l2": 0x0008,
    "corriente_l3": 0x000A,
    "potencia_total": 0x0034,
    "frecuencia": 0x0046,
    "energia_total": 0x015A
}

# Configuración de Intervalos y Watchdog (en milisegundos)
LOOP_INTERVAL_MS = 5000
WDT_TIMEOUT_MS = 30000  # Reiniciar dispositivo si se cuelga por más de 30 segundos
MAX_MODBUS_ERRORS = 5    # Si hay N errores modbus consecutivos, forzar reinicio/reconexión de UART
