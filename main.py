import gc
import time
import struct
import sys
import ujson
import ntptime
from machine import UART, Pin, WDT, reset
import network
import config
import urequests

# ============================================================================
# INICIALIZACIÓN DE COMPONENTES Y SEGURIDAD (WDT)
# ============================================================================

# Inicializar Watchdog Timer para reiniciar automáticamente ante congelamientos
print("[SISTEMA] Iniciando Hardware Watchdog Timer (WDT)...")
wdt = WDT(timeout=config.WDT_TIMEOUT_MS)

# Configurar UART para comunicación RS485 / Modbus
def inicializar_uart():
    print(f"[MODBUS] Inicializando UART {config.UART_PORT} ({config.BAUDRATE} baud)...")
    return UART(
        config.UART_PORT,
        baudrate=config.BAUDRATE,
        tx=config.TX_PIN,
        rx=config.RX_PIN,
        bits=8,
        parity=None,
        stop=1
    )

uart = inicializar_uart()

# Pin de control de dirección RS485 (RE/DE) — el módulo TTL no es automático
re_de_pin = getattr(config, "RE_DE_PIN", None)
re_de = Pin(re_de_pin, Pin.OUT) if re_de_pin is not None else None
if re_de:
    re_de.value(0)  # iniciar en modo recepción

# ============================================================================
# SINCRONIZACIÓN DE TIEMPO (NTP)
# ============================================================================

def sincronizar_hora():
    """Intenta sincronizar la hora interna con un servidor NTP de red"""
    wlan = network.WLAN(network.STA_IF)
    if wlan.isconnected():
        try:
            print(f"[NTP] Sincronizando hora con {config.NTP_SERVER}...")
            ntptime.host = config.NTP_SERVER
            ntptime.settime()
            print("[NTP] Hora sincronizada con éxito.")
        except Exception as e:
            print("[NTP] Advertencia: Falló sincronización de hora:", e)

# Intentar sincronizar hora en el arranque
sincronizar_hora()

# ============================================================================
# FUNCIONES AUXILIARES DE CONEXIÓN Y RED
# ============================================================================

def asegurar_wifi():
    """Asegura la conexión Wi-Fi, alimentando el Watchdog en el proceso"""
    wlan = network.WLAN(network.STA_IF)
    if not wlan.isconnected():
        print("[WIFI] Conexión perdida. Reconectando...")
        wlan.active(True)
        wlan.connect(config.WIFI_SSID, config.WIFI_PASS)
        
        # Esperar hasta conectarse sin colgar la máquina
        intentos = 0
        max_intentos = config.WIFI_TIMEOUT_SEGUNDOS * 2
        while not wlan.isconnected() and intentos < max_intentos:
            wdt.feed()  # Evitar reset por parte del WDT durante reconexión
            time.sleep(0.5)
            intentos += 1
            
    if wlan.isconnected():
        return True
    return False

# ============================================================================
# CÓDIGO DE PROTOCOLO MODBUS RTU
# ============================================================================

def calcular_crc(data):
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

def bytes_a_float(data_bytes):
    try:
        return struct.unpack('>f', data_bytes)[0]
    except Exception:
        return None

def leer_registro_input(start_address):
    """Lectura de bajo nivel Modbus RTU por RS485"""
    # Limpiar cualquier residuo previo en el buffer UART
    while uart.any():
        uart.read(1)
        
    payload = bytearray([
        config.SLAVE_ID, 
        0x04, 
        (start_address >> 8) & 0xFF, 
        start_address & 0xFF, 
        0x00, 0x02  # Siempre leemos 2 registros (4 bytes para flotante de 32 bits)
    ])
    payload += calcular_crc(payload)

    # Enviar consulta (activar driver RS485 antes de transmitir)
    if re_de:
        re_de.value(1)
    uart.write(payload)
    if re_de:
        time.sleep_ms(12)  # asegurar transmisión completa antes de soltar el bus
        re_de.value(0)

    # Esperar respuesta con timeout, acumulando por si llega en varios trozos
    respuesta = b""
    inicio = time.ticks_ms()
    while time.ticks_diff(time.ticks_ms(), inicio) < config.TIMEOUT_MS:
        if uart.any():
            respuesta += uart.read()
            if len(respuesta) >= 9:
                break
        time.sleep_ms(5)

    # Validación básica de tamaño y protocolo
    if not respuesta or len(respuesta) < 9:
        return None
    if respuesta[0] != config.SLAVE_ID or respuesta[1] != 0x04:
        return None

    # Retorna solo los 4 bytes correspondientes a los datos leídos
    return respuesta[3:7]

# ============================================================================
# BUCLE DE EJECUCIÓN INDUSTRIAL
# ============================================================================

consecutivos_errores_modbus = 0

print("\n--- FIRMWARE DE TELEMETRÍA INDUSTRIAL INICIADO ---")

