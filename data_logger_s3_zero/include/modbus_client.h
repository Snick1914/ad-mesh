#pragma once
#include <Arduino.h>
#include <vector>

namespace ModbusClient {

void begin(int rxPin, int txPin);

// Reconfigura la UART con un nuevo baud rate (ej. tras consultarlo a la API).
void setBaudRate(uint32_t baud);

// Lee `count` registros Modbus RTU (función 03/04) a partir de `startReg`.
// Devuelve true y llena `valores` (enteros con signo de 16 bits) si tuvo éxito;
// en caso contrario devuelve false y deja el motivo en `error`.
bool leerRegistros(uint8_t slaveId, uint16_t startReg, uint16_t count,
                    uint8_t functionCode, std::vector<int16_t> &valores, String &error);

uint16_t crc16(const uint8_t *data, size_t len);

} // namespace ModbusClient
