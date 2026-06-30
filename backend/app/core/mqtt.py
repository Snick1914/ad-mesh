import asyncio
import json
import logging
import os
from gmqtt import Client as MQTTClient
from app.db.session import SessionLocal
from app.modules.telemetry.models import TelemetryData

logger = logging.getLogger(__name__)

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_CLIENT_ID = "ad_mesh_backend_subscriber"

class MQTTService:
    def __init__(self):
        self.client = None
        self._running = False

    def on_connect(self, client, flags, rc, properties):
        logger.info("[MQTT] Connected successfully to broker.")
        client.subscribe("devices/+/telemetry", qos=1)

    def on_message(self, client, topic, payload, qos, properties):
        try:
            parts = topic.split('/')
            if len(parts) >= 2:
                device_serial = parts[1]
                data = json.loads(payload.decode('utf-8'))
                
                db = SessionLocal()
                try:
                    telemetry_log = TelemetryData(
                        device_serial=device_serial,
                        cpu_temp=data.get("cpu_temp"),
                        cpu_usage=data.get("cpu_usage"),
                        ram_usage=data.get("ram_usage"),
                        sensor_value=data.get("sensor_value")
                    )
                    db.add(telemetry_log)
                    db.commit()
                    logger.info(f"[MQTT] Ingested telemetry for device {device_serial}")
                except Exception as db_err:
                    logger.error(f"[MQTT] DB write error: {db_err}")
                finally:
                    db.close()
        except Exception as e:
            logger.error(f"[MQTT] Error handling message: {e}")

    def on_disconnect(self, client, packet, exc):
        logger.warning("[MQTT] Disconnected from broker.")

    async def start(self):
        if self._running:
            return
        self._running = True
        
        self.client = MQTTClient(MQTT_CLIENT_ID)
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        
        retry = 5
        while retry > 0:
            try:
                await self.client.connect(MQTT_HOST, port=MQTT_PORT)
                logger.info("[MQTT] Client task started and connected.")
                break
            except Exception as connect_err:
                logger.error(f"[MQTT] Connection failed: {connect_err}. Retrying in 5 seconds...")
                await asyncio.sleep(5)
                retry -= 1

    async def stop(self):
        if self.client and self.client.is_connected:
            await self.client.disconnect()
        self._running = False

mqtt_service = MQTTService()
