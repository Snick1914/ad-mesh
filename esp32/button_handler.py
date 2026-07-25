import time
import os
from machine import Pin, reset
import config

# Botón de reseteo de credenciales WiFi (activo en bajo con PULL_UP)
btn = Pin(config.BUTTON_PIN, Pin.IN, Pin.PULL_UP)


def chequear_boton(wdt=None):
    """
    Monitorea el botón.
    Si se mantiene presionado 10 segundos, borra las credenciales WiFi
    guardadas y reinicia el dispositivo para entrar en modo AP de configuración.
    """
    if btn.value() == 0:
        print("\n[BOTÓN] Mantén presionado 10 s para borrar credenciales WiFi...")
        inicio = time.ticks_ms()
        ultimo_segundo = -1

        while btn.value() == 0:
            if wdt:
                wdt.feed()
            transcurrido_ms = time.ticks_diff(time.ticks_ms(), inicio)
            segundos = transcurrido_ms // 1000

            if segundos != ultimo_segundo:
                print(f"  {segundos}/10 s")
                ultimo_segundo = segundos

            if transcurrido_ms >= 10000:
                print("[BOTÓN] 10 s alcanzados → borrando WiFi y reiniciando...")
                try:
                    os.remove(config.CONFIG_FILE)
                except Exception:
                    pass
                time.sleep(1)
                reset()

            time.sleep_ms(100)

        print("[BOTÓN] Soltado antes de 10 s. Operación cancelada.")
