#pragma once

// ===================== Red WiFi por defecto / AP de fábrica =====================
#define WIFI_SSID_DEFAULT   "WireShapes"
#define WIFI_PASSWORD_DEFAULT "WireSh@pes_2025#?"

#define API_BASE_URL   "http://api.admesh.com/api/v1"
#define DEVICE_SERIAL  "ESP32S3_Mesh_01"

// ===================== Pines Modbus / TTL =====================
// UART1 dedicado al sensor TTL full-duplex (Serial0/USB queda libre para logs/depuración).
// Sin pin RE/DE: la línea es TTL directa, no RS485 half-duplex.
#define MODBUS_UART_NUM   1
#define MODBUS_RX_PIN     2
#define MODBUS_TX_PIN     1

// ===================== Configuración Modbus RTU =====================
#define MODBUS_SLAVE_ID       1
#define MODBUS_DEFAULT_BAUD   9600
#define MODBUS_FUNCTION_CODE  4
#define MODBUS_EU_FACTOR      100.0f
#define MODBUS_START_REG      0
#define MODBUS_REG_COUNT      2
#define MODBUS_RESPONSE_TIMEOUT_MS 300

// ===================== Botón físico de reset / modo config =====================
#define BUTTON_PIN            7
#define BUTTON_HOLD_RESET_MS  10000UL

// ===================== Access Point de configuración =====================
#define AP_SSID        "AD-Mesh_config"
#define AP_IP_ADDR     "192.168.4.1"
#define CONFIG_FILE_PATH  "/wifi_config.json"

// ===================== LED RGB de estado (WS2812 integrado) =====================
#define RGB_PIN     21
#define RGB_COUNT   1

// ===================== Watchdog =====================
#define WDT_TIMEOUT_S   30

// ===================== Timings generales =====================
#define WIFI_CONNECT_TIMEOUT_S   25
#define TELEMETRY_LOOP_DELAY_MS  10000UL
#define HTTP_TIMEOUT_MS          10000
