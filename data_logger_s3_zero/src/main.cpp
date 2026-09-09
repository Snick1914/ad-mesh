#include <Arduino.h>
#include <esp_task_wdt.h>
#include <map>
#include <ArduinoOTA.h>
#include <HTTPUpdate.h>

static void ejecutarHttpOTA(const String &url) {
    Serial.println(">>> [OTA] Iniciando actualizacion HTTP OTA de: " + url);
    WiFiClientSecure client;
    client.setInsecure();
    httpUpdate.rebootOnUpdate(true);
    
    t_httpUpdate_return ret = httpUpdate.update(client, url);
    switch (ret) {
        case HTTP_UPDATE_FAILED:
            Serial.printf(">>> [OTA] Actualizacion fallida. Error (%d): %s\n", 
                          httpUpdate.getLastError(), httpUpdate.getLastErrorString().c_str());
            break;
        case HTTP_UPDATE_NO_UPDATES:
            Serial.println(">>> [OTA] No hay actualizaciones disponibles.");
            break;
        case HTTP_UPDATE_OK:
            Serial.println(">>> [OTA] Actualizacion exitosa.");
            break;
    }
}

#include "config.h"
#include "storage.h"
#include "led_status.h"
#include "button_handler.h"
#include "modbus_client.h"
#include "wifi_manager.h"
#include "api_client.h"

static const int MAX_BOOT_ATTEMPTS = 3; // Reinicios consecutivos sin llegar al bucle principal antes de entrar en modo seguro
static bool s_modoSeguro = false;
static uint32_t s_envioIntervaloMs = 300000UL; // 5 minutos por defecto (300000 ms)
static uint32_t s_baudRate = MODBUS_DEFAULT_BAUD;
static bool s_otaEnCurso = false;

