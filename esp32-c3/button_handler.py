import time
import os
from machine import Pin, reset
import config

# Configurar el botón de reseteo físico (Active Low con PULL_UP)
btn = Pin(config.BUTTON_PIN, Pin.IN, Pin.PULL_UP)

def chequear_boton(wdt=None):
    """Monitorea el botón. Si se mantiene presionado por 10s, borra credenciales y reinicia."""
    if btn.value() == 0:
        print("\n[BOTÓN DETECTADO] Mantén presionado durante 10 segundos para borrar WiFi...")
        inicio = time.ticks_ms()
        ultimo_segundo = -1
        
        while btn.value() == 0:
            if wdt:
                wdt.feed()  # Evitar reset del watchdog
            transcurrido_ms = time.ticks_diff(time.ticks_ms(), inicio)
            segundos = transcurrido_ms // 1000
            
            if segundos != ultimo_segundo:
                print(f"Segundos presionado: {segundos}/10")
                ultimo_segundo = segundos
                
            if transcurrido_ms >= 10000:
                print("¡Límite de 10 segundos alcanzado! Borrando configuración WiFi y reiniciando...")
                try:
                    os.remove(config.CONFIG_FILE)
                except Exception:
                    pass
                time.sleep(1)
                reset()
                
            time.sleep_ms(100)
            
        print("[BOTÓN SOLTADO] Cancelado.")
