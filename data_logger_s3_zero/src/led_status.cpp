#include "led_status.h"

namespace LedStatus {

static Adafruit_NeoPixel np(RGB_COUNT, RGB_PIN, NEO_GRB + NEO_KHZ800);

// Valores bajos a propósito para no encandilar (igual que el firmware MicroPython original)
void begin() {
    np.begin();
    np.setBrightness(255);
    setColor(0, 0, 0);
}

void setColor(uint8_t r, uint8_t g, uint8_t b) {
    np.setPixelColor(0, np.Color(r, g, b));
    np.show();
}

void set(Estado estado) {
    switch (estado) {
        case Estado::Iniciando:    setColor(30, 20, 0);  break; // Amarillo
        case Estado::Conectando:   setColor(0, 0, 40);   break; // Azul
        case Estado::Portal:       setColor(30, 0, 40);  break; // Violeta
        case Estado::Ok:           setColor(0, 35, 0);   break; // Verde
        case Estado::Error:        setColor(40, 0, 0);   break; // Rojo
        case Estado::Reconectando: setColor(35, 10, 0);  break; // Naranja
        case Estado::ModoSeguro:   setColor(30, 0, 20);  break; // Magenta tenue
        case Estado::Apagado:      setColor(0, 0, 0);    break;
    }
}

} // namespace LedStatus
