import urequests
import config

def fetch_baud_rate(wdt=None):
    """
    Consulta a la API el baud rate configurado para el dispositivo.
    Retorna el baud rate como entero si se obtiene con éxito, de lo contrario None.
    """
    try:
        url = f"{config.API_BASE_URL}/devices/config/{config.DEVICE_SERIAL}"
        res = urequests.get(url, timeout=10)
        baud_rate = None
        if res.status_code == 200:
            data = res.json()
            server_baud = data.get("baud_rate")
            if server_baud:
                baud_rate = int(server_baud)
        res.close()
        if wdt:
            wdt.feed()
        return baud_rate
    except Exception as e:
        print("Error obteniendo baud rate de la API:", e)
        if wdt:
            wdt.feed()
        return None

def enviar_telemetria(mediciones, wdt=None):
    """
    Envía las mediciones a la API REST.
    Retorna True si el envío fue exitoso, de lo contrario False.
    """
    try:
        payload = {
            "device_serial": config.DEVICE_SERIAL,
            "mediciones": mediciones
        }
        url = f"{config.API_BASE_URL}/telemetry/"
        headers = {"Content-Type": "application/json"}
        
        res = urequests.post(url, json=payload, headers=headers, timeout=10)
        res.close()
        if wdt:
            wdt.feed()
        return True
    except Exception as e:
        print("Error de red al enviar telemetría:", e)
        if wdt:
            wdt.feed()
        return False
