from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.models.user import User
from app.modules.iot.schemas import (
    IotSensorOut, IotSensorCreate, SensorIngest,
    AlertRuleOut, AlertRuleCreate, FiredAlertOut
)
from app.modules.iot.services.iot_service import IotService

router = APIRouter()


class IotConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws is not websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def broadcast(self, user_id: int, message: dict):
        for ws in list(self.active_connections.get(user_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(user_id, ws)


manager = IotConnectionManager()


async def _get_ws_user(websocket: WebSocket, db: Session) -> User | None:
    token = websocket.query_params.get("token")
    if not token:
        return None
    from jose import jwt, JWTError
    from app.core import security
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        return user
    except JWTError:
        return None


@router.websocket("/ws")
async def iot_websocket(websocket: WebSocket, db: Session = Depends(deps.get_db)):
    user = await _get_ws_user(websocket, db)
    if not user:
        await websocket.close(code=4401)
        return
    await manager.connect(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)


# ── Sensors ────────────────────────────────────────────
@router.get("/sensors", response_model=List[IotSensorOut])
def list_sensors(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return IotService(db).get_user_sensors(current_user.id)


@router.post("/sensors", response_model=IotSensorOut)
def create_sensor(
    payload: IotSensorCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    service = IotService(db)
    success, message, sensor = service.create_sensor(current_user.id, payload)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return sensor


@router.delete("/sensors/{sensor_id}")
def delete_sensor(
    sensor_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    service = IotService(db)
    if not service.delete_sensor(sensor_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sensor no encontrado o sin permisos.")
    return {"status": "success", "message": "Sensor eliminado con éxito."}


@router.post("/sensors/{sensor_code}/ingest", response_model=IotSensorOut)
async def ingest_sensor_metrics(
    sensor_code: str,
    payload: SensorIngest,
    db: Session = Depends(deps.get_db)
):
    """
    Invocado por el dispositivo IoT físico (sin auth de usuario) para reportar lecturas.
    Evalúa reglas de alerta y transmite en vivo al dashboard vía WebSocket.
    """
    service = IotService(db)
    sensor, fired_alerts = service.ingest_metrics(sensor_code, payload.metrics)
    if not sensor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor no encontrado.")

    if sensor.user_id:
        await manager.broadcast(sensor.user_id, {
            "event": "sensor_update",
            "sensor": IotSensorOut.model_validate(sensor).model_dump(mode="json")
        })
        for alert in fired_alerts:
            await manager.broadcast(sensor.user_id, {
                "event": "alert_fired",
                "alert": FiredAlertOut.model_validate(alert).model_dump(mode="json")
            })

    return sensor


# ── Alert rules ──────────────────────────────────────────
@router.get("/alert-rules", response_model=List[AlertRuleOut])
def list_alert_rules(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return IotService(db).get_user_rules(current_user.id)


@router.post("/alert-rules", response_model=AlertRuleOut)
def create_alert_rule(
    payload: AlertRuleCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    service = IotService(db)
    success, message, rule = service.create_rule(current_user.id, payload)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return rule


@router.patch("/alert-rules/{rule_id}/toggle", response_model=AlertRuleOut)
def toggle_alert_rule(
    rule_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    service = IotService(db)
    success, message, rule = service.toggle_rule(rule_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return rule


@router.delete("/alert-rules/{rule_id}")
def delete_alert_rule(
    rule_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    service = IotService(db)
    if not service.delete_rule(rule_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Regla no encontrada o sin permisos.")
    return {"status": "success", "message": "Regla eliminada con éxito."}


# ── Fired alerts history ─────────────────────────────────
@router.get("/alerts", response_model=List[FiredAlertOut])
def list_fired_alerts(
    limit: int = 50,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return IotService(db).get_user_alerts(current_user.id, limit)
