#include "storage.h"
#include <LittleFS.h>
#include <ArduinoJson.h>
#include "config.h"

namespace Storage {

static const char *BOOT_ATTEMPTS_FILE = "/boot_attempts.txt";

void begin() {
    if (!LittleFS.begin(true)) { // true = formatear si el filesystem está corrupto/vacío
        Serial.println("[STORAGE] Fallo al montar LittleFS incluso tras formatear");
    }
}

bool cargarCredenciales(String &ssid, String &password, String &linkingCode) {
    if (!LittleFS.exists(CONFIG_FILE_PATH)) return false;

    File f = LittleFS.open(CONFIG_FILE_PATH, "r");
    if (!f) return false;

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, f);
    f.close();
    if (err) return false;

    if (!doc["SSID"].is<const char*>()) return false;

    ssid = doc["SSID"].as<String>();
    password = doc["PASSWORD"] | "";
    linkingCode = doc["LINKING_CODE"] | "";
    return ssid.length() > 0;
}

bool guardarCredenciales(const String &ssid, const String &password, const String &linkingCode) {
    File f = LittleFS.open(CONFIG_FILE_PATH, "w");
    if (!f) return false;

    JsonDocument doc;
    doc["SSID"] = ssid;
    doc["PASSWORD"] = password;
    doc["LINKING_CODE"] = linkingCode;

    bool ok = serializeJson(doc, f) > 0;
    f.close();
    return ok;
}

void borrarCredenciales() {
    if (LittleFS.exists(CONFIG_FILE_PATH)) {
        LittleFS.remove(CONFIG_FILE_PATH);
    }
}

int leerIntentosArranque() {
    if (!LittleFS.exists(BOOT_ATTEMPTS_FILE)) return 0;
    File f = LittleFS.open(BOOT_ATTEMPTS_FILE, "r");
    if (!f) return 0;
    int n = f.parseInt();
    f.close();
    return n;
}

void guardarIntentosArranque(int n) {
    File f = LittleFS.open(BOOT_ATTEMPTS_FILE, "w");
    if (!f) return;
    f.print(n);
    f.close();
}

void borrarIntentosArranque() {
    if (LittleFS.exists(BOOT_ATTEMPTS_FILE)) {
        LittleFS.remove(BOOT_ATTEMPTS_FILE);
    }
}

} // namespace Storage
