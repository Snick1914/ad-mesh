#include "led_status.h"
#include "config.h"

namespace LedStatus {

static Estado s_estadoActual = Estado::Apagado;
static uint32_t s_ultimoCambio = 0;
static bool s_ledEncendido = false;

void begin() {
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
}

void set(Estado estado) {
    s_estadoActual = estado;
    switch (estado) {
        case Estado::Ok:
            digitalWrite(LED_PIN, HIGH);
            break;
        case Estado::Apagado:
        case Estado::ModoSeguro:
            digitalWrite(LED_PIN, LOW);
            break;
        default:
            break;
    }
}

void update() {
    uint32_t ahora = millis();
    uint32_t intervalo = 500;

    switch (s_estadoActual) {
        case Estado::Iniciando:
        case Estado::Conectando:
            intervalo = 500; // Parpadeo medio
            break;
        case Estado::Portal:
        case Estado::Reconectando:
            intervalo = 200; // Parpadeo rápido
            break;
        case Estado::Error:
            intervalo = 100; // Parpadeo muy rápido
            break;
        case Estado::Ok:
            digitalWrite(LED_PIN, HIGH);
            return;
        case Estado::ModoSeguro:
        case Estado::Apagado:
            digitalWrite(LED_PIN, LOW);
            return;
    }

    if (ahora - s_ultimoCambio >= intervalo) {
        s_ultimoCambio = ahora;
        s_ledEncendido = !s_ledEncendido;
        digitalWrite(LED_PIN, s_ledEncendido ? HIGH : LOW);
    }
}

} // namespace LedStatus