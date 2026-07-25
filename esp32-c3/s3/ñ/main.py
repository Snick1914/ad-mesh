import machine
import time
import network
import struct
import ujson
import urequests
import os

# Versión del firmware — se actualiza con cada OTA
CURRENT_VERSION = "1.0.0"


# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------
class Config:
    SUPABASE_URL  = "https://seooyurncyqfrzuzftty.supabase.co/rest/v1/temperature_logs"
    SUPABASE_BASE = "https://seooyurncyqfrzuzftty.supabase.co"
    SUPABASE_KEY  = "sb_publishable_9ZwBf-m76sHQToX6wM9qUQ_vEgDSc4I"
    HEADERS = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    # UUID de este dispositivo (regístralo en el panel Admin de tu app)
    DEVICE_ID = "980e6a05-6001-4824-a4ae-af1c21eb43ef"

    # Hardware RS485
    UART_ID   = 2
    BAUD      = 9600
    TX_PIN    = 17
    RX_PIN    = 16
    RE_DE_PIN = 4

    # Modbus
    ADAM_ID         = 1      # Dirección del ADAM-4018+ en el bus
    MODBUS_TIMEOUT  = 800    # ms esperando respuesta
    # Factor de conversión Engineering Units del ADAM-4018+
    # raw / 100.0 → °C  (confirmado: raw 4202 = 42.02°C)
    EU_FACTOR       = 100.0

    # Tiempos
    READ_INTERVAL_SEC    = 2     # Envío cada 2 segundos
    WDT_TIMEOUT_MS       = 30000
    OTA_CHECK_INTERVAL_S = 1800  # OTA cada 30 min


