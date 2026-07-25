import sys
import time
from machine import reset

try:
    import main_app  # Ejecuta main_app.main() a nivel de módulo (ver main_app.py)
except Exception as e:
    print("\n[MAIN CRÍTICO] Fallo al importar/ejecutar main_app:")
    sys.print_exception(e)
    print("Reiniciando en 5 segundos...")
    time.sleep(5)
    reset()
