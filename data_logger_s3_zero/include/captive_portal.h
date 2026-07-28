#pragma once
#include <Arduino.h>

namespace CaptivePortal {

// Activa el modo Access Point + DNS cautivo + servidor web de configuración.
// Bloquea (atendiendo el bucle de red) hasta recibir credenciales válidas vía
// POST /save, momento en el cual guarda la configuración y reinicia el equipo.
void iniciar();

} // namespace CaptivePortal
