SSID = "WireShapes"
PASSWORD = "WireSh@pes_2025#?"

API_BASE_URL = "http://api.admesh.com/api/v1"
DEVICE_SERIAL = "ESP32_Mesh_01"

# Pines Modbus RTU – RS485 en ESP32 de 30 pines
# UART2 usa GPIO16 (RX2) y GPIO17 (TX2) por defecto en el ESP32.
# El módulo RS485-TTL es AUTOMÁTICO (sin pin RE/DE externo).
UART_ID  = 2
TX_PIN   = 17
RX_PIN   = 16

# Configuración Modbus RTU
SLAVE_ID          = 1
DEFAULT_BAUD_RATE = 9600
TIMEOUT_MS        = 200   # ms de espera máxima para respuesta (igual que el firmware que funciona)
FUNCTION_CODE     = 4     # 4 = Input Registers (ADAM-4018+) | 3 = Holding Registers
EU_FACTOR         = 100.0 # raw 4202 → 42.02 °C

# Botón de reseteo de credenciales WiFi (GPIO0 = botón BOOT del ESP32)
BUTTON_PIN  = 0
AP_SSID     = "AD-Mesh_config"
CONFIG_FILE = "wifi_config.json"
