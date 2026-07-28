#pragma once
#include <Adafruit_NeoPixel.h>
#include "config.h"

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
void setColor(uint8_t r, uint8_t g, uint8_t b);

} // namespace LedStatus
