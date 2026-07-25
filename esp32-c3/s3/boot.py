import micropython
import time
import os
from machine import Pin

_BOOT_ATTEMPTS_FILE = "boot_attempts.txt"
_MAX_BOOT_ATTEMPTS = 3  # Reinicios consecutivos sin llegar al bucle principal antes de entrar en modo seguro
_BUTTON_PIN = 7         # Mismo pin que config.BUTTON_PIN (no se importa config.py aquí para no arriesgar otro import fallido)

# LED de estado: amarillo apenas arranca. Import protegido -- si algo falla
# aquí (ej. NeoPixel no disponible), el arranque debe continuar igual.
try:
    import led
    led.set_estado(led.COLOR_INICIANDO)
except Exception as e:
    print("[BOOT WARN] No se pudo inicializar el LED:", e)
    led = None


def _leer_intentos():
    try:
        with open(_BOOT_ATTEMPTS_FILE, "r") as f:
            return int(f.read().strip())
    except Exception:
        return 0


def _guardar_intentos(n):
    try:
        with open(_BOOT_ATTEMPTS_FILE, "w") as f:
            f.write(str(n))
    except Exception:
        pass


def _borrar_intentos():
    try:
        os.remove(_BOOT_ATTEMPTS_FILE)
    except Exception:
        pass


_modo_seguro = False

# --- Botón físico presionado durante el arranque -> forzar modo seguro ---
try:
    _btn = Pin(_BUTTON_PIN, Pin.IN, Pin.PULL_UP)
    time.sleep_ms(50)  # Estabilizar lectura del pin
    if _btn.value() == 0:
        print("\n[BOOT] Botón presionado durante el arranque -> MODO SEGURO (main.py no se ejecutará)")
        _modo_seguro = True
except Exception as e:
    print("[BOOT WARN] No se pudo leer el pin del botón:", e)

# --- Protección contra bucle de reinicios silenciosos (ej. watchdog resets antes de imprimir nada útil) ---
if not _modo_seguro:
    intentos = _leer_intentos()
    if intentos >= _MAX_BOOT_ATTEMPTS:
        print(f"\n[BOOT] {intentos} reinicios consecutivos sin llegar al bucle principal.")
        print("[BOOT] Entrando en MODO SEGURO para evitar un bucle infinito de reinicios.")
        _modo_seguro = True
    else:
        _guardar_intentos(intentos + 1)

if _modo_seguro:
    _borrar_intentos()
    if led:
        led.set_estado(led.COLOR_MODO_SEGURO)
    # Mantener Ctrl+C habilitado en modo seguro para poder usar el REPL con normalidad
    micropython.kbd_intr(3)
    print("[BOOT] MODO SEGURO activo.")
    print("[BOOT] main.py NO se ejecutará automáticamente esta vez.")
    print("[BOOT] Usa el REPL para depurar (ej: import wifi_manager) y luego machine.reset() para reintentar.")
    # Truco estándar de MicroPython: SystemExit en boot.py detiene la
    # secuencia de arranque antes de ejecutar main.py y deja el REPL abierto.
    import sys
    sys.exit()
else:
    # Deshabilitar Ctrl+C en consola USB/serial durante operación normal
    micropython.kbd_intr(-1)
