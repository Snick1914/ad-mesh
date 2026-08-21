#pragma once
#include <Arduino.h>

namespace Storage {

void begin();

// Credenciales guardadas en /wifi_config.json (LittleFS). Devuelve false si no existen.
bool cargarCredenciales(String &ssid, String &password, String &linkingCode);
bool guardarCredenciales(const String &ssid, const String &password, const String &linkingCode);
void borrarCredenciales();

// Contador de intentos de arranque fallidos, para el modo seguro.
int leerIntentosArranque();
void guardarIntentosArranque(int n);
void borrarIntentosArranque();

} // namespace Storage
