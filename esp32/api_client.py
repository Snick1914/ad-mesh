import urequests
import config


def fetch_baud_rate(wdt=None):
    """
    Consulta a la API el baud rate configurado para el dispositivo.
    Retorna el baud rate como entero si tiene éxito, None en caso contrario.
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
    Envía las mediciones al backend REST de AD-Mesh.
    Retorna True si el envío fue exitoso, False en caso contrario.
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


def enviar_iot_metrics(mediciones, wdt=None):
    """
    Envía las lecturas al módulo IoT (Sensores + Alertas) del backend.
    Si el sensor no existe aún, se auto-registra y se vincula a la cuenta
    dueña del código de vinculación guardado en el ESP32.
    """
    try:
        import wifi_manager
        linking_code = wifi_manager.obtener_codigo_vinculacion()

        metrics = []
        metrics_map = getattr(config, "IOT_METRICS_MAP", {})
        for key, (label, unit) in metrics_map.items():
            value = mediciones.get(key)
            if value is not None:
                metrics.append({"name": label, "value": value, "unit": unit})

        if not metrics:
            return False

        payload = {
            "metrics": metrics,
            "name": getattr(config, "SENSOR_NAME", config.DEVICE_SERIAL),
            "location": getattr(config, "SENSOR_LOCATION", None),
            "type": getattr(config, "SENSOR_TYPE", "environmental"),
        }
        if linking_code:
            payload["linking_code"] = linking_code

        sensor_code = getattr(config, "SENSOR_CODE", config.DEVICE_SERIAL)
        url = f"{config.API_BASE_URL}/iot/sensors/{sensor_code}/ingest"
        headers = {"Content-Type": "application/json"}
        res = urequests.post(url, json=payload, headers=headers, timeout=10)
        res.close()
        if wdt:
            wdt.feed()
        return True
    except Exception as e:
        print("Error enviando métricas IoT:", e)
        if wdt:
            wdt.feed()
        return False


def enviar_heartbeat(wdt=None):
    """
    Envía un latido de vida al backend y registra/vincula el dispositivo.
    """
    try:
        import wifi_manager
        import network
        linking_code = wifi_manager.obtener_codigo_vinculacion()

        payload = {
            "ip_address": "127.0.0.1",
            "storage_used_gb": 0.0,
            "status": "online"
        }
        if linking_code:
            payload["linking_code"] = linking_code

        wlan = network.WLAN(network.STA_IF)
        if wlan.isconnected():
            payload["ip_address"] = wlan.ifconfig()[0]

        url = f"{config.API_BASE_URL}/devices/{config.DEVICE_SERIAL}/heartbeat"
        headers = {"Content-Type": "application/json"}
        res = urequests.post(url, json=payload, headers=headers, timeout=10)
        res.close()
        if wdt:
            wdt.feed()
        return True
    except Exception as e:
        print("Error enviando heartbeat de dispositivo:", e)
        if wdt:
            wdt.feed()
        return False