static void configurarOTA() {
    ArduinoOTA.setHostname(("AD-Mesh-" + ApiClient::getDeviceSerial()).c_str());
    
    ArduinoOTA.onStart([]() {
        String type;
        if (ArduinoOTA.getCommand() == U_FLASH) {
            type = "sketch";
        } else { // U_SPIFFS
            type = "filesystem";
        }
        Serial.println("\n>>> [OTA] Iniciando actualizacion de " + type);
        s_otaEnCurso = true;
        LedStatus::set(LedStatus::Estado::Iniciando);
    });
    
    ArduinoOTA.onEnd([]() {
        Serial.println("\n>>> [OTA] Actualizacion finalizada con exito. Reiniciando...");
        s_otaEnCurso = false;
    });
    
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf(">>> [OTA] Progreso: %u%%\r", (progress / (total / 100)));
    });
    
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf(">>> [OTA] Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR) Serial.println("Fallo de autenticacion");
        else if (error == OTA_BEGIN_ERROR) Serial.println("Fallo al iniciar");
        else if (error == OTA_CONNECT_ERROR) Serial.println("Fallo de conexion");
        else if (error == OTA_RECEIVE_ERROR) Serial.println("Fallo de recepcion");
        else if (error == OTA_END_ERROR) Serial.println("Fallo de finalizacion");
        s_otaEnCurso = false;
    });

    ArduinoOTA.begin();
    Serial.println(">>> [OTA] Servicio de actualizacion OTA configurado y listo.");
}

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
    // Apagar bluetooth inmediatamente para ahorrar energia
    btStop();

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
    bool wifiOk = WifiManager::conectar();

    if (wifiOk) {
        // Heartbeat inicial para registrar/vincular el dispositivo de inmediato
        ApiClient::enviarHeartbeat();
        esp_task_wdt_reset();

        // 2. Pedir configuracion de baud rate e intervalo de envio a la API
        uint32_t serverBaud = 0;
        uint32_t serverIntervalSec = 0;
        String serverOtaVersion = "";
        String serverOtaUrl = "";
        if (ApiClient::fetchConfig(serverBaud, serverIntervalSec, serverOtaVersion, serverOtaUrl)) {
            if (serverBaud > 0) {
                s_baudRate = serverBaud;
                Serial.printf("Baud rate obtenido del servidor: %u\n", s_baudRate);
                ModbusClient::setBaudRate(s_baudRate);
            }
            if (serverIntervalSec > 0) {
                s_envioIntervaloMs = serverIntervalSec * 1000UL;
                Serial.printf("Intervalo de envio obtenido del servidor: %u s\n", serverIntervalSec);
            }
            if (serverOtaVersion.length() > 0 && serverOtaVersion != FIRMWARE_VERSION && serverOtaUrl.length() > 0) {
                Serial.printf(">>> [BOOT] Nueva actualizacion OTA detectada: %s. Iniciando...\n", serverOtaVersion.c_str());
                // Asegurar que la URL sea absoluta
                String absoluteOtaUrl = serverOtaUrl;
                if (serverOtaUrl.startsWith("/")) {
                    absoluteOtaUrl = String(API_BASE_URL) + serverOtaUrl;
                }
                ejecutarHttpOTA(absoluteOtaUrl);
            }
        } else {
            Serial.printf("Usando baud rate por defecto: %u e intervalo: %u ms\n", s_baudRate, s_envioIntervaloMs);
        }

        // Configurar e iniciar OTA
        configurarOTA();

        Serial.println(">>> [BOOT] Abriendo ventana de actualizacion OTA por 30 segundos...");
        uint32_t startOtaWindow = millis();
        while (millis() - startOtaWindow < OTA_BOOT_WINDOW_MS) {
            ArduinoOTA.handle();
            ButtonHandler::chequear();
            esp_task_wdt_reset();
            delay(50);
            if (s_otaEnCurso) {
                // Si comenzo la actualizacion, bloquear aqui hasta que termine o de error
                Serial.println(">>> [BOOT] Actualizacion OTA detectada. Procesando...");
                while (s_otaEnCurso) {
                    ArduinoOTA.handle();
                    esp_task_wdt_reset();
                    delay(50);
                }
                break;
            }
        }
    }

    // Apagar radios de WiFi/Bluetooth después de la ventana inicial para ahorrar energía
    WifiManager::apagarRadios();

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

    // 2. Comprobar si han transcurrido los milisegundos indicados para enviar a la API
    if (millis() - s_ultimoEnvioMs >= s_envioIntervaloMs) {
        s_ultimoEnvioMs = millis();

        std::map<String, float> mediciones;
        String modbusStatus;

        if (s_cantLecturasValidas > 0) {
            float promTemp1 = s_sumaTemp1 / s_cantLecturasValidas;

            mediciones["sensor_temperatura"] = promTemp1;
            modbusStatus = "OK";

            Serial.printf(">>> [ENVIO API] Encendiendo WiFi para enviar promedio de %d lecturas...\n", s_cantLecturasValidas);
        } else {
            modbusStatus = "ERROR";
            Serial.printf(">>> [ENVIO API] Encendiendo WiFi para enviar estado de ERROR: %s\n", s_ultimoErrorModbus.c_str());
        }

        // Conectar a WiFi
        LedStatus::set(LedStatus::Estado::Reconectando);
        bool conectado = WifiManager::conectar(false);

        if (conectado) {
            ApiClient::enviarHeartbeat();
            ApiClient::enviarTelemetria(mediciones, modbusStatus, (s_cantLecturasValidas > 0) ? "" : s_ultimoErrorModbus);
            
            // Actualizar configuración dinámicamente desde el backend
            uint32_t serverBaud = 0;
            uint32_t serverIntervalSec = 0;
            String serverOtaVersion = "";
            String serverOtaUrl = "";
            if (ApiClient::fetchConfig(serverBaud, serverIntervalSec, serverOtaVersion, serverOtaUrl)) {
                if (serverBaud > 0 && serverBaud != s_baudRate) {
                    s_baudRate = serverBaud;
                    Serial.printf("Actualizando Baud Rate: %u\n", s_baudRate);
                    ModbusClient::setBaudRate(s_baudRate);
                }
                if (serverIntervalSec > 0) {
                    s_envioIntervaloMs = serverIntervalSec * 1000UL;
                    Serial.printf("Actualizando Intervalo Envio: %u ms\n", s_envioIntervaloMs);
                }
                if (serverOtaVersion.length() > 0 && serverOtaVersion != FIRMWARE_VERSION && serverOtaUrl.length() > 0) {
                    Serial.printf(">>> [LOOP] Nueva actualizacion OTA detectada: %s. Iniciando...\n", serverOtaVersion.c_str());
                    // Asegurar que la URL sea absoluta
                    String absoluteOtaUrl = serverOtaUrl;
                    if (serverOtaUrl.startsWith("/")) {
                        absoluteOtaUrl = String(API_BASE_URL) + serverOtaUrl;
                    }
                    ejecutarHttpOTA(absoluteOtaUrl);
                }
            }

            // Ventana para permitir actualizacion OTA tras el envio de datos
            Serial.println(">>> [OTA] Abriendo ventana para actualizaciones OTA por 15 segundos...");
            uint32_t startOta = millis();
            while (millis() - startOta < OTA_TX_WINDOW_MS) {
                ArduinoOTA.handle();
                ButtonHandler::chequear();
                esp_task_wdt_reset();
                delay(50);
                if (s_otaEnCurso) {
                    Serial.println(">>> [OTA] Actualizacion OTA detectada durante transmision. Procesando...");
                    while (s_otaEnCurso) {
                        ArduinoOTA.handle();
                        esp_task_wdt_reset();
                        delay(50);
                    }
                    break;
                }
            }
        } else {
            Serial.println("No se pudo conectar a WiFi. Se omitira el envio de este ciclo.");
        }

        // Apagar radios de nuevo para ahorrar energía
        WifiManager::apagarRadios();

        // Resetear acumuladores para el siguiente ciclo
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
