#include <Arduino.h>
#include <esp_task_wdt.h>
#include <map>
#include <ArduinoOTA.h>
#include <HTTPUpdate.h>
#include "config.h"
#include "storage.h"
#include "led_status.h"
#include "button_handler.h"
#include "modbus_client.h"
#include "wifi_manager.h"
#include "api_client.h"

static const int MAX_BOOT_ATTEMPTS = 3;
static bool s_modoSeguro = false;
static uint32_t s_envioIntervaloMs = 300000UL;
static uint32_t s_baudRate = MODBUS_DEFAULT_BAUD;
static bool s_otaEnCurso = false;

static void ejecutarHttpOTA(const String &url) {
    Serial.println(">>> [OTA] Actualizando desde: " + url);
    WiFiClientSecure client;
    client.setInsecure();
    httpUpdate.rebootOnUpdate(true);
    httpUpdate.update(client, url);
}

static void configurarOTA() {
    ArduinoOTA.setHostname(("AD-Mesh-" + ApiClient::getDeviceSerial()).c_str());
    ArduinoOTA.onStart([]() { s_otaEnCurso = true; });
    ArduinoOTA.onEnd([]() { s_otaEnCurso = false; });
    ArduinoOTA.onError([](ota_error_t error) { s_otaEnCurso = false; });
    ArduinoOTA.begin();
}

static void chequearModoSeguro() {
    ButtonHandler::begin();
    delay(50);

    if (ButtonHandler::presionado()) {
        Serial.println("\n[BOOT] MODO SEGURO por boton.");
        s_modoSeguro = true;
        return;
    }

    int intentos = Storage::leerIntentosArranque();
    if (intentos >= MAX_BOOT_ATTEMPTS) {
        Serial.println("\n[BOOT] MODO SEGURO por reinicios continuos.");
        s_modoSeguro = true;
    } else {
        Storage::guardarIntentosArranque(intentos + 1);
    }
}

void setup() {
    btStop();
    Serial.begin(115200);

    ModbusClient::begin(MODBUS_RX_PIN, MODBUS_TX_PIN, MODBUS_DEFAULT_BAUD);

#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
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

    Storage::begin();
    LedStatus::begin();
    LedStatus::set(LedStatus::Estado::Iniciando);

    chequearModoSeguro();
    if (s_modoSeguro) {
        Storage::borrarIntentosArranque();
        LedStatus::set(LedStatus::Estado::ModoSeguro);
        return;
    }

    bool wifiOk = WifiManager::conectar();
    if (wifiOk) {
        ApiClient::enviarHeartbeat();
        esp_task_wdt_reset();

        uint32_t serverBaud = 0, serverIntervalSec = 0;
        String serverOtaVersion = "", serverOtaUrl = "";
        if (ApiClient::fetchConfig(serverBaud, serverIntervalSec, serverOtaVersion, serverOtaUrl)) {
            if (serverBaud > 0) ModbusClient::setBaudRate(serverBaud);
            if (serverIntervalSec > 0) s_envioIntervaloMs = serverIntervalSec * 1000UL;
            if (serverOtaVersion.length() > 0 && serverOtaVersion != FIRMWARE_VERSION && serverOtaUrl.length() > 0) {
                ejecutarHttpOTA(serverOtaUrl);
            }
        }

        configurarOTA();
        uint32_t startOtaWindow = millis();
        while (millis() - startOtaWindow < OTA_BOOT_WINDOW_MS) {
            ArduinoOTA.handle();
            ButtonHandler::chequear();
            LedStatus::update();
            esp_task_wdt_reset();
            delay(50);
            if (s_otaEnCurso) break;
        }
    }

    WifiManager::apagarRadios();
    Storage::borrarIntentosArranque();
}

