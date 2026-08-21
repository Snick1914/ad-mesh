import machine
import time
import network
import struct
import ujson
import urequests
import os

# Versión del firmware actual — se actualiza con cada OTA exitosa
CURRENT_VERSION = "1.0.0"

# --- CONFIGURACIÓN BACKEND AD-MESH ---
class Config:
    DOMAIN         = "api.ad-mesh.com"
    BASE_URL       = "https://" + DOMAIN + "/api/v1"
    LINKING_CODE   = "USR-PA3XONWC"
    HEADERS        = {"Content-Type": "application/json"}
    
    # Serial identificador del dispositivo
    wlan_temp = network.WLAN(network.STA_IF)
    wlan_temp.active(True)
    mac_bytes = wlan_temp.config('mac')
    DEVICE_SERIAL = "ESP32S3_" + "".join(["{:02X}".format(b) for b in mac_bytes])

    # Hardware MDWR2048 / ESP32
    UART_ID   = 2
    BAUD      = 9600
    TX_PIN    = 17
    RX_PIN    = 16
    RE_DE_PIN = 4

    # Tiempos
    MODBUS_TIMEOUT_MS    = 500
    READ_INTERVAL_SEC    = 1
    SEND_INTERVAL_SEC    = 5
    WDT_TIMEOUT_MS       = 60000
    OTA_CHECK_INTERVAL_S = 600  # Chequear OTA cada 10 minutos


class OTAUpdater:
    def __init__(self, device_serial):
        self.device_serial = device_serial
        self.config_url    = Config.BASE_URL + "/iot/sensors/config/" + device_serial

    def check_and_update(self, wdt=None):
        print("OTA: Verificando en backend (versión actual: {})...".format(CURRENT_VERSION))
        try:
            r = urequests.get(self.config_url, headers=Config.HEADERS)
            status = r.status_code
            body   = r.text
            r.close()

            if status != 200:
                print("OTA: Error HTTP en config ({})".format(status))
                return

            data = ujson.loads(body)
            ota_version = data.get("ota_version", "")
            ota_url     = data.get("ota_url", "")

            if not ota_version or ota_version == CURRENT_VERSION or not ota_url:
                print("OTA: Firmware al día (v{}).".format(CURRENT_VERSION))
                return

            # Si ota_url es relativa, completar con HTTP (sin SSL pesado para OTA en MicroPython)
            if ota_url.startswith("/"):
                full_ota_url = "http://" + Config.DOMAIN + "/api/v1" + ota_url
            else:
                full_ota_url = ota_url

            print("OTA: Nueva versión detectada: {} -> {}".format(CURRENT_VERSION, ota_version))
            self._download_and_apply(full_ota_url, ota_version, wdt)

        except OSError as e:
            if e.args and e.args[0] == -202:
                print("OTA: Memoria RAM/SSL insuficiente (-202). Omitiendo verificación OTA.")
            else:
                print("OTA: Error de red/socket:", e)
        except Exception as e:
            print("OTA: Error en proceso de verificación:", e)

    def _download_and_apply(self, url, new_version, wdt=None):
        print("OTA: Descargando actualización desde:", url)
        try:
            if wdt:
                wdt.feed()

            r = urequests.get(url)
            status  = r.status_code
            content = r.text
            r.close()

            if status != 200:
                print("OTA: Error al descargar archivo OTA ({})".format(status))
                return

            if wdt:
                wdt.feed()

            # Escribir primero en archivo temporal para asegurar descarga completa
            with open("/main_gateway.py.new", "w") as f:
                f.write(content)

            print("OTA: {} bytes descargados. Aplicando...".format(len(content)))

            # Crear backup de la versión anterior
            try:
                os.rename("/main_gateway.py", "/main_gateway.py.bak")
            except Exception:
                pass

            os.rename("/main_gateway.py.new", "/main_gateway.py")

            print("OTA: v{} aplicada con éxito. Reiniciando en 3s...".format(new_version))
            time.sleep(3)
            machine.reset()

        except Exception as e:
            print("OTA: Error al aplicar actualización:", e)
            try:
                files = os.listdir("/")
                if "main_gateway.py.bak" in files and "main_gateway.py" not in files:
                    os.rename("/main_gateway.py.bak", "/main_gateway.py")
                    print("OTA: Backup restaurado.")
            except Exception:
                pass


