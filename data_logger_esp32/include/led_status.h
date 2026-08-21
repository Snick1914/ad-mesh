#pragma once
#include <Arduino.h>

namespace LedStatus {

enum class Estado {
    Iniciando,
    Conectando,
    Portal,
    Ok,
    Error,
    Reconectando,
    ModoSeguro,
    Apagado
};

void begin();
void set(Estado estado);
void update(); // Maneja secuencias de parpadeo sin bloqueos

} // namespace LedStatus