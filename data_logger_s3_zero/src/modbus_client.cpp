#include "modbus_client.h"
#include <HardwareSerial.h>
#include <esp_task_wdt.h>
#include "config.h"

namespace ModbusClient {

static HardwareSerial modbusSerial(MODBUS_UART_NUM);
static int s_rxPin = -1, s_txPin = -1;
static uint32_t s_baud = MODBUS_DEFAULT_BAUD;

uint16_t crc16(const uint8_t *data, size_t len) {
    uint16_t crc = 0xFFFF;
    for (size_t pos = 0; pos < len; pos++) {
        crc ^= data[pos];
        for (int i = 0; i < 8; i++) {
            if (crc & 1) {
                crc >>= 1;
                crc ^= 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

void begin(int rxPin, int txPin) {
    s_rxPin = rxPin;
    s_txPin = txPin;

    modbusSerial.begin(s_baud, SERIAL_8N1, s_rxPin, s_txPin);
}

void setBaudRate(uint32_t baud) {
    s_baud = baud;
    modbusSerial.updateBaudRate(s_baud);
}

bool leerRegistros(uint8_t slaveId, uint16_t startReg, uint16_t count,
                    uint8_t functionCode, std::vector<int16_t> &valores, String &error) {
    valores.clear();

    uint8_t peticion[8] = {
        slaveId,
        functionCode,
        (uint8_t)((startReg >> 8) & 0xFF), (uint8_t)(startReg & 0xFF),
        (uint8_t)((count >> 8) & 0xFF), (uint8_t)(count & 0xFF),
        0, 0
    };
    uint16_t crc = crc16(peticion, 6);
    peticion[6] = crc & 0xFF;
    peticion[7] = (crc >> 8) & 0xFF;

    // Limpiar buffer de entrada residual
    while (modbusSerial.available()) modbusSerial.read();

    // TTL full-duplex: no hay pin RE/DE que conmutar, se puede transmitir
    // y recibir sin coordinar la dirección de la línea.
    modbusSerial.write(peticion, sizeof(peticion));
    modbusSerial.flush(); // Espera a que el hardware termine de transmitir realmente

    // Esperar respuesta con timeout
    uint32_t inicio = millis();
    while (!modbusSerial.available()) {
        if (millis() - inicio > MODBUS_RESPONSE_TIMEOUT_MS) {
            error = "Timeout de respuesta UART";
            return false;
        }
        delay(5);
        esp_task_wdt_reset();
    }

    // Pequeña pausa para asegurar la recepción completa de la trama
    delay(20);

    uint8_t buf[256];
    size_t n = 0;
    while (modbusSerial.available() && n < sizeof(buf)) {
        buf[n++] = modbusSerial.read();
    }

    if (n == 0) {
        error = "Sin datos en buffer";
        return false;
    }
    if (n < 5) {
        error = "Trama incompleta";
        return false;
    }

    uint16_t crcCalculado = crc16(buf, n - 2);
    uint16_t crcRecibido = buf[n - 2] | (buf[n - 1] << 8);
    if (crcCalculado != crcRecibido) {
        error = "Error CRC";
        return false;
    }

    uint8_t respFunc = buf[1];
    if (respFunc == functionCode) {
        size_t minLength = 5 + (2 * count);
        if (n >= minLength) {
            size_t dataLen = n - 2 - 3; // total - crc(2) - (slave+func+bytecount)(3)
            for (size_t i = 0; i + 1 < dataLen; i += 2) {
                uint16_t raw = (buf[3 + i] << 8) | buf[3 + i + 1];
                int16_t val = (int16_t)raw; // conversión con signo (equivalente a unpack('>h'))
                valores.push_back(val);
            }
            return true;
        } else {
            error = "Trama incompleta de datos";
            return false;
        }
    } else if (respFunc == (functionCode | 0x80)) {
        error = "Modbus Exception: " + String(buf[2]);
        return false;
    } else {
        error = "Codigo de funcion inesperado: " + String(respFunc);
        return false;
    }
}

} // namespace ModbusClient
