import network
import time
import ujson
import os
import config
import portal
import button_handler

def obtener_credenciales():
    """Carga las credenciales guardadas en wifi_config.json."""
    try:
        with open(config.CONFIG_FILE, "r") as f:
            data = ujson.load(f)
            ssid = data.get("SSID")
            password = data.get("PASSWORD")
            if ssid:
                return ssid, password
    except Exception:
        pass
    return None, None

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

    # Desactivar el modo de ahorro de energía (Power Management) para máxima estabilidad de conexión
    try:
        wlan.config(pm=0)  # 0 es PM_NONE en la mayoría de firmwares de MicroPython
    except Exception:
        try:
            wlan.config(pm=network.WLAN.PM_NONE)
        except Exception:
            pass

    # Si no hay SSID configurado o es el default y no queremos esperar si fue reseteado,
    # pero para ser seguros: si no hay SSID, iniciamos AP directamente.
    if not ssid:
        print("No se encontraron credenciales. Iniciando Access Point directamente...")
        iniciar_modo_ap(wdt)
        return False

    if not wlan.isconnected():
        print(f"Conectando a WiFi SSID: {ssid}...")
        try:
            wlan.disconnect()
            time.sleep_ms(200)
        except Exception:
            pass
            
        wlan.connect(ssid, password)
        
        # Esperar conexión alimentando el watchdog y chequeando el botón
        timeout = 25
        while not wlan.isconnected() and timeout > 0:
            if wdt:
                wdt.feed()  # Alimentar Watchdog
            button_handler.chequear_boton(wdt)  # Chequear el botón de reset inmediatamente
            time.sleep(1)
            timeout -= 1
            # Imprimir estado de la conexión para depuración
            status = wlan.status()
            print(f".({status})", end="")
            
    if wlan.isconnected():
        print("\n¡WiFi Conectado!")
        print("IP:", wlan.ifconfig()[0])
        if wdt:
            wdt.feed()
        return True
    else:
        print(f"\nError al conectar a WiFi. Último status: {wlan.status()}")
        # Activar punto de acceso y servidor de configuración
        iniciar_modo_ap(wdt)
        return False

def iniciar_modo_ap(wdt=None):
    """Activa el modo Access Point y lanza el servidor web de configuración."""
    print("\nIniciando Access Point para configuración...")
    
    # Desactivar STA para evitar conflictos de radio en modo configuración
    wlan_sta = network.WLAN(network.STA_IF)
    try:
        wlan_sta.active(False)
    except Exception:
        pass
        
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    
    # Configurar IP estática para el AP
    try:
        ap.ifconfig(('192.168.4.1', '255.255.255.0', '192.168.4.1', '8.8.8.8'))
    except Exception as e:
        print("Error configurando ifconfig del AP:", e)

    # Configurar una red abierta para el portal de configuración (compatible con diferentes versiones de MicroPython)
    try:
        # Intentar con el parámetro moderno 'security'
        ap.config(essid=config.AP_SSID, security=0)
    except Exception:
        try:
            # Fallback al parámetro antiguo 'authmode' o usar constants
            ap.config(essid=config.AP_SSID, authmode=0)
        except Exception as e:
            print("Error configurando parámetros del AP:", e)
            # Intentar configurar solo el essid si falla lo demás
            try:
                ap.config(essid=config.AP_SSID)
            except Exception as e2:
                print("Fallo crítico al configurar AP ESSID:", e2)
    
    print(f"Punto de acceso listo: '{config.AP_SSID}'")
    print("IP del servidor: 192.168.4.1")
    
    # Iniciar servidor web de configuración (bloqueante hasta recibir datos válidos)
    portal.iniciar_servidor_configuracion(wdt)

def esta_conectado():
    """Retorna si el dispositivo está actualmente conectado a la red WiFi."""
    wlan = network.WLAN(network.STA_IF)
    return wlan.isconnected()

def obtener_codigo_vinculacion():
    """Carga el código de vinculación guardado en wifi_config.json."""
    try:
        with open(config.CONFIG_FILE, "r") as f:
            data = ujson.load(f)
            return data.get("LINKING_CODE")
    except Exception:
        pass
    return None