void loop() {
    if (s_modoSeguro) {
        delay(1000);
        return;
    }

    // Acumuladores para promediar las 3 líneas
    static float s_sumV1 = 0, s_sumV2 = 0, s_sumV3 = 0;
    static float s_sumI1 = 0, s_sumI2 = 0, s_sumI3 = 0;
    static float s_sumP1 = 0, s_sumP2 = 0, s_sumP3 = 0, s_sumPTotal = 0;
    static float s_sumPF1 = 0, s_sumPF2 = 0, s_sumPF3 = 0, s_sumPFTotal = 0;
    static float s_sumFreq = 0;
    static float s_ultimaEnergiaTotal = 0;
    static int s_cantLecturasValidas = 0;
    static String s_ultimoErrorModbus = "";
    static uint32_t s_ultimoEnvioMs = millis();

    esp_task_wdt_reset();
    ButtonHandler::chequear();
    LedStatus::update();

    // 1. Lectura en bloque de parámetros eléctricos (Reg 0x0000 a 0x0048 = 37 flotantes = 74 registros)
    std::vector<float> resBloque1, resEnergia;
    String err;

    // Lee Voltajes, Corrientes, Potencias, Factores de Potencia y Frecuencia de L1, L2 y L3
    bool ok1 = ModbusClient::leerRegistros(MODBUS_SLAVE_ID, 0x0000, 74, MODBUS_FUNCTION_CODE, resBloque1, err);
    delay(50);

    // Lee Energía Activa Total (Reg 0x0156 = 2 registros)
    bool ok2 = ModbusClient::leerRegistros(MODBUS_SLAVE_ID, 0x0156, 2, MODBUS_FUNCTION_CODE, resEnergia, err);

    if (ok1 && resBloque1.size() >= 36) {
        // Asignación según mapa de registros Eastron SMART X96-5 (Formato Float32 ABCD)
        float v1 = resBloque1[0];   // 0x0000: V1 (L1-N)
        float v2 = resBloque1[1];   // 0x0002: V2 (L2-N)
        float v3 = resBloque1[2];   // 0x0004: V3 (L3-N)
        float i1 = resBloque1[3];   // 0x0006: I1
        float i2 = resBloque1[4];   // 0x0008: I2
        float i3 = resBloque1[5];   // 0x000A: I3
        float p1 = resBloque1[6];   // 0x000C: P1 (W)
        float p2 = resBloque1[7];   // 0x000E: P2 (W)
        float p3 = resBloque1[8];   // 0x0010: P3 (W)
        float pf1 = resBloque1[15]; // 0x001E: PF1
        float pf2 = resBloque1[16]; // 0x0020: PF2
        float pf3 = resBloque1[17]; // 0x0022: PF3
        float pTot = resBloque1[26];// 0x0034: Total Active Power (W)
        float pfTot = resBloque1[31];// 0x003E: Total Power Factor
        float freq = resBloque1[35];// 0x0046: Frecuencia (Hz)

        if (ok2 && resEnergia.size() >= 1) {
            s_ultimaEnergiaTotal = resEnergia[0];
        }

        s_sumV1 += v1; s_sumV2 += v2; s_sumV3 += v3;
        s_sumI1 += i1; s_sumI2 += i2; s_sumI3 += i3;
        s_sumP1 += p1; s_sumP2 += p2; s_sumP3 += p3;
        s_sumPTotal += pTot;
        s_sumPF1 += pf1; s_sumPF2 += pf2; s_sumPF3 += pf3;
        s_sumPFTotal += pfTot;
        s_sumFreq += freq;
        s_cantLecturasValidas++;

        Serial.printf(">>> [X96-5] V: [%.1f, %.1f, %.1f]V | I: [%.2f, %.2f, %.2f]A | P_Tot: %.1fW | Freq: %.1fHz\n",
                      v1, v2, v3, i1, i2, i3, pTot, freq);
        LedStatus::set(LedStatus::Estado::Ok);
    } else {
        s_ultimoErrorModbus = err.length() == 0 ? "Fallo en lectura de registros" : err;
        Serial.printf(">>> [X96-5 ERROR] %s\n", s_ultimoErrorModbus.c_str());
        LedStatus::set(LedStatus::Estado::Error);
    }

    // 2. Envío a API según intervalo
    if (millis() - s_ultimoEnvioMs >= s_envioIntervaloMs) {
        s_ultimoEnvioMs = millis();
        std::map<String, float> mediciones;
        String modbusStatus;

        if (s_cantLecturasValidas > 0) {
            mediciones["voltage_l1"] = s_sumV1 / s_cantLecturasValidas;
            mediciones["voltage_l2"] = s_sumV2 / s_cantLecturasValidas;
            mediciones["voltage_l3"] = s_sumV3 / s_cantLecturasValidas;

            mediciones["current_l1"] = s_sumI1 / s_cantLecturasValidas;
            mediciones["current_l2"] = s_sumI2 / s_cantLecturasValidas;
            mediciones["current_l3"] = s_sumI3 / s_cantLecturasValidas;

            mediciones["active_power_l1"] = s_sumP1 / s_cantLecturasValidas;
            mediciones["active_power_l2"] = s_sumP2 / s_cantLecturasValidas;
            mediciones["active_power_l3"] = s_sumP3 / s_cantLecturasValidas;
            mediciones["total_active_power"] = s_sumPTotal / s_cantLecturasValidas;

            mediciones["power_factor_l1"] = s_sumPF1 / s_cantLecturasValidas;
            mediciones["power_factor_l2"] = s_sumPF2 / s_cantLecturasValidas;
            mediciones["power_factor_l3"] = s_sumPF3 / s_cantLecturasValidas;
            mediciones["total_power_factor"] = s_sumPFTotal / s_cantLecturasValidas;

            mediciones["frequency"] = s_sumFreq / s_cantLecturasValidas;
            mediciones["total_active_energy"] = s_ultimaEnergiaTotal;
            modbusStatus = "OK";
        } else {
            modbusStatus = "ERROR";
        }

        LedStatus::set(LedStatus::Estado::Reconectando);
        if (WifiManager::conectar(false)) {
            ApiClient::enviarHeartbeat();
            ApiClient::enviarTelemetria(mediciones, modbusStatus, (s_cantLecturasValidas > 0) ? "" : s_ultimoErrorModbus);

            uint32_t serverBaud = 0, serverIntervalSec = 0;
            String serverOtaVersion = "", serverOtaUrl = "";
            if (ApiClient::fetchConfig(serverBaud, serverIntervalSec, serverOtaVersion, serverOtaUrl)) {
                if (serverBaud > 0 && serverBaud != s_baudRate) ModbusClient::setBaudRate(serverBaud);
                if (serverIntervalSec > 0) s_envioIntervaloMs = serverIntervalSec * 1000UL;
            }

            uint32_t startOta = millis();
            while (millis() - startOta < OTA_TX_WINDOW_MS) {
                ArduinoOTA.handle();
                ButtonHandler::chequear();
                LedStatus::update();
                esp_task_wdt_reset();
                delay(50);
            }
        }

        WifiManager::apagarRadios();

        // Limpiar acumuladores
        s_sumV1 = s_sumV2 = s_sumV3 = 0;
        s_sumI1 = s_sumI2 = s_sumI3 = 0;
        s_sumP1 = s_sumP2 = s_sumP3 = s_sumPTotal = 0;
        s_sumPF1 = s_sumPF2 = s_sumPF3 = s_sumPFTotal = 0;
        s_sumFreq = 0;
        s_cantLecturasValidas = 0;
    }

    for (int i = 0; i < 50; i++) {
        ButtonHandler::chequear();
        LedStatus::update();
        delay(100);
        esp_task_wdt_reset();
    }
}