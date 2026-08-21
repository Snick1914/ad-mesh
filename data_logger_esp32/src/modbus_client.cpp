#include "modbus_client.h"
#include <HardwareSerial.h>
#include <esp_task_wdt.h>
#include "config.h"

namespace ModbusClient {

static int s_rxPin = -1, s_txPin = -1;
static uint32_t s_baud = MODBUS_DEFAULT_BAUD;
static HardwareSerial modbusSerial(2);

// Quitar 'static' para coincidir con la declaración del header
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
    modbusSerial.begin(s_baud, SERIAL_8N1, s_rxPin, s_txPin);
}

void setBaudRate(uint32_t baud) {
    s_baud = baud;
    if (s_rxPin != -1) {
        modbusSerial.end();
        pinMode(s_rxPin, INPUT_PULLUP);
        modbusSerial.begin(s_baud, SERIAL_8N1, s_rxPin, s_txPin);
    }
}

bool leerRegistros(uint8_t slaveId, uint16_t startReg, uint16_t count,
                   uint8_t functionCode, std::vector<float> &valores, String &error) {
    valores.clear();

    while (modbusSerial.available()) {
        modbusSerial.read();
    }

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

    modbusSerial.write(peticion, sizeof(peticion));
    modbusSerial.flush();

    uint8_t buffer[64];
    uint8_t indexBuf = 0;
    uint32_t startTime = millis();
    const uint32_t timeoutMs = 500;
    size_t expectedLen = 5 + (count * 2);

    while (millis() - startTime < timeoutMs) {
        esp_task_wdt_reset();

        if (modbusSerial.available()) {
            uint8_t b = modbusSerial.read();

            if (indexBuf == 0 && b != slaveId) continue;
            if (indexBuf == 1 && b != functionCode) {
                indexBuf = 0;
                continue;
            }

            buffer[indexBuf++] = b;

            if (indexBuf >= expectedLen) {
                if (buffer[2] == (count * 2)) {
                    uint16_t crcCalculado = crc16(buffer, expectedLen - 2);
                    uint16_t crcRecibido = buffer[expectedLen - 2] | (buffer[expectedLen - 1] << 8);
                    if (crcCalculado == crcRecibido) {
                        for (size_t i = 0; i < count; i += 2) {
                            if (3 + i * 2 + 3 < expectedLen - 2) {
                                uint8_t b0 = buffer[3 + i * 2];
                                uint8_t b1 = buffer[3 + i * 2 + 1];
                                uint8_t b2 = buffer[3 + i * 2 + 2];
                                uint8_t b3 = buffer[3 + i * 2 + 3];

                                uint32_t temp = ((uint32_t)b0 << 24) | ((uint32_t)b1 << 16) | ((uint32_t)b2 << 8) | b3;
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
                    error = "Byte count incorrecto";
                    return false;
                }
            }
        }
        delay(1);
    }

    error = "Timeout esperando respuesta Modbus";
    return false;
}

} // namespace ModbusClient