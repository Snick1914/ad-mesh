import time
import gc
from machine import UART, WDT, Pin, reset

import config
import wifi_manager
import modbus_client
import api_client

# Inicializar Watchdog Timer (30 segundos para evitar bloqueos permanentes)
wdt = WDT(timeout=30000)

# Configurar el botón de reseteo físico (Active Low con PULL_UP por defecto)
btn = Pin(config.BUTTON_PIN, Pin.IN, Pin.PULL_UP)

def chequear_boton():
    """Monitorea el botón. Si se mantiene presionado por 10s, borra credenciales y reinicia."""
    if btn.value() == 0:
        print("\n[BOTÓN DETECTADO] Mantén presionado durante 10 segundos para borrar WiFi...")
        inicio = time.ticks_ms()
        ultimo_segundo = -1
        
        while btn.value() == 0:
            wdt.feed()  # Evitar reset de watchdog mientras se mantiene pulsado
            transcurrido_ms = time.ticks_diff(time.ticks_ms(), inicio)
            segundos = transcurrido_ms // 1000
            
            if segundos != ultimo_segundo:
                print(f"Segundos presionado: {segundos}/10")
                ultimo_segundo = segundos
                
            if transcurrido_ms >= 10000:
                print("¡Límite de 10 segundos alcanzado! Borrando configuración WiFi y reiniciando...")
                wifi_manager.borrar_credenciales()
                time.sleep(1)
                reset()
                
            time.sleep_ms(100)
            
        print("[BOTÓN SOLTADO] Cancelado.")

def main():
    print("Iniciando servicio de telemetría en producción...")
    
    # Chequeo inicial del botón por si se arranca con el botón presionado
    chequear_boton()
    
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
        
    # 3. Inicializar UART usando objetos Pin y .init() (evita bugs de mapeo en ESP32-S3)
    from machine import Pin
    uart_id = getattr(config, "UART_ID", 1)
    uart = UART(uart_id, baudrate=baud_rate)
    uart.init(tx=Pin(config.TX_PIN), rx=Pin(config.RX_PIN), baudrate=baud_rate, bits=8, parity=None, stop=1, timeout=50)
    print(f"UART Modbus ({uart_id}) inicializado en pines TX={config.TX_PIN}, RX={config.RX_PIN} a {baud_rate} bps")
    
    while True:
        wdt.feed()  # Alimentar Watchdog al inicio de cada ciclo
        
        # Monitorear botón
        chequear_boton()
        
        # Liberar memoria fragmentada antes de operaciones pesadas
        gc.collect()
        
        # 1. Leer Modbus
        func_code = getattr(config, "FUNCTION_CODE", 3)
        success, result = modbus_client.leer_modbus(uart, config.SLAVE_ID, 0, 2, wdt, function_code=func_code)
        mediciones = {}
        if success:
            eu_factor = getattr(config, "EU_FACTOR", 10.0)
            mediciones["temp1"] = result[0] / eu_factor
            mediciones["temp2"] = result[1] / eu_factor
            # Claves adicionales por compatibilidad con el backend previo
            mediciones["sensor_temperatura"] = result[0] / eu_factor
            mediciones["sensor_humedad"] = result[1] / eu_factor
            mediciones["modbus_status"] = "OK"
            print(f">>> VIN0/Temp1: {mediciones['temp1']} °C | VIN1/Temp2: {mediciones['temp2']} °C")
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
            chequear_boton()
            time.sleep_ms(100)
            wdt.feed()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR CRÍTICO NO CONTROLADO:", e)
        time.sleep(5)
        reset()  # Reiniciar el microcontrolador si el servicio falla por completo
