#include "api_client.h"
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include "config.h"
#include "wifi_manager.h"

namespace ApiClient {

bool fetchBaudRate(uint32_t &baudOut) {
    if (!WifiManager::estaConectado()) return false;

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    String url = String(API_BASE_URL) + "/devices/config/" + getDeviceSerial();
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.begin(client, url);

    int code = http.GET();
    bool ok = false;

    if (code == 200) {
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, http.getStream());
        if (!err && doc["baud_rate"].is<long>()) {
            baudOut = doc["baud_rate"].as<uint32_t>();
            ok = baudOut > 0;
        }
    } else if (code > 0) {
        Serial.printf("[API] fetch_baud_rate HTTP %d\n", code);
    } else {
        Serial.printf("[API] Error obteniendo baud rate: %s\n", http.errorToString(code).c_str());
    }

    http.end();
    esp_task_wdt_reset();
    return ok;
}

bool enviarTelemetria(const std::map<String, float> &medicionesNumericas,
                      const String &modbusStatus, const String &errorMsg) {
    if (!WifiManager::estaConectado()) return false;

    JsonDocument doc;
    doc["device_serial"] = getDeviceSerial();
    JsonObject mediciones = doc["mediciones"].to<JsonObject>();
    for (const auto &kv : medicionesNumericas) {
        mediciones[kv.first] = kv.second;
    }
    mediciones["modbus_status"] = modbusStatus;
    if (errorMsg.length() > 0) {
        mediciones["error_msg"] = errorMsg;
    }

    String payload;
    serializeJson(doc, payload);

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    String url = String(API_BASE_URL) + "/telemetry/";
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
    JsonDocument doc;
    doc["ip_address"] = "127.0.0.1";
    doc["storage_used_gb"] = 0.0;
    doc["status"] = "online";

    String linkingCode = WifiManager::obtenerCodigoVinculacion();
    if (linkingCode.length() > 0) {
        doc["linking_code"] = linkingCode;
    }

    if (WifiManager::estaConectado()) {
        doc["ip_address"] = WiFi.localIP().toString();
    }

    String payload;
    serializeJson(doc, payload);

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    String url = String(API_BASE_URL) + "/devices/" + getDeviceSerial() + "/heartbeat";
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");

    int code = http.POST(payload);
    if (code <= 0) {
        Serial.printf("[API] Error enviando heartbeat: %s\n", http.errorToString(code).c_str());
    }

    http.end();
    esp_task_wdt_reset();
    return code > 0;
}

String getDeviceSerial() {
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    return "ESP32S3_" + mac;
}

} // namespace ApiClient
