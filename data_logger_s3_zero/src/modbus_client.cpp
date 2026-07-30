#include "modbus_client.h"
#include <HardwareSerial.h>
#include <esp_task_wdt.h>
#include "config.h"

namespace ModbusClient {

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

void begin(int rxPin, int txPin, uint32_t baudRate) {
    s_rxPin = rxPin;
    s_txPin = txPin;
    s_baud = baudRate;

    pinMode(s_rxPin, INPUT_PULLUP);
    Serial1.begin(s_baud, SERIAL_8N1, s_rxPin, s_txPin);
}

void setBaudRate(uint32_t baud) {
    s_baud = baud;
    if (s_rxPin != -1) {
        Serial1.end();
        pinMode(s_rxPin, INPUT_PULLUP);
        Serial1.begin(s_baud, SERIAL_8N1, s_rxPin, s_txPin);
    }
}

bool leerRegistros(uint8_t slaveId, uint16_t startReg, uint16_t count,
                    uint8_t functionCode, std::vector<float> &valores, String &error) {
    valores.clear();

    // 1. Limpiar cualquier residuo en el búfer de recepción
    while (Serial1.available()) {
        Serial1.read();
    }

    // 2. Construir trama de consulta Modbus RTU activa
    uint8_t peticion[8];
    peticion[0] = slaveId;
    peticion[1] = functionCode;
    peticion[2] = (startReg >> 8) & 0xFF;
    peticion[3] = startReg & 0xFF;
    peticion[4] = (count >> 8) & 0xFF;
    peticion[5] = count & 0xFF;

    uint16_t crcPeticion = crc16(peticion, 6);
    peticion[6] = crcPeticion & 0xFF;
    peticion[7] = (crcPeticion >> 8) & 0xFF;

    // 3. Enviar consulta activa al dispositivo
    Serial1.write(peticion, sizeof(peticion));
    Serial1.flush(); // Asegurar transmisión física de todos los bytes

    // 4. Leer respuesta con timeout de 500 ms
    uint8_t buffer[32];
    uint8_t indexBuf = 0;
    uint32_t startTime = millis();
    const uint32_t timeoutMs = 500;

    // Respuesta esperada: 1 esclavo + 1 función + 1 byte count + (count * 2) datos + 2 CRC
    size_t expectedLen = 5 + (count * 2);

    while (millis() - startTime < timeoutMs) {
        esp_task_wdt_reset();

        if (Serial1.available()) {
            uint8_t b = Serial1.read();

            if (indexBuf == 0 && b != slaveId) continue;
            if (indexBuf == 1 && b != functionCode) {
                indexBuf = 0;
                continue;
            }

            buffer[indexBuf++] = b;

            if (indexBuf >= expectedLen) {
                // Confirmar byte count
                if (buffer[2] == (count * 2)) {
                    // Validar CRC
                    uint16_t crcCalculado = crc16(buffer, expectedLen - 2);
                    uint16_t crcRecibido = buffer[expectedLen - 2] | (buffer[expectedLen - 1] << 8);
                    if (crcCalculado == crcRecibido) {
                        // 5. Decodificar float en formato CDAB (b3 = buf[5], b2 = buf[6], b1 = buf[3], b0 = buf[4])
                        for (size_t i = 0; i < count; i += 2) {
                            if (3 + i * 2 + 3 < expectedLen - 2) {
                                uint8_t b3 = buffer[3 + i * 2 + 2];
                                uint8_t b2 = buffer[3 + i * 2 + 3];
                                uint8_t b1 = buffer[3 + i * 2];
                                uint8_t b0 = buffer[3 + i * 2 + 1];

                                uint32_t temp = ((uint32_t)b3 << 24) | ((uint32_t)b2 << 16) | ((uint32_t)b1 << 8) | b0;
                                float val;
                                memcpy(&val, &temp, sizeof(val));
                                valores.push_back(val);
                            }
                        }
                        return true;
                    } else {
                        error = "Error CRC en respuesta";
                        return false;
                    }
                } else {
                    error = "Byte count de respuesta incorrecto";
                    return false;
                }
            }
        }
        delay(1);
    }

    error = "Timeout esperando respuesta Modbus RTU";
    return false;
}

} // namespace ModbusClient