class IndustrialGateway:
    def __init__(self):
        self.uart = machine.UART(
            Config.UART_ID, baudrate=Config.BAUD,
            tx=Config.TX_PIN, rx=Config.RX_PIN,
            bits=8, parity=None, stop=1, timeout=200
        )
        self.re_de = machine.Pin(Config.RE_DE_PIN, machine.Pin.OUT)
        self.re_de.value(0)

        try:
            self.wdt = machine.WDT(timeout=Config.WDT_TIMEOUT_MS)
        except Exception:
            self.wdt = None

        self.wlan = network.WLAN(network.STA_IF)
        self.ingest_url = Config.BASE_URL + "/iot/sensors/" + Config.DEVICE_SERIAL + "/ingest"
        self.ota        = OTAUpdater(Config.DEVICE_SERIAL)

    def feed_wdt(self):
        if self.wdt:
            self.wdt.feed()

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

    def read_meter_register(self, slave_id, addr, retries=2):
        peticion  = struct.pack('>BBHH', slave_id, 4, addr, 2)
        peticion += self._crc16(peticion)

        for intento in range(retries + 1):
            self.feed_wdt()
            try:
                while self.uart.any():
                    self.uart.read()

                self.re_de.value(1)
                self.uart.write(peticion)
                time.sleep_ms(12)
                self.re_de.value(0)

                start = time.ticks_ms()
                res   = b""
                while time.ticks_diff(time.ticks_ms(), start) < Config.MODBUS_TIMEOUT_MS:
                    if self.uart.any():
                        res += self.uart.read()
                        if len(res) >= 9:
                            break
                    time.sleep_ms(2)

                if len(res) >= 9 and res[0] == slave_id and res[1] == 4:
                    return struct.unpack('>f', res[3:7])[0]

            except Exception as e:
                print("Error Modbus:", e)

            time.sleep_ms(20)
        return None

    def send_to_backend(self, payload):
        if not self.wlan.isconnected():
            print("WiFi no conectado. Omitiendo envío.")
            return False
        try:
            r = urequests.post(self.ingest_url, json=payload, headers=Config.HEADERS)
            print("Backend Response Code:", r.status_code)
            if r.status_code >= 400:
                print("Backend Error Body:", r.text)
            r.close()
            return r.status_code in (200, 201)
        except Exception as e:
            print("Error envío HTTP:", e)
            return False

    def process_buffer(self, buffer):
        if not buffer:
            return None

        count = len(buffer)
        last  = buffer[-1]

        avg_fields = [
            ("voltaje", "V"), ("v2", "V"), ("v3", "V"),
            ("corriente", "A"), ("a2", "A"), ("a3", "A"),
            ("p1", "W"), ("p2", "W"), ("p3", "W"), ("potencia", "W"),
            ("total_va", "VA"), ("thd_v1", "%"), ("thd_v2", "%"),
            ("thd_v3", "%"), ("thd_a1", "%"), ("thd_a2", "%"),
            ("thd_a3", "%"), ("frecuencia", "Hz"), ("pf", "")
        ]

        metrics = [
            {"name": "modbus_status", "value": 1.0 if last.get("v1") is not None else 0.0, "unit": "status"},
            {"name": "energia_total", "value": round(last.get("energia_total", 0.0), 2), "unit": "kWh"},
            {"name": "e1", "value": round(last.get("e1", 0.0), 2), "unit": "kWh"},
            {"name": "e2", "value": round(last.get("e2", 0.0), 2), "unit": "kWh"},
            {"name": "e3", "value": round(last.get("e3", 0.0), 2), "unit": "kWh"},
            {"name": "demand_max", "value": round(last.get("demand_max", 0.0), 2), "unit": "VA"}
        ]

        for field, unit in avg_fields:
            if buffer:
                total = sum(entry.get(field, 0) for entry in buffer)
                val = round(total / count, 2)
            else:
                val = 0.0
            metrics.append({
                "name": field,
                "value": val,
                "unit": unit
            })

        payload = {
            "metrics": metrics,
            "linking_code": Config.LINKING_CODE,
            "type": "electrical",
            "name": "Medidor Casa Ley"
        }

        return payload

    def run(self):
        print("=== Gateway Industrial -> ad-mesh.com (v{}) ===".format(CURRENT_VERSION))
        print("Device Serial:", Config.DEVICE_SERIAL)
        print("Linking Code: ", Config.LINKING_CODE)
        print("Ingest URL:   ", self.ingest_url)
        readings_buffer = []
        last_ota_check  = time.ticks_ms()

        # Chequeo OTA inicial al arrancar
        self.ota.check_and_update(self.wdt)

        while True:
            self.feed_wdt()

            # Verificación periódica de OTA (cada OTA_CHECK_INTERVAL_S)
            now = time.ticks_ms()
            if time.ticks_diff(now, last_ota_check) > (Config.OTA_CHECK_INTERVAL_S * 1000):
                self.ota.check_and_update(self.wdt)
                last_ota_check = time.ticks_ms()

            v1 = self.read_meter_register(1, 0)
            v2 = self.read_meter_register(1, 2)
            v3 = self.read_meter_register(1, 4)

            a1 = self.read_meter_register(1, 6)
            a2 = self.read_meter_register(1, 8)
            a3 = self.read_meter_register(1, 10)

            p1    = self.read_meter_register(1, 12)
            p2    = self.read_meter_register(1, 14)
            p3    = self.read_meter_register(1, 16)
            p_tot = self.read_meter_register(1, 52)
            va_tot = self.read_meter_register(1, 56)
            d_max  = self.read_meter_register(1, 210)

            thdv1 = self.read_meter_register(1, 276)
            thdv2 = self.read_meter_register(1, 278)
            thdv3 = self.read_meter_register(1, 280)
            thda1 = self.read_meter_register(1, 282)
            thda2 = self.read_meter_register(1, 284)
            thda3 = self.read_meter_register(1, 286)

            f  = self.read_meter_register(1, 70)
            pf = self.read_meter_register(1, 62)
            e  = self.read_meter_register(1, 72)

            e1 = self.read_meter_register(1, 346)
            e2 = self.read_meter_register(1, 348)
            e3 = self.read_meter_register(1, 350)

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
                print("Captura ({}/{}): V1:{:.1f}V | P_Tot:{:.0f}W".format(
                    len(readings_buffer),
                    Config.SEND_INTERVAL_SEC // Config.READ_INTERVAL_SEC,
                    v1,
                    p_tot if p_tot is not None else 0.0
                ))
            else:
                print("Falla: Medidor no responde.")

            if len(readings_buffer) >= (Config.SEND_INTERVAL_SEC // Config.READ_INTERVAL_SEC):
                payload = self.process_buffer(readings_buffer)
                if payload:
                    print(">>> Enviando a ad-mesh.com -> Endpoint:", self.ingest_url)
                    if self.send_to_backend(payload):
                        readings_buffer = []
            elif not readings_buffer:
                # Si el medidor no respondió, enviar estado de modbus fallido
                fallback_payload = {
                    "metrics": [
                        {"name": "modbus_status", "value": 0.0, "unit": "status"},
                        {"name": "voltaje", "value": 0.0, "unit": "V"},
                        {"name": "corriente", "value": 0.0, "unit": "A"},
                        {"name": "potencia", "value": 0.0, "unit": "W"},
                        {"name": "frecuencia", "value": 0.0, "unit": "Hz"},
                        {"name": "pf", "value": 0.0, "unit": ""},
                        {"name": "energia_total", "value": 0.0, "unit": "kWh"}
                    ],
                    "linking_code": Config.LINKING_CODE,
                    "type": "electrical",
                    "name": "Medidor Casa Ley"
                }
                self.send_to_backend(fallback_payload)

            for _ in range(Config.READ_INTERVAL_SEC * 10):
                self.feed_wdt()
                time.sleep_ms(100)


if __name__ == "__main__":
    gateway = IndustrialGateway()
    try:
        gateway.run()
    except Exception as e:
        print("REINICIO POR ERROR:", e)
        time.sleep(5)
        machine.reset()
