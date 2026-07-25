import time
import config
from machine import Pin

# Inicializar pin RE/DE de dirección de RS485 si está configurado
re_de = None
if hasattr(config, "RE_DE_PIN") and config.RE_DE_PIN is not None:
    try:
        re_de = Pin(config.RE_DE_PIN, Pin.OUT)
        re_de.value(0)  # Iniciar en modo Recepción (RX)
    except Exception as e:
        print("[MODBUS] Error inicializando pin RE/DE:", e)

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

def leer_modbus(uart, slave_id, start_reg, count, wdt=None, function_code=3):
    """
    Lee registros usando Modbus RTU (Función 03 o 04).
    El adaptador de hardware maneja el flujo de transmisión automáticamente.
    """
    # Construir trama de petición
    peticion = bytes([
        slave_id,
        function_code,
        (start_reg >> 8) & 0xFF, start_reg & 0xFF,
        (count >> 8) & 0xFF, count & 0xFF
    ])
    peticion += crc16(peticion)

    try:
        # Limpiar buffer de entrada residual
        while uart.any():
            uart.read(1)

        # Transmitir petición
        if re_de:
            re_de.value(1)  # Habilitar transmisión (TX)

        uart.write(peticion)

        if re_de:
            # Esperar a que se termine de transmitir antes de volver a recepción.
            # A 9600 baudios, transmitir 8 bytes toma aproximadamente 8.3 ms.
            time.sleep_ms(12)
            re_de.value(0)  # Habilitar recepción (RX)
        
        # Esperar respuesta con timeout (incrementado a 300ms para mayor compatibilidad)
        timeout_ms = 300
        start_time = time.ticks_ms()
        while not uart.any():
            if time.ticks_diff(time.ticks_ms(), start_time) > timeout_ms:
                return False, "Timeout de respuesta UART"
            time.sleep_ms(5)
            if wdt:
                wdt.feed()

        # Pequeña pausa para asegurar la recepción completa de la trama
        time.sleep_ms(20)

        # Leer respuesta
        respuesta = uart.read()
        if not respuesta:
            return False, "Sin datos en buffer"

        # Verificar respuesta mínima (ej. excepcion Modbus tiene 5 bytes)
        if len(respuesta) < 5:
            return False, "Trama incompleta"

        # Verificar CRC
        crc_calculado = crc16(respuesta[:-2])
        crc_recibido = respuesta[-2:]
        if crc_calculado != crc_recibido:
            return False, "Error CRC"

        # Verificar código de función o excepción
        resp_func = respuesta[1]
        if resp_func == function_code:
            min_length = 5 + (2 * count)
            if len(respuesta) >= min_length:
                valores = []
                data_bytes = respuesta[3:-2]
                for i in range(0, len(data_bytes), 2):
                    val = (data_bytes[i] << 8) | data_bytes[i+1]
                    # Convertir a entero de 16 bits con signo (equivalente a unpack('>h'))
                    if val >= 0x8000:
                        val -= 0x10000
                    valores.append(val)
                return True, valores
            else:
                return False, "Trama incompleta de datos"
        elif resp_func == (function_code | 0x80):
            return False, f"Modbus Exception: {respuesta[2]}"
        else:
            return False, f"Código de función inesperado: {resp_func}"

    except Exception as e:
        return False, str(e)

