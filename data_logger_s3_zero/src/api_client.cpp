#include "api_client.h"
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include "config.h"
#include "wifi_manager.h"

namespace ApiClient {

bool fetchConfig(uint32_t &baudOut, uint32_t &intervalOut) {
    if (!WifiManager::estaConectado()) return false;

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    String url = String(API_BASE_URL) + "/iot/sensors/config/" + getDeviceSerial();
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.begin(client, url);

    int code = http.GET();
    bool ok = false;

    if (code == 200) {
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, http.getStream());
        if (!err) {
            if (doc["baud_rate"].is<long>()) {
                baudOut = doc["baud_rate"].as<uint32_t>();
            }
            if (doc["send_interval_seconds"].is<long>()) {
                intervalOut = doc["send_interval_seconds"].as<uint32_t>();
            }
            ok = true;
        }
    } else if (code > 0) {
        Serial.printf("[API] fetchConfig HTTP %d\n", code);
    } else {
        Serial.printf("[API] Error obteniendo config: %s\n", http.errorToString(code).c_str());
    }

    http.end();
    esp_task_wdt_reset();
    return ok;
}

bool enviarTelemetria(const std::map<String, float> &medicionesNumericas,
                      const String &modbusStatus, const String &errorMsg) {
    if (!WifiManager::estaConectado()) return false;

    JsonDocument doc;
    JsonArray metrics = doc["metrics"].to<JsonArray>();

    // Agregar estado de modbus como métrica
    JsonObject mStatus = metrics.add<JsonObject>();
    mStatus["name"] = "modbus_status";
    mStatus["value"] = (modbusStatus == "OK") ? 1.0f : 0.0f;
    mStatus["unit"] = "status";

    // Agregar las demás mediciones
    for (const auto &kv : medicionesNumericas) {
        JsonObject m = metrics.add<JsonObject>();
        m["name"] = kv.first;
        m["value"] = kv.second;
        if (kv.first.indexOf("temp") >= 0 || kv.first.indexOf("temperatura") >= 0) {
            m["unit"] = "C";
        } else if (kv.first.indexOf("hum") >= 0 || kv.first.indexOf("humedad") >= 0) {
            m["unit"] = "%";
        } else {
            m["unit"] = "";
        }
    }

    String linkingCode = WifiManager::obtenerCodigoVinculacion();
    if (linkingCode.length() > 0) {
        doc["linking_code"] = linkingCode;
    }
    doc["type"] = "electrical";
    doc["name"] = "Nodo " + getDeviceSerial().substring(getDeviceSerial().length() - 4);

    String payload;
    serializeJson(doc, payload);

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    String url = String(API_BASE_URL) + "/iot/sensors/" + getDeviceSerial() + "/ingest";
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");

    int code = http.POST(payload);
    if (code <= 0) {
        Serial.printf("[API] Error de red al enviar telemetria: %s\n", http.errorToString(code).c_str());
    }

    http.end();
    esp_task_wdt_reset();
    return code > 0;
}

bool enviarHeartbeat() {
    std::map<String, float> medicionesVacias;
    return enviarTelemetria(medicionesVacias, "OK", "");
}

String getDeviceSerial() {
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    return "ESP32S3_" + mac;
}

} // namespace ApiClient
