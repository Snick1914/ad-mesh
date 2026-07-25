import time
import config
from machine import Pin

_re_de = None


def _get_re_de():
    global _re_de
    pin_num = getattr(config, "RE_DE_PIN", None)
    if pin_num is None:
        return None
    if _re_de is None:
        _re_de = Pin(pin_num, Pin.OUT)
        _re_de.value(0)  # iniciar en RX
    return _re_de


def crc16(data):
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


def leer_modbus(uart, slave_id, start_reg, count, wdt=None, function_code=4):
    """
    Lee registros usando Modbus RTU.
    Basado en el patrón del firmware que funciona con el adaptador RS485-TTL automático.

    Parámetros:
        uart          – objeto UART ya configurado
        slave_id      – dirección Modbus del esclavo (1–247)
        start_reg     – registro de inicio (0-based)
        count         – número de registros a leer
        wdt           – objeto WDT opcional para alimentar durante el timeout
        function_code – 4 = Input Registers (ADAM-4018+), 3 = Holding Registers

    Retorna:
        (True,  [lista de valores enteros con signo de 16 bits])
        (False, "mensaje de error")
    """
    peticion = bytearray([
        slave_id,
        function_code,
        (start_reg >> 8) & 0xFF,
        start_reg & 0xFF,
        (count >> 8) & 0xFF,
        count & 0xFF
    ])
    peticion += crc16(peticion)

    try:
        re_de = _get_re_de()

        # Limpiar residuos previos del buffer
        while uart.any():
            uart.read(1)

        # Enviar petición (activar driver RS485 antes de transmitir)
        if re_de:
            re_de.value(1)
        uart.write(peticion)
        if re_de:
            time.sleep_ms(12)   # asegurar transmisión completa antes de soltar el bus
            re_de.value(0)

        # Esperar respuesta con timeout, acumulando por si llega en varios trozos
        timeout_ms = getattr(config, "TIMEOUT_MS", 800)
        min_bytes = 5 + (2 * count)
        respuesta = b""
        inicio = time.ticks_ms()
        while time.ticks_diff(time.ticks_ms(), inicio) < timeout_ms:
            if uart.any():
                respuesta += uart.read()
                if len(respuesta) >= min_bytes:
                    break
            time.sleep_ms(5)
            if wdt:
                wdt.feed()

        if not respuesta:
            return False, "Timeout de respuesta UART"

        if len(respuesta) < 5:
            return False, "Trama incompleta"

        # Verificar que la respuesta pertenece al esclavo correcto
        if respuesta[0] != slave_id:
            return False, f"Slave ID inesperado: {respuesta[0]}"

        # Detectar excepción Modbus
        if respuesta[1] == (function_code | 0x80):
            return False, f"Modbus Exception: código {respuesta[2]}"

        if respuesta[1] != function_code:
            return False, f"Código de función inesperado: {respuesta[1]}"

        # Verificar CRC
        crc_calculado = crc16(respuesta[:-2])
        if crc_calculado != respuesta[-2:]:
            print(f"[MODBUS DEBUG] Error CRC. Recibido ({len(respuesta)} bytes): {list(respuesta)}")
            return False, "Error CRC"

        # Extraer y parsear valores
        min_length = 5 + (2 * count)
        if len(respuesta) < min_length:
            return False, "Trama incompleta de datos"

        valores = []
        data_bytes = respuesta[3:-2]
        for i in range(0, len(data_bytes), 2):
            val = (data_bytes[i] << 8) | data_bytes[i + 1]
            if val >= 0x8000:   # Signo: equivale a struct.unpack('>h', ...)
                val -= 0x10000
            valores.append(val)
        return True, valores

    except Exception as e:
        return False, str(e)

