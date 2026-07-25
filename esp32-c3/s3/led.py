from machine import Pin
import config

try:
    import neopixel
    HAS_NEOPIXEL = True
except ImportError:
    HAS_NEOPIXEL = False

_np = None
if HAS_NEOPIXEL:
    try:
        _np = neopixel.NeoPixel(Pin(config.RGB_PIN), 1)
    except Exception as e:
        print("[RGB WARN] No se pudo inicializar NeoPixel:", e)

# Colores de estado (valores bajos a propósito para no encandilar)
COLOR_INICIANDO = (30, 20, 0)      # Amarillo: arrancando / boot.py
COLOR_CONECTANDO = (0, 0, 40)      # Azul: intentando conectar WiFi (STA)
COLOR_PORTAL = (30, 0, 40)         # Violeta: portal cautivo activo (modo AP)
COLOR_OK = (0, 35, 0)              # Verde: funcionamiento normal / WiFi y Modbus OK
COLOR_ERROR = (40, 0, 0)           # Rojo: error Modbus / fallo crítico
COLOR_RECONECTANDO = (35, 10, 0)   # Naranja: WiFi perdido, reconectando
COLOR_MODO_SEGURO = (30, 0, 20)    # Magenta tenue: modo seguro de boot.py
COLOR_APAGADO = (0, 0, 0)


def set_color(r, g, b):
    """Ajusta el LED a un color RGB explícito (0-255 cada canal)."""
    if _np:
        try:
            _np[0] = (r, g, b)
            _np.write()
        except Exception:
            pass


def set_estado(color_tuple):
    """Ajusta el LED a partir de una de las tuplas COLOR_* de este módulo."""
    set_color(*color_tuple)
