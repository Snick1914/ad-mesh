import network

import time

import machine



# Datos de tu red en DYA

SSID = "WireShapes"

PASS = "WireSh@pes_2025#?"



def do_connect():

    wlan = network.WLAN(network.STA_IF)

    wlan.active(True)

    if not wlan.isconnected():

        print('Buscando red...')

        wlan.connect(SSID, PASS)

        

        # Intento de conexión por 15 segundos

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



# Ejecutar la conexión

do_connect()
