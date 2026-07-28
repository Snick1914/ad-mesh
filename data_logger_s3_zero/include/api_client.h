#pragma once
#include <Arduino.h>
#include <map>

namespace ApiClient {

// Consulta el baud rate configurado para este dispositivo en el backend.
// Devuelve true y llena `baudOut` si el servidor especificó uno.
bool fetchBaudRate(uint32_t &baudOut);

// Envía las mediciones (clave -> valor) junto con el serial del dispositivo.
bool enviarTelemetria(const std::map<String, float> &medicionesNumericas,
                      const String &modbusStatus, const String &errorMsg);

// Envía heartbeat + vincula el dispositivo con su código de vinculación (si existe).
bool enviarHeartbeat();

} // namespace ApiClient
