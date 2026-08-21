#pragma once
#include <Arduino.h>

// Hardware ESP32 (30 pines)
#define LED_PIN                 2
#define BUTTON_PIN              4
#define BUTTON_HOLD_RESET_MS    10000

// Modbus UART2 (MAX485 / Convertidor TTL a RS485)
#define MODBUS_RX_PIN           16      // RO del convertidor
#define MODBUS_TX_PIN           17      // DI del convertidor
#define MODBUS_DEFAULT_BAUD     9600    // Baudrate por defecto Eastron X96-5

// Parámetros Eastron SMART X96-5 Modbus RTU
#define MODBUS_SLAVE_ID         1       // ID de esclavo por defecto
#define MODBUS_FUNCTION_CODE    4       // Read Input Registers (0x04)

// Watchdog
#define WDT_TIMEOUT_S           30

// Temporización OTA
#define OTA_BOOT_WINDOW_MS      30000
#define OTA_TX_WINDOW_MS        15000

// Configuración de red por defecto
#define WIFI_SSID_DEFAULT       "SSID_DEFAULT"
#define WIFI_PASSWORD_DEFAULT   "PASS_DEFAULT"
#define WIFI_CONNECT_TIMEOUT_S  15
#define AP_SSID                 "AD-Mesh-Config"
#define AP_IP_ADDR              "192.168.4.1"

// Almacenamiento
#define CONFIG_FILE_PATH        "/wifi_config.json"

// Backend API
#define FIRMWARE_VERSION        "1.0.3"
#define API_BASE_URL            "https://api.ad-mesh.com/api/v1"
#define HTTP_TIMEOUT_MS         10000