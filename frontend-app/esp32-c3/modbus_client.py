import time
import config

def crc16(data: bytes) -> bytes:
    """Calcula el CRC-16 para Modbus RTU."""
    crc = 0xFFFF
    for pos in data:
        crc ^= pos
        for _ in range(8):
            if (crc & 1) != 0:
                crc >>= 1
                crc ^= 0xA001
            else:
                crc >>= 1
    return bytes([crc & 0xFF, (crc >> 8) & 0xFF])

def leer_modbus(uart, slave_id, start_reg, count, wdt=None):
    """
    Lee holding registers usando Modbus RTU (Función 03).
    El adaptador de hardware maneja el flujo de transmisión automáticamente.
    """
    # Construir trama de petición
    peticion = bytes([
        slave_id,
        3,
        (start_reg >> 8) & 0xFF, start_reg & 0xFF,
        (count >> 8) & 0xFF, count & 0xFF
    ])
    peticion += crc16(peticion)

    try:
        # Limpiar buffer de entrada residual
        while uart.any():
            uart.read(1)

        # Transmitir petición (el adaptador automático maneja el flujo por hardware)
        uart.write(peticion)
        
        # Esperar respuesta con timeout
        timeout_ms = 150
        start_time = time.ticks_ms()
        while not uart.any():
            if time.ticks_diff(time.ticks_ms(), start_time) > timeout_ms:
                return False, "Timeout de respuesta UART"
            time.sleep_ms(5)
            if wdt:
                wdt.feed()

        # Leer respuesta
        respuesta = uart.read()
        if not respuesta:
            return False, "Sin datos en buffer"

        min_length = 5 + (2 * count)
        if len(respuesta) >= min_length:
            # Verificar CRC
            crc_calculado = crc16(respuesta[:-2])
            crc_recibido = respuesta[-2:]
            if crc_calculado == crc_recibido:
                valores = []
                data_bytes = respuesta[3:-2]
                for i in range(0, len(data_bytes), 2):
                    val = (data_bytes[i] << 8) | data_bytes[i+1]
                    valores.append(val)
                return True, valores
            else:
                return False, "Error CRC"
        return False, "Trama incompleta"
    except Exception as e:
        return False, str(e)
