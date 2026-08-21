#include "api_client.h"
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include "config.h"
#include "wifi_manager.h"

namespace ApiClient {

bool fetchConfig(uint32_t &baudOut, uint32_t &intervalOut, String &otaVersionOut, String &otaUrlOut) {
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
            if (doc["ota_version"].is<const char*>()) {
                otaVersionOut = doc["ota_version"].as<String>();
            }
            if (doc["ota_url"].is<const char*>()) {
                otaUrlOut = doc["ota_url"].as<String>();
            }
            ok = true;
        }
    } else {
        Serial.printf("[API GET ERROR %d] URL: %s\n", code, url.c_str());
        Serial.printf("[API GET DETALLE]: %s\n", http.getString().c_str());
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

    JsonObject mStatus = metrics.add<JsonObject>();
    mStatus["name"] = "modbus_status";
    mStatus["value"] = (modbusStatus == "OK") ? 1.0f : 0.0f;
    mStatus["unit"] = "status";

    for (const auto &kv : medicionesNumericas) {
        JsonObject m = metrics.add<JsonObject>();
        m["name"] = kv.first;
        m["value"] = kv.second;

        if (kv.first.startsWith("v_") || kv.first.indexOf("voltage") >= 0) {
            m["unit"] = "V";
        } else if (kv.first.startsWith("i_") || kv.first.indexOf("current") >= 0) {
            m["unit"] = "A";
        } else if (kv.first.startsWith("p_") || kv.first.indexOf("power") >= 0) {
            m["unit"] = "W";
        } else if (kv.first.startsWith("q_")) {
            m["unit"] = "VAr";
        } else if (kv.first.startsWith("pf_")) {
            m["unit"] = "";
        } else if (kv.first == "frequency") {
            m["unit"] = "Hz";
        } else if (kv.first.indexOf("energy") >= 0) {
            m["unit"] = "kWh";
        } else {
            m["unit"] = "";
        }
    }

    String linkingCode = WifiManager::obtenerCodigoVinculacion();
    if (linkingCode.length() > 0) {
        doc["linking_code"] = linkingCode;
    }

    doc["type"] = "electrical";
    doc["name"] = "Eastron X96 " + getDeviceSerial().substring(getDeviceSerial().length() - 4);

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
    if (code != 200 && code != 201) {
        Serial.printf("[API POST ERROR %d] URL: %s\n", code, url.c_str());
        Serial.printf("[API POST PAYLOAD]: %s\n", payload.c_str());
        Serial.printf("[API POST DETALLE]: %s\n", http.getString().c_str());
    } else {
        Serial.printf("[API POST OK %d] Telemetria de 3 lineas registrada.\n", code);
    }

    http.end();
    esp_task_wdt_reset();
    return (code == 200 || code == 201);
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