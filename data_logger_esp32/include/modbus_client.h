#pragma once
#include <Arduino.h>
#include <vector>

namespace ModbusClient {

void begin(int rxPin, int txPin, uint32_t baudRate);
void setBaudRate(uint32_t baud);

bool leerRegistros(uint8_t slaveId, uint16_t startReg, uint16_t count,
                    uint8_t functionCode, std::vector<float> &valores, String &error);

uint16_t crc16(const uint8_t *data, size_t len);

} // namespace ModbusClient
