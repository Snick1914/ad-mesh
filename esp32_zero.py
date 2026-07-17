import network
import urequests
import ujson
import time
import gc
from machine import UART, Pin, WDT, reset

# ==================== CONFIGURACIÓN ====================
SSID = "WireShapes"
PASSWORD = "WireSh@pes_2025#?"

API_BASE_URL = "http://api.admesh.com/api/v1"
DEVICE_SERIAL = "ESP32S3-ZERO-MODBUS-01"

# Pines Modbus
RX_PIN = 44
TX_PIN = 43
RE_DE_PIN = 5  # Pin de flujo RS485 (DE/RE)

# Configuración por defecto
SLAVE_ID = 1
baud_rate = 9600

# Configurar Pin de control de flujo
re_de = Pin(RE_DE_PIN, Pin.OUT)
re_de.value(0)  # Empezar en modo lectura (LOW)

# Inicializar Watchdog Timer (30 segundos para evitar bloqueos permanentes)
wdt = WDT(timeout=30000)

# ==================== FUNCIÓN DE CRC-16 MODBUS ====================
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

# ==================== CONECTAR A WIFI CON ALIMENTACIÓN DE WDT ====================
def conectar_wifi():
    wlan = network.WLAN(network.STA_IF)
    try:
        wlan.active(False)
        time.sleep_ms(200)
    except Exception:
        pass
    
    try:
        wlan.active(True)
        time.sleep_ms(200)
    except Exception as e:
        print("Fallo al activar interfaz WiFi:", e)
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        time.sleep_ms(200)

    if not wlan.isconnected():
        print("Conectando a WiFi...")
        wlan.connect(SSID, PASSWORD)
        
        # Esperar conexión alimentando el watchdog
        timeout = 25
        while not wlan.isconnected() and timeout > 0:
            wdt.feed()  # Alimentar Watchdog
            time.sleep(1)
            timeout -= 1
            print(".", end="")
            
    if wlan.isconnected():
        print("\n¡WiFi Conectado!")
        print("IP:", wlan.ifconfig()[0])
        wdt.feed()
        return True
    else:
        print("\nError al conectar a WiFi.")
        return False

# ==================== OBTENER CONFIGURACIÓN ====================
def fetch_baud_rate():
    global baud_rate
    try:
        url = f"{API_BASE_URL}/devices/config/{DEVICE_SERIAL}"
        res = urequests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            server_baud = data.get("baud_rate")
            if server_baud:
                baud_rate = int(server_baud)
                print(f"Baud rate obtenido del servidor: {baud_rate}")
        res.close()
    except Exception as e:
        print("Error obteniendo baud rate de la API (usando default):", e)
    wdt.feed()

# ==================== LEER REGISTROS MODBUS ====================
def leer_modbus(uart, slave_id, start_reg, count):
    """
    Lee holding registers usando Modbus RTU.
    Función Modbus 03 (Read Holding Registers).
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

        # Habilitar transmisión (DE/RE = High)
        re_de.value(1)
        uart.write(peticion)
        time.sleep_ms(15)  # Esperar envío físico
        
        # Habilitar recepción (DE/RE = Low)
        re_de.value(0)

        # Esperar respuesta con timeout
        timeout_ms = 150
        start_time = time.ticks_ms()
        while not uart.any():
            if time.ticks_diff(time.ticks_ms(), start_time) > timeout_ms:
                return False, "Timeout de respuesta UART"
            time.sleep_ms(5)
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

# ==================== FUNCIÓN PRINCIPAL DE EJECUCIÓN ====================
def main():
    global baud_rate
    print("Iniciando servicio de telemetría en producción...")
    
    # 1. Conectar a la red y pedir configuración
    conectar_wifi()
    fetch_baud_rate()
    
    # 2. Inicializar UART
    uart = UART(1, baudrate=baud_rate, tx=TX_PIN, rx=RX_PIN, bits=8, parity=None, stop=1)
    print(f"UART Modbus inicializado a {baud_rate} bps")
    
    while True:
        wdt.feed()  # Alimentar Watchdog al inicio de cada ciclo
        
        # Liberar memoria fragmentada antes de operaciones pesadas
        gc.collect()
        
        # 1. Leer Modbus
        success, result = leer_modbus(uart, SLAVE_ID, 0, 2)
        mediciones = {}
        if success:
            mediciones["sensor_temperatura"] = result[0] / 10.0
            mediciones["sensor_humedad"] = result[1] / 10.0
            mediciones["modbus_status"] = "OK"
        else:
            mediciones["modbus_status"] = "ERROR"
            mediciones["error_msg"] = result
            print(f"Error Modbus: {result}")

        # 2. Enviar a la Base de Datos
        wlan = network.WLAN(network.STA_IF)
        if not wlan.isconnected():
            print("WiFi perdido, reconectando...")
            conectar_wifi()

        if wlan.isconnected():
            try:
                payload = {
                    "device_serial": DEVICE_SERIAL,
                    "mediciones": mediciones
                }
                url = f"{API_BASE_URL}/telemetry/"
                headers = {"Content-Type": "application/json"}
                
                # Enviar con timeout de red de 10 segundos
                res = urequests.post(url, json=payload, headers=headers, timeout=10)
                res.close()
            except Exception as e:
                print("Error de red al enviar telemetría:", e)
        else:
            print("No se pudo enviar telemetría por falta de WiFi.")

        # Pausa dividida en pasos cortos alimentando el WDT para evitar disparos accidentales
        for _ in range(10):
            time.sleep(1)
            wdt.feed()

# ==================== ENTRADA AL PROGRAMA Y AUTO-RECUPERACIÓN ====================
if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR CRÍTICO NO CONTROLADO:", e)
        time.sleep(5)
        reset()  # Reiniciar el microcontrolador si el servicio falla por completo
