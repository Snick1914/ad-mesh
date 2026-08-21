#include "captive_portal.h"
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <esp_task_wdt.h>
#include "config.h"
#include "storage.h"
#include "led_status.h"
#include "button_handler.h"

namespace CaptivePortal {

static const char HTML_TEMPLATE[] PROGMEM = R"HTML(<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuraci&oacute;n WiFi - AD-Mesh</title>
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: rgba(255, 255, 255, 0.05);
            --border-color: rgba(255, 255, 255, 0.1);
            --text-color: #f3f4f6;
            --accent-color: #3b82f6;
            --accent-hover: #2563eb;
        }
        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            background: var(--card-bg);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 2.5rem;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        h2 {
            margin-top: 0;
            font-weight: 600;
            text-align: center;
            background: linear-gradient(45deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            text-align: center;
            color: #9ca3af;
            font-size: 0.9rem;
            margin-bottom: 2rem;
        }
        .form-group { margin-bottom: 1.5rem; }
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-size: 0.85rem;
            color: #9ca3af;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 0.75rem 1rem;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: #fff;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.2s;
        }
        input[type="text"]:focus, input[type="password"]:focus { border-color: var(--accent-color); }
        button {
            width: 100%;
            padding: 0.75rem;
            background: var(--accent-color);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover { background: var(--accent-hover); }
        .footer {
            margin-top: 2rem;
            text-align: center;
            font-size: 0.75rem;
            color: #4b5563;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>AD-Mesh</h2>
        <p>Configuraci&oacute;n de Red WiFi para el dispositivo</p>
        <form method="POST" action="/save">
            <div class="form-group">
                <label for="ssid">SSID (Nombre de Red)</label>
                <input type="text" id="ssid" name="ssid" placeholder="Introduce el SSID..." required>
            </div>
            <div class="form-group">
                <label for="password">Contrase&ntilde;a</label>
                <input type="password" id="password" name="password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" required>
            </div>
            <div class="form-group">
                <label for="linking_code">C&oacute;digo de Vinculaci&oacute;n (Usuario)</label>
                <input type="text" id="linking_code" name="linking_code" placeholder="Ej: USR-ABC12345" required>
            </div>
            <button type="submit">Guardar y Conectar</button>
        </form>
        <div class="footer">ESP32-S3 Telemetry Node</div>
    </div>
</body>
</html>
)HTML";

static const char HTML_SUCCESS[] PROGMEM = R"HTML(<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuraci&oacute;n Guardada</title>
    <style>
        body {
            background-color: #0b0f19;
            color: #f3f4f6;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 2.5rem;
            text-align: center;
            max-width: 400px;
        }
        h2 { color: #10b981; }
        p { color: #9ca3af; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="container">
        <h2>&iexcl;Configuraci&oacute;n Guardada!</h2>
        <p>El dispositivo se est&aacute; reiniciando para conectarse a la nueva red WiFi.</p>
        <p>Puedes cerrar esta ventana.</p>
    </div>
</body>
</html>
)HTML";

static WebServer server(80);
static DNSServer dnsServer;
static bool s_guardado = false;

static void handleRoot() {
    server.send_P(200, "text/html", HTML_TEMPLATE);
}

static void handleSave() {
    String ssid = server.arg("ssid");
    String password = server.arg("password");
    String linkingCode = server.arg("linking_code");

    if (ssid.length() > 0) {
        if (Storage::guardarCredenciales(ssid, password, linkingCode)) {
            s_guardado = true;
            Serial.printf("Nueva red y codigo de vinculacion guardados con exito. SSID: %s, Code: %s\n",
                          ssid.c_str(), linkingCode.c_str());
        } else {
            Serial.println("Error al guardar wifi_config.json");
        }
    }

    server.send_P(200, "text/html", HTML_SUCCESS);
}

// Cualquier ruta no reconocida responde igual que la raíz: es lo que dispara
// la detección automática de portal cautivo en Android/iOS/Windows.
static void handleNotFound() {
    handleRoot();
}

void iniciar() {
    Serial.println("\nIniciando Access Point para configuracion...");
    LedStatus::set(LedStatus::Estado::Portal);

    WiFi.disconnect(true);
    delay(200);
    WiFi.mode(WIFI_AP);
    delay(200);

    IPAddress apIP;
    apIP.fromString(AP_IP_ADDR);
    WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
    WiFi.softAP(AP_SSID);

    Serial.printf("Punto de acceso listo: '%s'\n", AP_SSID);
    Serial.printf("IP del servidor: %s\n", AP_IP_ADDR);

    // DNS cautivo: responde con la IP propia a CUALQUIER dominio consultado,
    // forzando la detección automática del portal en el teléfono.
    dnsServer.start(53, "*", apIP);

    server.on("/", HTTP_GET, handleRoot);
    server.on("/save", HTTP_POST, handleSave);
    server.onNotFound(handleNotFound);
    server.begin();
    Serial.println("Servidor de configuracion iniciado en http://" AP_IP_ADDR);

    s_guardado = false;
    while (!s_guardado) {
        ButtonHandler::chequear();
        dnsServer.processNextRequest();
        server.handleClient();
        esp_task_wdt_reset();
        delay(2);
    }

    server.stop();
    dnsServer.stop();

    Serial.println("Credenciales recibidas. Reiniciando el dispositivo en 3 segundos...");
    delay(3000);
    ESP.restart();
}

} // namespace CaptivePortal
