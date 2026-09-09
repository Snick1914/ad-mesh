import datetime
from sqlalchemy.orm import Session
from app.core.timezone import now_local
from app.modules.iot.models import IotSensor, AlertRule, FiredAlert
from app.modules.iot.schemas import IotSensorCreate, AlertRuleCreate, SensorMetric

ALERT_COOLDOWN_SECONDS = 15
_last_fired: dict[int, datetime.datetime] = {}  # rule_id -> last fired timestamp


def _eval_condition(value: float, condition: str, threshold: float) -> bool:
    if condition == "gt":
        return value > threshold
    if condition == "lt":
        return value < threshold
    if condition == "gte":
        return value >= threshold
    if condition == "lte":
        return value <= threshold
    return False


class IotService:
    def __init__(self, db: Session):
        self.db = db

    # ── Sensors ────────────────────────────────────────
    def get_user_sensors(self, user_id: int) -> list[IotSensor]:
        return self.db.query(IotSensor).filter(IotSensor.user_id == user_id).order_by(IotSensor.id).all()

    def get_by_code(self, sensor_code: str) -> IotSensor:
        return self.db.query(IotSensor).filter(IotSensor.sensor_code == sensor_code).first()

    def get_by_id(self, sensor_id: int) -> IotSensor:
        return self.db.query(IotSensor).filter(IotSensor.id == sensor_id).first()

    def create_sensor(self, user_id: int, data: IotSensorCreate) -> tuple[bool, str, IotSensor]:
        if self.get_by_code(data.sensor_code):
            return False, "Ya existe un sensor con ese código.", None
        sensor = IotSensor(
            sensor_code=data.sensor_code.upper(),
            name=data.name,
            location=data.location,
            type=data.type,
            status="online",
            user_id=user_id,
            last_seen=now_local(),
            metrics=[m.model_dump() for m in data.metrics] if data.metrics else [],
            send_interval_seconds=data.send_interval_seconds if data.send_interval_seconds is not None else 300,
            baud_rate=data.baud_rate if data.baud_rate is not None else 9600,
            alert_email=data.alert_email
        )
        self.db.add(sensor)
        self.db.commit()
        self.db.refresh(sensor)
        return True, "Sensor vinculado con éxito.", sensor

    def update_sensor_config(
        self, 
        sensor_id: int, 
        user_id: int, 
        send_interval_seconds: int, 
        baud_rate: int = None, 
        type: str = None, 
        temperature_unit: str = None,
        alert_email: str = None
    ) -> tuple[bool, str, IotSensor]:
        sensor = self.get_by_id(sensor_id)
        if not sensor or sensor.user_id != user_id:
            return False, "Sensor no encontrado o sin permisos.", None
        sensor.send_interval_seconds = send_interval_seconds
        if baud_rate is not None:
            sensor.baud_rate = baud_rate
        if type is not None:
            sensor.type = type
        if temperature_unit is not None:
            sensor.temperature_unit = temperature_unit
        if alert_email is not None:
            sensor.alert_email = alert_email.strip() if alert_email.strip() else None
        self.db.add(sensor)
        self.db.commit()
        self.db.refresh(sensor)
        return True, "Configuración actualizada con éxito.", sensor

    def delete_sensor(self, sensor_id: int, user_id: int) -> bool:
        sensor = self.get_by_id(sensor_id)
        if not sensor or sensor.user_id != user_id:
            return False
        self.db.delete(sensor)
        self.db.commit()
        return True

    # ── Alert rules ────────────────────────────────────
    def get_user_rules(self, user_id: int) -> list[AlertRule]:
        return self.db.query(AlertRule).filter(AlertRule.user_id == user_id).order_by(AlertRule.id).all()

    def create_rule(self, user_id: int, data: AlertRuleCreate) -> tuple[bool, str, AlertRule]:
        sensor = self.get_by_id(data.sensor_id)
        if not sensor or sensor.user_id != user_id:
            return False, "Sensor no encontrado o sin permisos.", None
        rule = AlertRule(
            user_id=user_id,
            sensor_id=data.sensor_id,
            metric_name=data.metric_name,
            condition=data.condition,
            threshold=data.threshold,
            severity=data.severity,
            enabled=True
        )
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return True, "Regla creada con éxito.", rule

    def toggle_rule(self, rule_id: int, user_id: int) -> tuple[bool, str, AlertRule]:
        rule = self.db.query(AlertRule).filter(AlertRule.id == rule_id).first()
        if not rule or rule.user_id != user_id:
            return False, "Regla no encontrada o sin permisos.", None
        rule.enabled = not rule.enabled
        self.db.add(rule)
        self.db.commit()
        self.db.refresh(rule)
        return True, "Regla actualizada.", rule

    def delete_rule(self, rule_id: int, user_id: int) -> bool:
        rule = self.db.query(AlertRule).filter(AlertRule.id == rule_id).first()
        if not rule or rule.user_id != user_id:
            return False
        self.db.delete(rule)
        self.db.commit()
        return True

    # ── Fired alerts ───────────────────────────────────
    def get_user_alerts(self, user_id: int, limit: int = 50) -> list[FiredAlert]:
        return self.db.query(FiredAlert)\
            .filter(FiredAlert.user_id == user_id)\
            .order_by(FiredAlert.fired_at.desc())\
            .limit(limit).all()

    # ── Ingest + evaluation engine ─────────────────────
    def ingest_metrics(
        self,
        sensor_code: str,
        metrics: list[SensorMetric],
        linking_code: str = None,
        name: str = None,
        location: str = None,
        type: str = None
    ) -> tuple[IotSensor, list[FiredAlert]]:
        """
        Recibe lecturas de un sensor físico (sin auth, llamado por el ESP32/dispositivo IoT).
        Si el sensor no existe, lo crea. Si trae linking_code, lo vincula a la cuenta del
        usuario dueño de ese código (mismo mecanismo que el emparejamiento de pantallas).
        Actualiza estado, evalúa reglas de alerta activas, y persiste alertas disparadas.
        """
        sensor = self.get_by_code(sensor_code)

        db_user = None
        if linking_code:
            from app.models.user import User
            db_user = self.db.query(User).filter(User.linking_code == linking_code).first()

        if not sensor:
            sensor = IotSensor(
                sensor_code=sensor_code.upper(),
                name=name or f"Sensor {sensor_code[-4:]}",
                location=location,
                type=type or "environmental",
                status="online",
                user_id=db_user.id if db_user else None,
                last_seen=now_local(),
                metrics=[]
            )
            self.db.add(sensor)
        elif db_user and not sensor.user_id:
            # Auto-vincular si aún no tenía dueño y llega un código de vinculación válido
            sensor.user_id = db_user.id

        sensor.metrics = [m.model_dump() for m in metrics]
        sensor.status = "online"
        sensor.last_seen = now_local()
        self.db.add(sensor)
        self.db.commit()
        self.db.refresh(sensor)

        fired: list[FiredAlert] = []
        if sensor.user_id:
            rules = self.db.query(AlertRule).filter(
                AlertRule.sensor_id == sensor.id,
                AlertRule.enabled == True
            ).all()
            now = now_local()
            metric_map = {m.name: m for m in metrics}

            for rule in rules:
                metric = metric_map.get(rule.metric_name)
                if not metric:
                    continue
                if not _eval_condition(metric.value, rule.condition, rule.threshold):
                    continue
                last = _last_fired.get(rule.id)
                if last and (now - last).total_seconds() < ALERT_COOLDOWN_SECONDS:
                    continue
                _last_fired[rule.id] = now

                alert = FiredAlert(
                    rule_id=rule.id,
                    sensor_id=sensor.id,
                    user_id=sensor.user_id,
                    metric_name=rule.metric_name,
                    current_value=metric.value,
                    unit=metric.unit,
                    threshold=rule.threshold,
                    condition=rule.condition,
                    severity=rule.severity,
                    fired_at=now
                )
                self.db.add(alert)
                fired.append(alert)

            if fired:
                self.db.commit()
                for a in fired:
                    self.db.refresh(a)

        return sensor, fired
