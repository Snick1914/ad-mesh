#pragma once
#include <Arduino.h>
#include <esp_task_wdt.h>

namespace ButtonHandler {

void begin();

// Monitorea el botón físico. Si se mantiene presionado BUTTON_HOLD_RESET_MS,
// borra las credenciales guardadas y reinicia el dispositivo.
void chequear();

// Lectura directa del pin (para el chequeo de "botón presionado durante el arranque").
bool presionado();

} // namespace ButtonHandler
