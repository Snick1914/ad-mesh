#pragma once
#include <Arduino.h>
#include <map>

namespace ApiClient {

// Consulta la configuración configurada para este sensor en el backend.
// Devuelve true y llena `baudOut` e `intervalOut` si el servidor especificó valores.
bool fetchConfig(uint32_t &baudOut, uint32_t &intervalOut);

// Envía las mediciones (clave -> valor) junto con el serial del dispositivo.
bool enviarTelemetria(const std::map<String, float> &medicionesNumericas,
                      const String &modbusStatus, const String &errorMsg);

// Envía heartbeat + vincula el dispositivo con su código de vinculación (si existe).
bool enviarHeartbeat();

// Retorna el serial único basado en la dirección MAC del dispositivo.
String getDeviceSerial();

} // namespace ApiClient
