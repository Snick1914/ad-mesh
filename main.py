import machine
import time
import network
import struct
import ujson
import urequests
import os

# Versión del firmware — se actualiza con cada OTA
CURRENT_VERSION = "1.0.0"

# --- CONFIGURACIÓN ESTRUCTURADA ---
class Config:
    SUPABASE_URL  = "https://seooyurncyqfrzuzftty.supabase.co/rest/v1/telemetry_logs"
    SUPABASE_BASE = "https://seooyurncyqfrzuzftty.supabase.co"
    SUPABASE_KEY  = "sb_publishable_9ZwBf-m76sHQToX6wM9qUQ_vEgDSc4I"
    HEADERS = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    DEVICE_ID = "f9625d16-1f64-4393-a2a5-0173e4c66fa2"

    # Hardware MDWR2048
    UART_ID   = 2
    BAUD      = 9600
    TX_PIN    = 17
    RX_PIN    = 16
    RE_DE_PIN = 4

    # Tiempos
    MODBUS_TIMEOUT_MS    = 500
    READ_INTERVAL_SEC    = 1
    SEND_INTERVAL_SEC    = 1
    WDT_TIMEOUT_MS       = 60000
    OTA_CHECK_INTERVAL_S = 1800   # Verificar OTA cada 30 minutos


