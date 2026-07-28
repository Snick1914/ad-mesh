#include <Arduino.h>
#include <esp_task_wdt.h>
#include <map>

#include "config.h"
#include "storage.h"
#include "led_status.h"
#include "button_handler.h"
#include "modbus_client.h"
#include "wifi_manager.h"
#include "api_client.h"

static const int MAX_BOOT_ATTEMPTS = 3; // Reinicios consecutivos sin llegar al bucle principal antes de entrar en modo seguro
static bool s_modoSeguro = false;

// Equivalente a boot.py: detecta arranques fallidos en bucle o el botón
// mantenido presionado durante el arranque, y entra en modo seguro (sin
// WiFi/Modbus) para evitar reinicios infinitos y permitir depuración por serie.
static void chequearModoSeguro() {
    ButtonHandler::begin();
    delay(50); // Estabilizar lectura del pin

    if (ButtonHandler::presionado()) {
        Serial.println("\n[BOOT] Boton presionado durante el arranque -> MODO SEGURO");
        s_modoSeguro = true;
        return;
    }

    int intentos = Storage::leerIntentosArranque();
    if (intentos >= MAX_BOOT_ATTEMPTS) {
        Serial.printf("\n[BOOT] %d reinicios consecutivos sin llegar al bucle principal.\n", intentos);
        Serial.println("[BOOT] Entrando en MODO SEGURO para evitar un bucle infinito de reinicios.");
        s_modoSeguro = true;
    } else {
        Storage::guardarIntentosArranque(intentos + 1);
    }
}

static void limpiarContadorArranque() {
    Storage::borrarIntentosArranque();
}

void setup() {
    Serial.begin(115200);
    uint32_t t0 = millis();
    while (!Serial && millis() - t0 < 3000) {}

    esp_task_wdt_init(WDT_TIMEOUT_S, true);
    esp_task_wdt_add(NULL);

    Storage::begin();
    LedStatus::begin();
    LedStatus::set(LedStatus::Estado::Iniciando);

    chequearModoSeguro();

    if (s_modoSeguro) {
        Storage::borrarIntentosArranque();
        LedStatus::set(LedStatus::Estado::ModoSeguro);
        Serial.println("[BOOT] MODO SEGURO activo. El firmware normal no se ejecutara.");
        Serial.println("[BOOT] Conecta por serie para depurar. Reinicia el equipo para reintentar.");
        return; // loop() quedará vacío, esperando reinicio manual
    }

    Serial.println("Iniciando servicio de telemetria en produccion...");

    ButtonHandler::chequear();

    // 1. Conectar a la red (o bloquear en el portal de configuracion)
    WifiManager::conectar();

    // Heartbeat inicial para registrar/vincular el dispositivo de inmediato
    ApiClient::enviarHeartbeat();
    esp_task_wdt_reset();

    // 2. Pedir configuracion de baud rate a la API
    uint32_t baudRate = MODBUS_DEFAULT_BAUD;
    uint32_t serverBaud = 0;
    if (ApiClient::fetchBaudRate(serverBaud)) {
        baudRate = serverBaud;
        Serial.printf("Baud rate obtenido del servidor: %u\n", baudRate);
    } else {
        Serial.printf("Usando baud rate por defecto: %u\n", baudRate);
    }

    // 3. Inicializar UART Modbus/RS485
    ModbusClient::begin(MODBUS_RX_PIN, MODBUS_TX_PIN);
    ModbusClient::setBaudRate(baudRate);
    Serial.printf("UART Modbus (%d) inicializado en pines TX=%d, RX=%d a %u bps\n",
                  MODBUS_UART_NUM, MODBUS_TX_PIN, MODBUS_RX_PIN, baudRate);

    // Llegar hasta aquí confirma que el arranque fue exitoso -> reiniciar el
    // contador de intentos fallidos para que el modo seguro no se dispare
    // en el próximo reinicio normal.
    limpiarContadorArranque();
}

void loop() {
    if (s_modoSeguro) {
        delay(1000);
        return;
    }

    esp_task_wdt_reset();

    ButtonHandler::chequear();

    // 1. Leer Modbus
    std::vector<int16_t> resultado;
    String errorMsg;
    bool exito = ModbusClient::leerRegistros(
        MODBUS_SLAVE_ID, MODBUS_START_REG, MODBUS_REG_COUNT,
        MODBUS_FUNCTION_CODE, resultado, errorMsg);

    std::map<String, float> mediciones;
    String modbusStatus;

    if (exito && resultado.size() >= 2) {
        float temp1 = resultado[0] / MODBUS_EU_FACTOR;
        float temp2 = resultado[1] / MODBUS_EU_FACTOR;
        mediciones["temp1"] = temp1;
        mediciones["temp2"] = temp2;
        // Claves adicionales por compatibilidad con el backend previo
        mediciones["sensor_temperatura"] = temp1;
        mediciones["sensor_humedad"] = temp2;
        modbusStatus = "OK";
        LedStatus::set(LedStatus::Estado::Ok);
        Serial.printf(">>> VIN0/Temp1: %.2f C | VIN1/Temp2: %.2f C\n", temp1, temp2);
    } else {
        modbusStatus = "ERROR";
        if (errorMsg.length() == 0) errorMsg = "Datos insuficientes";
        Serial.printf("Error Modbus: %s\n", errorMsg.c_str());
        LedStatus::set(LedStatus::Estado::Error);
    }

    // 2. Asegurar conexion WiFi
    if (!WifiManager::estaConectado()) {
        Serial.println("WiFi perdido, reconectando...");
        LedStatus::set(LedStatus::Estado::Reconectando);
        WifiManager::conectar();
        ApiClient::enviarHeartbeat();
    }

    // 3. Enviar a la Base de Datos
    if (WifiManager::estaConectado()) {
        ApiClient::enviarTelemetria(mediciones, modbusStatus, exito ? "" : errorMsg);
        ApiClient::enviarHeartbeat();
    } else {
        Serial.println("No se pudo enviar telemetria por falta de WiFi.");
    }

    // Pausa dividida en pasos cortos monitoreando el boton y alimentando el WDT
    for (int i = 0; i < (int)(TELEMETRY_LOOP_DELAY_MS / 100); i++) {
        ButtonHandler::chequear();
        delay(100);
        esp_task_wdt_reset();
    }
}