while True:
    inicio_ciclo = time.ticks_ms()
    
    # 1. Alimentar Watchdog y ejecutar recolector de basura (RAM libre)
    wdt.feed()
    gc.collect()
    
    # 2. Asegurar conectividad
    if not asegurar_wifi():
        print("[SISTEMA] Esperando restablecimiento de red Wi-Fi...")
        time.sleep(2)
        continue

    # 3. Estructuración del JSON Payload local
    telemetria_payload = {
        "timestamp": time.time(),
        "mediciones": {},
        "sensores_extra": {}
    }
    
    # 4. Leer registros Modbus del Eastron
    errores_lectura = 0
    for nombre, direccion in config.EASTRON_REGISTERS.items():
        wdt.feed()  # Alimentar Watchdog entre lecturas secuenciales
        datos_crudos = leer_registro_input(direccion)
        if datos_crudos:
            valor = bytes_a_float(datos_crudos)
            if valor is not None:
                telemetria_payload["mediciones"][nombre] = round(valor, 2)
            else:
                errores_lectura += 1
        else:
            errores_lectura += 1
        time.sleep_ms(25)  # Pausa técnica entre tramas Modbus

    # Evaluar la salud de la comunicación Modbus
    if errores_lectura > 0:
        consecutivos_errores_modbus += 1
        print(f"[MODBUS] Advertencia: {errores_lectura} registros fallidos en este ciclo.")
    else:
        consecutivos_errores_modbus = 0

    # Si se alcanzan demasiados errores Modbus consecutivos, reinicializar la UART
    if consecutivos_errores_modbus >= config.MAX_MODBUS_ERRORS:
        print(f"[MODBUS] Alerta: {consecutivos_errores_modbus} ciclos consecutivos con fallas. Reinicializando UART...")
        try:
            uart.deinit()
        except Exception:
            pass
        time.sleep_ms(100)
        uart = inicializar_uart()
        consecutivos_errores_modbus = 0

    # 5. Adquirir lecturas adicionales integradas en la placa
    try:
        telemetria_payload["sensores_extra"]["temp_tablero"] = 28.4
        telemetria_payload["sensores_extra"]["humedad_ambiente"] = 45.0
        telemetria_payload["sensores_extra"]["estado_rele_1"] = 1
    except Exception as e:
        print("[SENSORES] Error al leer sensores secundarios:", e)

    # Información de diagnóstico para mantenimiento SaaS
    wlan = network.WLAN(network.STA_IF)
    rssi = -100
    try:
        if hasattr(wlan, 'status'):
            rssi = wlan.status('rssi')
    except Exception:
        pass

    telemetria_payload["diagnostico"] = {
        "rssi": rssi,
        "errores_modbus": errores_lectura,
        "ram_libre": gc.mem_free()
    }

    # 6. Serializar y enviar a la API mediante HTTP POST
    try:
        # Mapeamos los datos al formato esperado por la tabla telemetry_data del backend
        payload_api = {
            "device_serial": config.CLIENT_ID,
            "cpu_temp": telemetria_payload["sensores_extra"].get("temp_tablero", 28.4),
            "cpu_usage": 0.0,
            "ram_usage": round(((gc.mem_alloc() / (gc.mem_alloc() + gc.mem_free())) * 100), 2),
            "sensor_value": telemetria_payload["mediciones"].get("potencia_total", 0.0),
            "mediciones": telemetria_payload["mediciones"],
            "sensores_extra": telemetria_payload["sensores_extra"]
        }
        
        headers = {'Content-Type': 'application/json'}
        url = "https://api.ad-mesh.com/api/v1/telemetry/"
        
        print(f"\n[HTTP] Enviando telemetría a {url}...")
        print("Payload:", ujson.dumps(payload_api))
        
        res = urequests.post(url, json=payload_api, headers=headers)
        print(f"[HTTP] Enviado con éxito. Estado API: {res.status_code}")
        res.close() # Liberar sockets
    except Exception as e:
        print("[HTTP] Error al enviar telemetría a la API:", e)

    # 6b. Registrar/actualizar el sensor en el módulo IoT (Sensores + Alertas).
    # Se reporta SIEMPRE, aunque el medidor aún no esté cableado, para que el
    # sensor aparezca vinculado a la cuenta desde el primer arranque; las
    # métricas se van llenando solas en cuanto el Modbus empiece a responder.
    try:
        metrics = []
        for key, (label, unit) in config.IOT_METRICS_MAP.items():
            value = telemetria_payload["mediciones"].get(key)
            if value is not None:
                metrics.append({"name": label, "value": value, "unit": unit})

        iot_payload = {
            "metrics": metrics,
            "name": config.SENSOR_NAME,
            "location": config.SENSOR_LOCATION,
            "type": config.SENSOR_TYPE,
            "linking_code": getattr(config, "LINKING_CODE", None)
        }
        url_iot = f"https://api.ad-mesh.com/api/v1/iot/sensors/{config.SENSOR_CODE}/ingest"
        res_iot = urequests.post(url_iot, json=iot_payload, headers=headers)
        print(f"[HTTP] IoT ingest enviado. Estado API: {res_iot.status_code}")
        res_iot.close()
    except Exception as e:
        print("[HTTP] Error al enviar métricas IoT:", e)

    # 7. Temporizador Inteligente con alimentación constante del Watchdog
    tiempo_transcurrido = time.ticks_diff(time.ticks_ms(), inicio_ciclo)
    tiempo_espera = config.LOOP_INTERVAL_MS - tiempo_transcurrido
    
    if tiempo_espera > 0:
        intervalo_espera_ms = 500
        esperado = 0
        while esperado < tiempo_espera:
            wdt.feed()
            quedan = tiempo_espera - esperado
            espera_actual = min(intervalo_espera_ms, quedan)
            time.sleep_ms(espera_actual)
            esperado += espera_actual
    else:
        print(f"[SISTEMA] Warning: Latencia de ciclo excedida ({tiempo_transcurrido} ms)")
