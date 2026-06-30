# boot.py -- se ejecuta al arrancar el dispositivo
import gc
import network
import time
import config

# Ejecutar el recolector de basura al inicio para limpiar RAM
gc.collect()

def conectar_wifi():
    """Establece conexión Wi-Fi persistente"""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if not wlan.isconnected():
        print(f"[WIFI] Conectando a SSID: {config.WIFI_SSID}...")
        wlan.connect(config.WIFI_SSID, config.WIFI_PASS)
        
        # Bucle de espera sin bloqueo permanente, limitado por config
        intentos = 0
        max_intentos = config.WIFI_TIMEOUT_SEGUNDOS * 2  # Intervalos de 0.5s
        while not wlan.isconnected() and intentos < max_intentos:
            time.sleep(0.5)
            intentos += 1
            
    if wlan.isconnected():
        print(f"[WIFI] ¡Conexión exitosa! IP local: {wlan.ifconfig()[0]}")
        return True
    else:
        print("[WIFI] Error: No se pudo conectar a la red Wi-Fi configurada.")
        return False

# Intentar la primera conexión durante el arranque
conectar_wifi()