# ---------------------------------------------------------------------------
# OTA – Actualización remota del firmware
# ---------------------------------------------------------------------------
class OTAUpdater:
    """
    Consulta Supabase por la tabla `firmware_updates`:
      - device_id TEXT
      - version   TEXT   (ej: "1.1.0")
      - url       TEXT   (URL pública con el nuevo main.py)
      - created_at TIMESTAMPTZ DEFAULT now()

    Si la versión remota difiere de CURRENT_VERSION, descarga y aplica.
    """

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

    # ------------------------------------------------------------------
    def check_and_update(self, wdt=None):
        print("OTA: Verificando (versión actual: {})...".format(CURRENT_VERSION))
        try:
            r = urequests.get(self._check_url, headers=self._headers)
            status = r.status_code
            body   = r.text
            r.close()

            if status != 200:
                print("OTA: Error HTTP {}".format(status))
                return

            records = ujson.loads(body)
            if not records:
                print("OTA: Sin registros de firmware en Supabase.")
                return

            latest_version = records[0].get("version", "")
            firmware_url   = records[0].get("url", "")

            if latest_version == CURRENT_VERSION:
                print("OTA: Firmware al día ({}).".format(CURRENT_VERSION))
                return

            print("OTA: Nueva versión disponible: {} → {}".format(
                CURRENT_VERSION, latest_version))
            self._download_and_apply(firmware_url, latest_version, wdt)

        except Exception as e:
            print("OTA: Error en verificación:", e)

    # ------------------------------------------------------------------
    def _download_and_apply(self, url, new_version, wdt=None):
        print("OTA: Descargando firmware desde:", url)
        try:
            if wdt:
                wdt.feed()

            r = urequests.get(url)
            status  = r.status_code
            content = r.text
            r.close()

            if status != 200:
                print("OTA: Error al descargar ({})".format(status))
                return

            if wdt:
                wdt.feed()

            # Escribir en archivo temporal primero (atómico)
            with open("/main.py.new", "w") as f:
                f.write(content)

            print("OTA: {} bytes descargados. Aplicando...".format(len(content)))

            # Backup del firmware actual
            try:
                os.rename("/main.py", "/main.py.bak")
            except Exception:
                pass

            os.rename("/main.py.new", "/main.py")

            print("OTA: v{} aplicada correctamente. Reiniciando en 3s...".format(new_version))
            time.sleep(3)
            machine.reset()

        except Exception as e:
            print("OTA: Error al aplicar:", e)
            # Intentar restaurar backup
            try:
                files = os.listdir("/")
                if "main.py.bak" in files and "main.py" not in files:
                    os.rename("/main.py.bak", "/main.py")
                    print("OTA: Backup restaurado.")
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Gateway industrial
# ---------------------------------------------------------------------------
class IndustrialGateway:
    def __init__(self):
        self.uart = machine.UART(
            Config.UART_ID, baudrate=Config.BAUD,
            tx=Config.TX_PIN, rx=Config.RX_PIN,
            bits=8, parity=None, stop=1, timeout=200
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
    def read_meter_register(self, slave_id, addr, retries=2):
        peticion  = struct.pack('>BBHH', slave_id, 4, addr, 2)
        peticion += self._crc16(peticion)

        for intento in range(retries + 1):
            try:
                while self.uart.any():
                    self.uart.read()

                self.re_de.value(1)   # TX
                self.uart.write(peticion)
                time.sleep_ms(12)
                self.re_de.value(0)   # RX

                start = time.ticks_ms()
                res   = b""
                while time.ticks_diff(time.ticks_ms(), start) < Config.MODBUS_TIMEOUT_MS:
                    if self.uart.any():
                        res += self.uart.read()
                        if len(res) >= 9:
                            break

                if len(res) >= 9 and res[0] == slave_id and res[1] == 4:
                    return struct.unpack('>f', res[3:7])[0]

            except Exception as e:
                print("Error Modbus (Intento {}): {}".format(intento, e))

            time.sleep_ms(100)
        return None

    # ------------------------------------------------------------------
    def send_to_supabase(self, payload):
        if not self.wlan.isconnected():
            return False
        try:
            r = urequests.post(Config.SUPABASE_URL, json=payload, headers=Config.HEADERS)
            print("Supabase Response:", r.status_code)
            if r.status_code >= 400:
                print("Supabase Error Body:", r.text)
            r.close()
            return r.status_code < 300
        except Exception as e:
            print("Error de conexión Supabase:", e)
            return False

    # ------------------------------------------------------------------
    def process_buffer(self, buffer):
        if not buffer:
            return None

        count = len(buffer)
        last  = buffer[-1]

        avg_fields = [
            "voltaje", "v2", "v3", "corriente", "a2", "a3",
            "p1", "p2", "p3", "potencia", "total_va",
            "thd_v1", "thd_v2", "thd_v3", "thd_a1", "thd_a2", "thd_a3",
            "frecuencia", "pf"
        ]

        result = {
            "device_id":    Config.DEVICE_ID,
            "energia_total": last["energia_total"],
            "e1":           last["e1"],
            "e2":           last["e2"],
            "e3":           last["e3"],
            "demand_max":   last["demand_max"],
        }

        for field in avg_fields:
            total = sum(entry.get(field, 0) for entry in buffer)
            if "corriente" in field or field.startswith("a"):
                result[field] = round(total / count, 3)
            else:
                result[field] = round(total / count, 2)

        return result

    # ------------------------------------------------------------------
    def run(self):
        print("--- MDWR2048 Gateway v{} Iniciado ---".format(CURRENT_VERSION))

        # Esperar WiFi antes de cualquier acción remota
        print("Esperando conexión WiFi...")
        wifi_wait = 0
        while not self.wlan.isconnected() and wifi_wait < 30:
            self.wdt.feed()
            time.sleep(1)
            wifi_wait += 1

        # Verificar OTA al arrancar
        if self.wlan.isconnected():
            self.ota.check_and_update(wdt=self.wdt)
        else:
            print("OTA: Sin WiFi, saltando verificación inicial.")

        readings_buffer  = []
        last_ota_check_s = time.time()

        while True:
            self.wdt.feed()

            if not self.wlan.isconnected():
                print("WiFi offline...")
                time.sleep(5)
                continue

            # Verificación periódica de OTA
            now = time.time()
            if now - last_ota_check_s >= Config.OTA_CHECK_INTERVAL_S:
                self.ota.check_and_update(wdt=self.wdt)
                last_ota_check_s = now

            # Lectura de parámetros trifásicos X96-5
            v1 = self.read_meter_register(1, 0)
            v2 = self.read_meter_register(1, 2)
            v3 = self.read_meter_register(1, 4)
            time.sleep_ms(15)

            a1 = self.read_meter_register(1, 6)
            a2 = self.read_meter_register(1, 8)
            a3 = self.read_meter_register(1, 10)
            time.sleep_ms(15)

            p1    = self.read_meter_register(1, 12)
            p2    = self.read_meter_register(1, 14)
            p3    = self.read_meter_register(1, 16)
            p_tot = self.read_meter_register(1, 52)
            va_tot = self.read_meter_register(1, 56)
            d_max  = self.read_meter_register(1, 210)
            time.sleep_ms(15)

            thdv1 = self.read_meter_register(1, 276)
            thdv2 = self.read_meter_register(1, 278)
            thdv3 = self.read_meter_register(1, 280)
            thda1 = self.read_meter_register(1, 282)
            thda2 = self.read_meter_register(1, 284)
            thda3 = self.read_meter_register(1, 286)
            time.sleep_ms(15)

            f  = self.read_meter_register(1, 70)
            pf = self.read_meter_register(1, 62)
            e  = self.read_meter_register(1, 72)

            e1 = self.read_meter_register(1, 346)
            e2 = self.read_meter_register(1, 348)
            e3 = self.read_meter_register(1, 350)
            time.sleep_ms(15)

            if v1 is not None:
                current_reading = {
                    "voltaje":    v1,
                    "v2":         v2    if v2    is not None else 0.0,
                    "v3":         v3    if v3    is not None else 0.0,
                    "corriente":  a1    if a1    is not None else 0.0,
                    "a2":         a2    if a2    is not None else 0.0,
                    "a3":         a3    if a3    is not None else 0.0,
                    "p1":         p1    if p1    is not None else 0.0,
                    "p2":         p2    if p2    is not None else 0.0,
                    "p3":         p3    if p3    is not None else 0.0,
                    "potencia":   p_tot  if p_tot  is not None else 0.0,
                    "total_va":   va_tot if va_tot is not None else 0.0,
                    "demand_max": d_max  if d_max  is not None else 0.0,
                    "thd_v1":     thdv1  if thdv1  is not None else 0.0,
                    "thd_v2":     thdv2  if thdv2  is not None else 0.0,
                    "thd_v3":     thdv3  if thdv3  is not None else 0.0,
                    "thd_a1":     thda1  if thda1  is not None else 0.0,
                    "thd_a2":     thda2  if thda2  is not None else 0.0,
                    "thd_a3":     thda3  if thda3  is not None else 0.0,
                    "frecuencia": f      if f      is not None else 60.0,
                    "pf":         pf     if pf     is not None else 1.0,
                    "energia_total": e   if e      is not None else 0.0,
                    "e1":         e1    if e1    is not None else 0.0,
                    "e2":         e2    if e2    is not None else 0.0,
                    "e3":         e3    if e3    is not None else 0.0,
                }
                readings_buffer.append(current_reading)

                if len(readings_buffer) > 50:
                    readings_buffer.pop(0)

                print("Captura ({}/{}): V1:{:.1f}V V2:{:.1f}V V3:{:.1f}V | P1:{:.0f}W P2:{:.0f}W P3:{:.0f}W | E_Tot:{:.1f}kWh".format(
                    len(readings_buffer),
                    Config.SEND_INTERVAL_SEC // Config.READ_INTERVAL_SEC,
                    v1,
                    v2 if v2 is not None else 0.0,
                    v3 if v3 is not None else 0.0,
                    p1 if p1 is not None else 0.0,
                    p2 if p2 is not None else 0.0,
                    p3 if p3 is not None else 0.0,
                    e  if e  is not None else 0.0,
                ))
            else:
                print("Falla: Medidor no responde.")

            if len(readings_buffer) >= (Config.SEND_INTERVAL_SEC // Config.READ_INTERVAL_SEC):
                print("Procesando buffer de envíos...")
                payload = self.process_buffer(readings_buffer)
                if payload:
                    print(">>> Enviando Promedio: P1:{:.0f}W P2:{:.0f}W P3:{:.0f}W | P_Tot:{:.0f}W | E_Tot:{:.2f}kWh".format(
                        payload['p1'], payload['p2'], payload['p3'],
                        payload['potencia'], payload['energia_total'],
                    ))
                    if self.send_to_supabase(payload):
                        readings_buffer = []
                    else:
                        print("Error al enviar, se mantiene el buffer.")

            print("Esperando {} segundos para la próxima lectura...".format(Config.READ_INTERVAL_SEC))
            for _ in range(Config.READ_INTERVAL_SEC):
                self.wdt.feed()
                time.sleep(1)


if __name__ == "__main__":
    gateway = IndustrialGateway()
    try:
        gateway.run()
    except Exception as e:
        print("REINICIO POR ERROR:", e)
        time.sleep(5)
        machine.reset()
