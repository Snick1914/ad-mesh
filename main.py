import gc
import time
import struct
import ujson
import ntptime
from machine import UART, Pin, WDT, reset
import network
from umqtt.simple import MQTTClient
import config

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

class SocketProxy:
    def __init__(self, sock):
        self._sock = sock
    def connect(self, addr):
        self._sock.connect(addr)
        if config.MQTT_PORT == 443:
            import ussl
            self._sock = ussl.wrap_socket(self._sock, server_hostname=config.MQTT_BROKER)
        from ws_socket import WebSocketClientSocket
        self._sock = WebSocketClientSocket(self._sock, config.MQTT_BROKER, path=config.MQTT_WS_PATH)
    def write(self, data):
        return self._sock.write(data)
    def read(self, size):
        return self._sock.read(size)
    def send(self, data):
        return self._sock.send(data)
    def recv(self, size):
        return self._sock.recv(size)
    def close(self):
        return self._sock.close()
    def setblocking(self, flag):
        return self._sock.setblocking(flag)

def asegurar_mqtt(client):
    """Establece o verifica la conexión con el broker MQTT"""
    if client is not None:
        try:
            # Enviar ping MQTT para verificar si la sesión sigue activa
            client.ping()
            return client
        except Exception:
            print("[MQTT] Broker desconectado. Forzando reconexión...")
            try:
                client.disconnect()
            except Exception:
                pass
            client = None

    # Intentar reconectar si la referencia es nula o se perdió la conexión
    if client is None:
        try:
            wdt.feed()
            print(f"[MQTT] Conectando a {config.MQTT_BROKER}...")
            
            usocket_patched = False
            import usocket
            orig_socket = usocket.socket
            if getattr(config, "MQTT_USE_WS", False):
                usocket.socket = lambda *a, **k: SocketProxy(orig_socket(*a, **k))
                usocket_patched = True
            
            try:
                client = MQTTClient(
                    client_id=config.CLIENT_ID,
                    server=config.MQTT_BROKER,
                    port=config.MQTT_PORT,
                    user=config.MQTT_USER,
                    password=config.MQTT_PASS,
                    keepalive=config.MQTT_KEEPALIVE
                )
                client.connect()
            finally:
                if usocket_patched:
                    usocket.socket = orig_socket
                    
            print("[MQTT] ¡Conexión con Broker establecida!")
            return client
        except Exception as e:
            print("[MQTT] Error al intentar conectar al Broker:", e)
            return None
    return client

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
    
    # Enviar consulta
    uart.write(payload)
    
    # Esperar respuesta con timeout sin bloquear la CPU
    inicio = time.ticks_ms()
    while not uart.any():
        if time.ticks_diff(time.ticks_ms(), inicio) > config.TIMEOUT_MS:
            return None
        time.sleep_ms(5)
        
    # Tiempo mínimo de asentamiento de la trama Modbus RTU
    time.sleep_ms(15)
    respuesta = uart.read()
    
    # Validación básica de tamaño y protocolo
    if respuesta is None or len(respuesta) < 9:
        return None
    if respuesta[0] != config.SLAVE_ID or respuesta[1] != 0x04:
        return None
        
    # Retorna solo los 4 bytes correspondientes a los datos leídos
    return respuesta[3:7]

# ============================================================================
# BUCLE DE EJECUCIÓN INDUSTRIAL
# ============================================================================

mqtt_client = None
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

    mqtt_client = asegurar_mqtt(mqtt_client)
    if mqtt_client is None:
        print("[SISTEMA] Error de conexión MQTT. Reintentando en la siguiente iteración...")
        time.sleep(2)
        continue

    # 3. Estructuración del JSON Payload
    # Nota: timestamp local Unix (sincronizado vía NTP si la red está disponible)
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
        # Aquí puedes añadir código I2C, OneWire, ADC, etc.
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

    # 6. Serializar a JSON y publicar por MQTT
    try:
        mensaje_json = ujson.dumps(telemetria_payload)
        print(f"\n[MQTT] Publicando en '{config.TOPIC_TELEMETRIA.decode('utf-8')}':")
        print(mensaje_json)
        
        mqtt_client.publish(config.TOPIC_TELEMETRIA, mensaje_json)
    except Exception as e:
        print("[MQTT] Fallo al publicar. Forzando reconexión en el siguiente ciclo:", e)
        mqtt_client = None  # Esto disparará reconexión limpia en el siguiente ciclo

    # 7. Temporizador Inteligente con alimentación constante del Watchdog
    tiempo_transcurrido = time.ticks_diff(time.ticks_ms(), inicio_ciclo)
    tiempo_espera = config.LOOP_INTERVAL_MS - tiempo_transcurrido
    
    if tiempo_espera > 0:
        # Esperar en pequeños intervalos para mantener el WDT alimentado
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
