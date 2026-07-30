#include "wifi_manager.h"
#include <WiFi.h>
#include <esp_task_wdt.h>
#include "config.h"
#include "storage.h"
#include "led_status.h"
#include "button_handler.h"
#include "captive_portal.h"

namespace WifiManager {

bool estaConectado() {
    return WiFi.status() == WL_CONNECTED;
}

String obtenerCodigoVinculacion() {
    String ssid, password, linkingCode;
    if (Storage::cargarCredenciales(ssid, password, linkingCode)) {
        return linkingCode;
    }
    return "";
}

bool conectar(bool lanzarPortalSiFalla) {
    String ssidGuardado, passGuardado, linkingCode;
    bool hayCredenciales = Storage::cargarCredenciales(ssidGuardado, passGuardado, linkingCode);

    String ssid = hayCredenciales ? ssidGuardado : String(WIFI_SSID_DEFAULT);
    String password = hayCredenciales ? passGuardado : String(WIFI_PASSWORD_DEFAULT);

    WiFi.mode(WIFI_STA);
    delay(200);
    WiFi.setSleep(false); // Desactivar ahorro de energia para maxima estabilidad de conexion

    Serial.printf("Conectando a WiFi SSID: %s...\n", ssid.c_str());
    LedStatus::set(LedStatus::Estado::Conectando);

    WiFi.disconnect();
    delay(200);
    WiFi.begin(ssid.c_str(), password.c_str());

    uint32_t inicio = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - inicio) < (WIFI_CONNECT_TIMEOUT_S * 1000UL)) {
        esp_task_wdt_reset();
        ButtonHandler::chequear();
        delay(1000);
        Serial.printf(".(%d)", WiFi.status());
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n¡WiFi Conectado!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        LedStatus::set(LedStatus::Estado::Ok);
        esp_task_wdt_reset();
        return true;
    }

    Serial.printf("\nError al conectar a WiFi. Ultimo status: %d\n", WiFi.status());
    if (lanzarPortalSiFalla) {
        // Bloquea hasta recibir credenciales nuevas y luego reinicia el equipo.
        CaptivePortal::iniciar();
    }
    return false;
}

} // namespace WifiManager
