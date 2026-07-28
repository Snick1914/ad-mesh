#pragma once
#include <Arduino.h>

namespace WifiManager {

// Intenta conectar con las credenciales guardadas (o las de fábrica). Si falla,
// levanta el Access Point de configuración y bloquea hasta recibir credenciales
// nuevas vía el portal cautivo (tras lo cual reinicia el dispositivo).
bool conectar();

bool estaConectado();

String obtenerCodigoVinculacion();

} // namespace WifiManager
