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
    Serial.println("\n--- INICIO SETUP ---");
    Serial.flush();

    // Inicializar UART Modbus inmediatamente al inicio para capturar señales a tiempo
    ModbusClient::begin(MODBUS_RX_PIN, MODBUS_TX_PIN, MODBUS_DEFAULT_BAUD);

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
    Serial.println("[BOOT] Configurando Watchdog...");
    Serial.flush();
    esp_task_wdt_config_t wdt_config = {
        .timeout_ms = WDT_TIMEOUT_S * 1000,
        .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
        .trigger_panic = true
    };
    esp_task_wdt_deinit();
    esp_task_wdt_init(&wdt_config);
#else
    esp_task_wdt_init(WDT_TIMEOUT_S, true);
#endif
    esp_task_wdt_add(NULL);
    Serial.println("[BOOT] Watchdog listo.");
    Serial.flush();

    Serial.println("[BOOT] Iniciando Storage...");
    Serial.flush();
    Storage::begin();

    Serial.println("[BOOT] Iniciando LedStatus...");
    Serial.flush();
    LedStatus::begin();
    LedStatus::set(LedStatus::Estado::Iniciando);

    Serial.println("[BOOT] Chequeando modo seguro...");
    Serial.flush();
    chequearModoSeguro();

    if (s_modoSeguro) {
        Storage::borrarIntentosArranque();
        LedStatus::set(LedStatus::Estado::ModoSeguro);
        Serial.println("[BOOT] MODO SEGURO activo. El firmware normal no se ejecutara.");
        Serial.println("[BOOT] Conecta por serie para depurar. Reinicia el equipo para reintentar.");
        Serial.flush();
        return; // loop() quedará vacío, esperando reinicio manual
    }

    Serial.println("Iniciando servicio de telemetria en produccion...");
    Serial.flush();

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
        ModbusClient::setBaudRate(baudRate);
    } else {
        Serial.printf("Usando baud rate por defecto: %u\n", baudRate);
    }

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

    static float s_sumaTemp1 = 0.0f;
    static float s_sumaTemp2 = 0.0f;
    static int s_cantLecturasValidas = 0;
    static String s_ultimoErrorModbus = "";
    static uint32_t s_ultimoEnvioMs = millis();

    esp_task_wdt_reset();
    ButtonHandler::chequear();

    // 1. Realizar la lectura Modbus (cada 5 segundos)
    std::vector<float> resultado;
    String errorMsg;
    bool exito = ModbusClient::leerRegistros(
        MODBUS_SLAVE_ID, MODBUS_START_REG, MODBUS_REG_COUNT,
        MODBUS_FUNCTION_CODE, resultado, errorMsg);

    if (exito && resultado.size() >= 1) {
        float temp1 = resultado[0] / MODBUS_EU_FACTOR;
        float temp2 = (resultado.size() >= 2) ? (resultado[1] / MODBUS_EU_FACTOR) : 0.0f;
        
        s_sumaTemp1 += temp1;
        s_sumaTemp2 += temp2;
        s_cantLecturasValidas++;
        Serial.printf(">>> [LECTURA 5s] Temp1: %.3f C | Temp2: %.3f C\n", temp1, temp2);
        LedStatus::set(LedStatus::Estado::Ok);
    } else {
        s_ultimoErrorModbus = errorMsg.length() == 0 ? "Error de lectura" : errorMsg;
        Serial.printf(">>> [LECTURA 5s] Error Modbus: %s\n", s_ultimoErrorModbus.c_str());
        LedStatus::set(LedStatus::Estado::Error);
    }

    // 2. Comprobar si han transcurrido 10 segundos para enviar a la API
    if (millis() - s_ultimoEnvioMs >= 10000UL) {
        s_ultimoEnvioMs = millis();

        std::map<String, float> mediciones;
        String modbusStatus;

        if (s_cantLecturasValidas > 0) {
            float promTemp1 = s_sumaTemp1 / s_cantLecturasValidas;
            float promTemp2 = s_sumaTemp2 / s_cantLecturasValidas;

            mediciones["temp1"] = promTemp1;
            mediciones["temp2"] = promTemp2;
            mediciones["sensor_temperatura"] = promTemp1;
            mediciones["sensor_humedad"] = promTemp2;
            modbusStatus = "OK";

            Serial.printf(">>> [ENVIO API 10s] Enviando promedio de %d lecturas: Temp1=%.3f, Temp2=%.3f\n", 
                          s_cantLecturasValidas, promTemp1, promTemp2);
        } else {
            modbusStatus = "ERROR";
            Serial.printf(">>> [ENVIO API 10s] Enviando estado de ERROR: %s\n", s_ultimoErrorModbus.c_str());
        }

        // Asegurar conexion WiFi antes de enviar
        if (!WifiManager::estaConectado()) {
            Serial.println("WiFi perdido, reconectando...");
            LedStatus::set(LedStatus::Estado::Reconectando);
            WifiManager::conectar(false);
            ApiClient::enviarHeartbeat();
        }

        if (WifiManager::estaConectado()) {
            ApiClient::enviarTelemetria(mediciones, modbusStatus, (s_cantLecturasValidas > 0) ? "" : s_ultimoErrorModbus);
            ApiClient::enviarHeartbeat();
        } else {
            Serial.println("No se pudo enviar telemetria por falta de WiFi.");
        }

        // Resetear acumuladores para el siguiente ciclo de 10s
        s_sumaTemp1 = 0.0f;
        s_sumaTemp2 = 0.0f;
        s_cantLecturasValidas = 0;
    }

    // Esperar 5 segundos antes de la siguiente lectura (dividido para WDT y botón)
    for (int i = 0; i < 50; i++) {
        ButtonHandler::chequear();
        delay(100);
        esp_task_wdt_reset();
    }
}
