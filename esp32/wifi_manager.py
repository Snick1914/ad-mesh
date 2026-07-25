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


def obtener_codigo_vinculacion():
    """Devuelve el código de vinculación almacenado, o None si no existe."""
    try:
        with open(config.CONFIG_FILE, "r") as f:
            data = ujson.load(f)
            return data.get("LINKING_CODE")
    except Exception:
        return None


def borrar_credenciales():
    """Elimina el archivo de configuración para forzar el modo AP al reiniciar."""
    try:
        os.remove(config.CONFIG_FILE)
        print("Credenciales WiFi borradas.")
    except Exception as e:
        print("No se pudo borrar la configuración:", e)


def esta_conectado():
    """Retorna True si la interfaz STA está conectada."""
    wlan = network.WLAN(network.STA_IF)
    return wlan.isconnected()


def conectar_wifi(wdt=None):
    """
    Conecta al WiFi usando credenciales guardadas.
    Si no hay credenciales, inicia el modo AP de configuración.
    """
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
        print("Fallo al activar WiFi:", e)

    # Desactivar ahorro de energía para mayor estabilidad
    try:
        wlan.config(pm=0)
    except Exception:
        try:
            wlan.config(pm=network.WLAN.PM_NONE)
        except Exception:
            pass

    if not ssid:
        print("Sin credenciales → iniciando modo AP...")
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
        timeout = 25
        while not wlan.isconnected() and timeout > 0:
            if wdt:
                wdt.feed()
            button_handler.chequear_boton(wdt)
            time.sleep(1)
            timeout -= 1
            print(f".({wlan.status()})", end="")

    if wlan.isconnected():
        print("\n¡WiFi Conectado!")
        print("IP:", wlan.ifconfig()[0])
        if wdt:
            wdt.feed()
        return True
    else:
        print(f"\nError de conexión WiFi. Status: {wlan.status()}")
        iniciar_modo_ap(wdt)
        return False


def iniciar_modo_ap(wdt=None):
    """
    Levanta un Access Point y el servidor de configuración web para
    que el usuario introduzca las credenciales WiFi.
    """
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    ap.config(essid=config.AP_SSID, authmode=network.AUTH_OPEN)
    time.sleep_ms(500)

    print(f"\nAccess Point levantado: {config.AP_SSID}")
    print("Conéctate y abre http://192.168.4.1 para configurar el WiFi.")

    portal.iniciar_servidor_configuracion(wdt)
