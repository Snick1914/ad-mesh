#include "button_handler.h"
#include "config.h"
#include "storage.h"

namespace ButtonHandler {

void begin() {
    pinMode(BUTTON_PIN, INPUT_PULLUP);
}

bool presionado() {
    return digitalRead(BUTTON_PIN) == LOW;
}

void chequear() {
    if (!presionado()) return;

    Serial.println("\n[BOTON DETECTADO] Manten presionado 10 segundos para borrar WiFi...");
    uint32_t inicio = millis();
    int ultimoSegundo = -1;

    while (presionado()) {
        esp_task_wdt_reset();
        uint32_t transcurridoMs = millis() - inicio;
        int segundos = transcurridoMs / 1000;

        if (segundos != ultimoSegundo) {
            Serial.printf("Segundos presionado: %d/10\n", segundos);
            ultimoSegundo = segundos;
        }

        if (transcurridoMs >= BUTTON_HOLD_RESET_MS) {
            Serial.println("¡Limite de 10 segundos alcanzado! Borrando configuracion WiFi y reiniciando...");
            Storage::borrarCredenciales();
            delay(1000);
            ESP.restart();
        }

        delay(100);
    }

    Serial.println("[BOTON SOLTADO] Cancelado.");
}

} // namespace ButtonHandler