# ---------------------------------------------------------------------------
# OTA – Actualización remota del firmware
# ---------------------------------------------------------------------------
class OTAUpdater:
    def __init__(self):
        self._check_url = (
            Config.SUPABASE_BASE
            + "/rest/v1/firmware_updates"
            + "?device_id=eq." + Config.DEVICE_ID
            + "&select=version,url"
            + "&order=created_at.desc&limit=1"
        )
        self._headers = {
            "apikey": Config.SUPABASE_KEY,
            "Authorization": "Bearer " + Config.SUPABASE_KEY,
        }

    def check_and_update(self, wdt=None):
        print("OTA: Verificando (versión actual: {})...".format(CURRENT_VERSION))
        try:
            r      = urequests.get(self._check_url, headers=self._headers)
            status = r.status_code
            body   = r.text
            r.close()

            if status != 200:
                print("OTA: Error HTTP {}".format(status))
                return

            records = ujson.loads(body)
            if not records:
                print("OTA: Sin registros de firmware.")
                return

            latest  = records[0].get("version", "")
            url     = records[0].get("url", "")

            if latest == CURRENT_VERSION:
                print("OTA: Firmware al día ({}).".format(CURRENT_VERSION))
                return

            print("OTA: Nueva versión {} disponible.".format(latest))
            self._download_and_apply(url, latest, wdt)

        except Exception as e:
            print("OTA: Error en verificación:", e)

    def _download_and_apply(self, url, new_version, wdt=None):
        print("OTA: Descargando desde:", url)
        try:
            if wdt: wdt.feed()
            r       = urequests.get(url)
            status  = r.status_code
            content = r.text
            r.close()

            if status != 200:
                print("OTA: Error al descargar ({})".format(status))
                return

            if wdt: wdt.feed()

            with open("/main.py.new", "w") as f:
                f.write(content)

            try:
                os.rename("/main.py", "/main.py.bak")
            except Exception:
                pass

            os.rename("/main.py.new", "/main.py")
            print("OTA: v{} aplicada. Reiniciando en 3s...".format(new_version))
            time.sleep(3)
            machine.reset()

        except Exception as e:
            print("OTA: Error al aplicar:", e)
            try:
                files = os.listdir("/")
                if "main.py.bak" in files and "main.py" not in files:
                    os.rename("/main.py.bak", "/main.py")
                    print("OTA: Backup restaurado.")
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Gateway ADAM-4018+ – dos termopares en VIN0 y VIN1
# ---------------------------------------------------------------------------
class AdamThermocoupleGateway:
    def __init__(self):
        self.uart  = machine.UART(
            Config.UART_ID, baudrate=Config.BAUD,
            tx=Config.TX_PIN, rx=Config.RX_PIN,
            bits=8, parity=None, stop=1, timeout=50
        )
        self.re_de = machine.Pin(Config.RE_DE_PIN, machine.Pin.OUT)
        self.re_de.value(0)  # Iniciar en RX

        self.wdt  = machine.WDT(timeout=Config.WDT_TIMEOUT_MS)
        self.wlan = network.WLAN(network.STA_IF)
        self.ota  = OTAUpdater()

    # ------------------------------------------------------------------
    def _crc16(self, data):
        crc = 0xFFFF
        for pos in data:
            crc ^= pos
            for _ in range(8):
                if (crc & 1) != 0:
                    crc >>= 1
                    crc ^= 0xA001
                else:
                    crc >>= 1
        return struct.pack('<H', crc)

    # ------------------------------------------------------------------
    def leer_termopares(self):
        """
        Lee VIN0 y VIN1 en una sola trama Modbus FC04.
        Retorna (temp_vin0, temp_vin1) en °C, o (None, None) si falla.

        Trama enviada:  [ID, 0x04, 0x00, 0x00, 0x00, 0x02, CRC_L, CRC_H]
        Respuesta (9b): [ID, 0x04, 0x04, D0H, D0L, D1H, D1L, CRC_L, CRC_H]
        """
        peticion = bytearray([Config.ADAM_ID, 0x04, 0x00, 0x00, 0x00, 0x02])
        peticion += self._crc16(peticion)

        # Limpiar buffer de entrada
        while self.uart.any():
            self.uart.read()

        # Transmitir
        self.re_de.value(1)
        self.uart.write(peticion)
        time.sleep_ms(12)   # ~8 bytes a 9600 baud ≈ 8.3 ms
        self.re_de.value(0)

        # Esperar respuesta
        respuesta = b""
        start = time.ticks_ms()
        while time.ticks_diff(time.ticks_ms(), start) < Config.MODBUS_TIMEOUT:
            if self.uart.any():
                respuesta += self.uart.read()
                if len(respuesta) >= 9:
                    break
            time.sleep_ms(5)

        if len(respuesta) < 9:
            print("Modbus: Respuesta incompleta ({} bytes)".format(len(respuesta)))
            return None, None

        if respuesta[0] != Config.ADAM_ID or respuesta[1] != 0x04:
            print("Modbus: Trama inesperada: {}".format(respuesta[:4]))
            return None, None

        # Desempaquetar dos registros de 16 bits con signo
        raw0 = struct.unpack('>h', respuesta[3:5])[0]
        raw1 = struct.unpack('>h', respuesta[5:7])[0]

        # DEBUG: imprime raw para ajustar EU_FACTOR
        print("RAW VIN0={} VIN1={}  (÷{} → {:.2f}°C / {:.2f}°C)".format(
            raw0, raw1, Config.EU_FACTOR,
            raw0 / Config.EU_FACTOR, raw1 / Config.EU_FACTOR
        ))

        temp0 = raw0 / Config.EU_FACTOR
        temp1 = raw1 / Config.EU_FACTOR

        return temp0, temp1

    # ------------------------------------------------------------------
    def enviar_supabase(self, temp0, temp1):
        if not self.wlan.isconnected():
            return False

        payload = {
            "device_id": Config.DEVICE_ID,
            "temp1":     round(temp0, 2) if temp0 is not None else None,
            "temp2":     round(temp1, 2) if temp1 is not None else None,
            "kohms1":    None,  # No aplica para termopares
            "kohms2":    None,
        }

        try:
            print(">>> VIN0: {} °C | VIN1: {} °C".format(
                "{:.2f}".format(temp0) if temp0 is not None else "ERR",
                "{:.2f}".format(temp1) if temp1 is not None else "ERR",
            ))
            r  = urequests.post(Config.SUPABASE_URL, json=payload, headers=Config.HEADERS)
            ok = r.status_code < 300
            if not ok:
                print("Supabase error {}: {}".format(r.status_code, r.text))
            r.close()
            return ok
        except Exception as e:
            print("Error de red:", e)
            return False

    # ------------------------------------------------------------------
    def run(self):
        print("--- ADAM-4018+ Termopar Gateway v{} Iniciado ---".format(CURRENT_VERSION))

        # Esperar WiFi
        print("Esperando WiFi...")
        t = 0
        while not self.wlan.isconnected() and t < 30:
            self.wdt.feed()
            time.sleep(1)
            t += 1

        # OTA al arrancar
        if self.wlan.isconnected():
            self.ota.check_and_update(wdt=self.wdt)
        else:
            print("Sin WiFi, saltando OTA inicial.")

        last_ota = time.time()

        while True:
            self.wdt.feed()

            if not self.wlan.isconnected():
                print("WiFi offline...")
                time.sleep(5)
                continue

            # OTA periódica
            now = time.time()
            if now - last_ota >= Config.OTA_CHECK_INTERVAL_S:
                self.ota.check_and_update(wdt=self.wdt)
                last_ota = now

            # Leer ambos termopares
            temp0, temp1 = self.leer_termopares()

            if temp0 is None and temp1 is None:
                print("Error: ADAM-4018+ no responde o trama inválida.")
            else:
                self.enviar_supabase(temp0, temp1)

            for _ in range(Config.READ_INTERVAL_SEC):
                self.wdt.feed()
                time.sleep(1)


if __name__ == "__main__":
    gateway = AdamThermocoupleGateway()
    try:
        gateway.run()
    except Exception as e:
        print("REINICIO POR ERROR:", e)
        time.sleep(5)
        machine.reset()
