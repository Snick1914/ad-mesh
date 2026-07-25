import time
import gc
import sys
from machine import UART, WDT, reset

import config
import wifi_manager
import modbus_client
import api_client
import button_handler

# ---------------------------------------------------------------------------
# Watchdog Timer – reinicia el dispositivo si el bucle se congela > 30 s
# ---------------------------------------------------------------------------
wdt = WDT(timeout=30000)
wdt.feed()


def main():
    print("=== AD-Mesh Telemetría – ESP32 30 pines ===")

    # Chequeo de botón al inicio (por si arranca con el botón presionado)
    button_handler.chequear_boton(wdt)

    # 1. Conectar WiFi
    wifi_manager.conectar_wifi(wdt)

    # Heartbeat inicial para registrar/vincular el dispositivo
    api_client.enviar_heartbeat(wdt)

    # 2. Obtener baud rate desde la API (o usar el valor por defecto)
    baud_rate = config.DEFAULT_BAUD_RATE
    server_baud = api_client.fetch_baud_rate(wdt)
    if server_baud:
        baud_rate = server_baud
        print(f"Baud rate del servidor: {baud_rate}")
    else:
        print(f"Baud rate por defecto: {baud_rate}")

    # 3. Inicializar UART — igual que el firmware que funciona con el TTL:
    #    pines como enteros directos, sin objetos Pin(), sin timeout en el constructor
    uart_id = getattr(config, "UART_ID", 2)
    uart = UART(
        uart_id,
        baudrate=baud_rate,
        tx=config.TX_PIN,
        rx=config.RX_PIN,
        bits=8,
        parity=None,
        stop=1
    )
    print(f"UART{uart_id} inicializado – TX=GPIO{config.TX_PIN}, RX=GPIO{config.RX_PIN}, {baud_rate} bps")

    # 4. Bucle principal de telemetría
    while True:
        wdt.feed()
        button_handler.chequear_boton(wdt)
        gc.collect()

        # --- Leer Modbus ---
        func_code = getattr(config, "FUNCTION_CODE", 3)
        success, result = modbus_client.leer_modbus(
            uart, config.SLAVE_ID, 0, 2, wdt, function_code=func_code
        )
        mediciones = {}
        if success:
            eu_factor = getattr(config, "EU_FACTOR", 100.0)
            mediciones["temp1"]            = result[0] / eu_factor
            mediciones["temp2"]            = result[1] / eu_factor
            mediciones["sensor_temperatura"] = result[0] / eu_factor  # compatibilidad backend
            mediciones["sensor_humedad"]     = result[1] / eu_factor  # compatibilidad backend
            mediciones["modbus_status"]    = "OK"
            print(f">>> Temp1: {mediciones['temp1']:.2f} °C | Temp2: {mediciones['temp2']:.2f} °C")
        else:
            mediciones["modbus_status"] = "ERROR"
            mediciones["error_msg"]     = result
            print(f"Error Modbus: {result}")

        # --- Asegurar WiFi ---
        if not wifi_manager.esta_conectado():
            print("WiFi perdido, reconectando...")
            wifi_manager.conectar_wifi(wdt)
            api_client.enviar_heartbeat(wdt)

        # --- Enviar telemetría ---
        if wifi_manager.esta_conectado():
            api_client.enviar_telemetria(mediciones, wdt)
            if success:
                api_client.enviar_iot_metrics(mediciones, wdt)
            api_client.enviar_heartbeat(wdt)
        else:
            print("Sin WiFi – telemetría no enviada.")

        # Pausa de 10 s alimentando el WDT y monitoreando el botón cada 100 ms
        for _ in range(100):
            button_handler.chequear_boton(wdt)
            time.sleep_ms(100)
            wdt.feed()


# En el ESP32, main.py importa este módulo; la llamada a main() aquí
# garantiza la ejecución tanto en import como en run directo.
try:
    main()
except Exception as e:
    print("ERROR CRÍTICO:")
    sys.print_exception(e)
    time.sleep(5)
    reset()
