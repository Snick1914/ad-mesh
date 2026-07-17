import network
import time
import ujson
import os
import config
import portal
import button_handler

def obtener_credenciales():
    """Carga las credenciales guardadas en wifi_config.json o usa las de config.py como fallback."""
    try:
        with open(config.CONFIG_FILE, "r") as f:
            data = ujson.load(f)
            ssid = data.get("SSID")
            password = data.get("PASSWORD")
            if ssid:
                return ssid, password
    except Exception:
        pass
    return config.SSID, config.PASSWORD

def borrar_credenciales():
    """Elimina el archivo de configuración para forzar el modo AP al reiniciar."""
    try:
        os.remove(config.CONFIG_FILE)
        print("Credenciales de WiFi borradas con éxito.")
    except Exception as e:
        print("No se pudo borrar el archivo de configuración:", e)

def conectar_wifi(wdt=None):
    """Inicializa la conexión WiFi usando credenciales guardadas o por defecto."""
    ssid, password = obtener_credenciales()
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
        print(f"Conectando a WiFi SSID: {ssid}...")
        wlan.connect(ssid, password)
        
        # Esperar conexión alimentando el watchdog y chequeando el botón
        timeout = 20
        while not wlan.isconnected() and timeout > 0:
            if wdt:
                wdt.feed()  # Alimentar Watchdog
            button_handler.chequear_boton(wdt)  # Chequear el botón de reset inmediatamente
            time.sleep(1)
            timeout -= 1
            print(".", end="")
            
    if wlan.isconnected():
        print("\n¡WiFi Conectado!")
        print("IP:", wlan.ifconfig()[0])
        if wdt:
            wdt.feed()
        return True
    else:
        print("\nError al conectar a WiFi.")
        # Activar punto de acceso y servidor de configuración
        iniciar_modo_ap(wdt)
        return False

def iniciar_modo_ap(wdt=None):
    """Activa el modo Access Point y lanza el servidor web de configuración."""
    print("\nIniciando Access Point para configuración...")
    
    # Desactivar STA si estuviera activa
    wlan_sta = network.WLAN(network.STA_IF)
    try:
        wlan_sta.active(False)
    except Exception:
        pass
        
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    # Configurar una red abierta para el portal de configuración
    ap.config(essid=config.AP_SSID, authmode=0) # authmode=0 significa red abierta (AUTH_OPEN)
    
    print(f"Punto de acceso listo: '{config.AP_SSID}'")
    print("IP del servidor: 192.168.4.1")
    
    # Iniciar servidor web de configuración (bloqueante hasta recibir datos válidos)
    portal.iniciar_servidor_configuracion(wdt)

def esta_conectado():
    """Retorna si el dispositivo está actualmente conectado a la red WiFi."""
    wlan = network.WLAN(network.STA_IF)
    return wlan.isconnected()
