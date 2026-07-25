SSID = "WireShapes"
PASSWORD = "WireSh@pes_2025#?"

API_BASE_URL = "http://api.admesh.com/api/v1"
DEVICE_SERIAL = "ESP32S3_Mesh_01"

# Pines Modbus (según hardware de referencia)
UART_ID = 1
RX_PIN = 2
TX_PIN = 1
RE_DE_PIN = 4

# Configuración de Modbus RTU
SLAVE_ID = 1
DEFAULT_BAUD_RATE = 9600
FUNCTION_CODE = 4
EU_FACTOR = 100.0

# Configuración del botón de reseteo y Access Point
BUTTON_PIN = 7  # Pin de botón asignado a GPIO7
AP_SSID = "AD-Mesh_config"
CONFIG_FILE = "wifi_config.json"


