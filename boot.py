import network
import time
import machine

SSID = "WireShapes"
PASS = "WireSh@pes_2025#?"

def do_connect():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    time.sleep_ms(300)

    if not wlan.isconnected():
        print('Buscando red...')
        for _ in range(3):
            try:
                wlan.connect(SSID, PASS)
                break
            except OSError:
                time.sleep_ms(500)

        timeout = 0
        while not wlan.isconnected() and timeout < 15:
            print('Esperando WiFi...')
            time.sleep(1)
            timeout += 1

    if wlan.isconnected():
        print('¡CONECTADO!')
        print('Configuración IP:', wlan.ifconfig())
    else:
        print('Error: No se pudo conectar al WiFi.')

do_connect()
