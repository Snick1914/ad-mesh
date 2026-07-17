import time
import gc
from machine import UART, WDT, reset

import config
import wifi_manager
import modbus_client
import api_client
import button_handler

# Inicializar Watchdog Timer (30 segundos para evitar bloqueos permanentes)
wdt = WDT(timeout=30000)

def main():
    print("Iniciando servicio de telemetría en producción...")
    
    # Chequeo inicial del botón por si se arranca con el botón presionado
    button_handler.chequear_boton(wdt)
    
    # 1. Conectar a la red
    wifi_manager.conectar_wifi(wdt)
    
    # 2. Pedir configuración de baud rate de la API
    baud_rate = config.DEFAULT_BAUD_RATE
    server_baud = api_client.fetch_baud_rate(wdt)
    if server_baud:
        baud_rate = server_baud
        print(f"Baud rate obtenido del servidor: {baud_rate}")
    else:
        print(f"Usando baud rate por defecto: {baud_rate}")
        
    # 3. Inicializar UART
    uart = UART(1, baudrate=baud_rate, tx=config.TX_PIN, rx=config.RX_PIN, bits=8, parity=None, stop=1)
    print(f"UART Modbus inicializado a {baud_rate} bps")
    
    while True:
        wdt.feed()  # Alimentar Watchdog al inicio de cada ciclo
        
        # Monitorear botón
        button_handler.chequear_boton(wdt)
        
        # Liberar memoria fragmentada antes de operaciones pesadas
        gc.collect()
        
        # 1. Leer Modbus
        success, result = modbus_client.leer_modbus(uart, config.SLAVE_ID, 0, 2, wdt)
        mediciones = {}
        if success:
            mediciones["sensor_temperatura"] = result[0] / 10.0
            mediciones["sensor_humedad"] = result[1] / 10.0
            mediciones["modbus_status"] = "OK"
        else:
            mediciones["modbus_status"] = "ERROR"
            mediciones["error_msg"] = result
            print(f"Error Modbus: {result}")

        # 2. Asegurar conexión WiFi
        if not wifi_manager.esta_conectado():
            print("WiFi perdido, reconectando...")
            wifi_manager.conectar_wifi(wdt)

        # 3. Enviar a la Base de Datos
        if wifi_manager.esta_conectado():
            api_client.enviar_telemetria(mediciones, wdt)
        else:
            print("No se pudo enviar telemetría por falta de WiFi.")

        # Pausa dividida en pasos cortos monitoreando el botón y alimentando el WDT
        for _ in range(100):
            button_handler.chequear_boton(wdt)
            time.sleep_ms(100)
            wdt.feed()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR CRÍTICO NO CONTROLADO:", e)
        time.sleep(5)
        reset()  # Reiniciar el microcontrolador si el servicio falla por completo
