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

# Código de vinculación de la cuenta (Ajustes > "Vinc: XXXX" en el dashboard).
# Al mandarlo en el ingest, el sensor se auto-registra y queda ligado a esa cuenta.
LINKING_CODE = "USR-9MOOSBPC"

# Módulo IoT (Sensores + Alertas) — métricas que se reportan al dashboard
SENSOR_CODE = CLIENT_ID
SENSOR_NAME = "Medidor Eastron SMART X96-5"
SENSOR_LOCATION = "Tablero General de Fuerza"
SENSOR_TYPE = "electrical"
IOT_METRICS_MAP = {
    "voltaje_promedio":  ("Voltaje Promedio", "V"),
    "corriente_total":   ("Corriente Total", "A"),
    "potencia_total":    ("Potencia Total", "kW"),
    "factor_potencia_total": ("Factor de Potencia", "FP"),
    "frecuencia":        ("Frecuencia", "Hz"),
}

# Configuración de RS485 / Modbus RTU
# El módulo RS485-TTL requiere control manual del pin RE/DE (no es automático).
UART_PORT = 2
BAUDRATE = 9600
TX_PIN = 17
RX_PIN = 16
RE_DE_PIN = 4
SLAVE_ID = 0x01
TIMEOUT_MS = 800

# Registros Modbus Input del medidor Eastron SMART X96-5 (Formato float32, 2 registros por lectura)
EASTRON_REGISTERS = {
    "voltaje_l1": 0x0000,
    "voltaje_l2": 0x0002,
    "voltaje_l3": 0x0004,
    "corriente_l1": 0x0006,
    "corriente_l2": 0x0008,
    "corriente_l3": 0x000A,
    "potencia_l1": 0x000C,
    "potencia_l2": 0x000E,
    "potencia_l3": 0x0010,
    "potencia_aparente_l1": 0x0012,
    "potencia_aparente_l2": 0x0014,
    "potencia_aparente_l3": 0x0016,
    "potencia_reactiva_l1": 0x0018,
    "potencia_reactiva_l2": 0x001A,
    "potencia_reactiva_l3": 0x001C,
    "factor_potencia_l1": 0x001E,
    "factor_potencia_l2": 0x0020,
    "factor_potencia_l3": 0x0022,
    "voltaje_promedio": 0x002A,
    "corriente_promedio": 0x002C,
    "corriente_total": 0x002E,
    "potencia_total": 0x0034,
    "potencia_aparente_total": 0x003C,
    "potencia_reactiva_total": 0x003E,
    "factor_potencia_total": 0x0042,
    "frecuencia": 0x0046,
    "energia_activa_importada": 0x0048,
    "energia_activa_exportada": 0x004A,
    "energia_reactiva_importada": 0x004C,
    "energia_reactiva_exportada": 0x004E,
    "energia_total": 0x015A
}

# Configuración de Intervalos y Watchdog (en milisegundos)
LOOP_INTERVAL_MS = 5000
WDT_TIMEOUT_MS = 30000  # Reiniciar dispositivo si se cuelga por más de 30 segundos
MAX_MODBUS_ERRORS = 5    # Si hay N errores modbus consecutivos, forzar reinicio/reconexión de UART
