import random
import string
import datetime
from sqlalchemy.orm import Session
from app.modules.devices.models import Device

class DeviceService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, device_id: int) -> Device:
        return self.db.query(Device).filter(Device.id == device_id).first()

    def get_by_serial(self, serial_number: str) -> Device:
        return self.db.query(Device).filter(Device.serial_number == serial_number).first()

    def get_by_pairing_code(self, pairing_code: str) -> Device:
        return self.db.query(Device).filter(Device.pairing_code == pairing_code.upper()).first()

    def get_user_devices(self, user_id: int) -> list[Device]:
        return self.db.query(Device).filter(Device.user_id == user_id, Device.is_paired == True).all()

    def generate_pairing_code(self, serial_number: str) -> Device:
        # Buscar si el dispositivo ya existe
        device = self.get_by_serial(serial_number)
        
        # Si ya existe y ya está emparejado, retornar el dispositivo
        if device and device.is_paired:
            return device

        # Generar un código único de 6 caracteres
        pairing_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        if not device:
            device = Device(
                serial_number=serial_number,
                status="offline",
                pairing_code=pairing_code,
                is_paired=False
            )
            self.db.add(device)
        else:
            device.pairing_code = pairing_code
            device.is_paired = False
            device.user_id = None
            self.db.add(device)
            
        self.db.commit()
        self.db.refresh(device)
        return device

    def pair_device(self, user_id: int, pairing_code: str, name: str) -> tuple[bool, str, Device]:
        device = self.get_by_pairing_code(pairing_code)
        if not device:
            return False, "Código de emparejamiento inválido o expirado.", None

        if device.is_paired:
            return False, "Esta pantalla ya se encuentra emparejada.", None

        # Vincular dispositivo
        device.is_paired = True
        device.user_id = user_id
        device.name = name
        device.pairing_code = None  # Limpiar código una vez emparejado
        device.status = "online"
        device.last_heartbeat = datetime.datetime.now(datetime.timezone.utc)
        
        self.db.add(device)
        self.db.commit()
        self.db.refresh(device)
        return True, "Pantalla emparejada exitosamente.", device

    def register_heartbeat(self, serial_number: str, ip_address: str = None, storage_used_gb: float = 0.0, status: str = "online") -> Device:
        device = self.get_by_serial(serial_number)
        if not device:
            # Si no existe, crear registro base inactivo (latido inicial de reproductor nuevo)
            device = Device(
                serial_number=serial_number,
                status=status,
                is_paired=False,
                ip_address=ip_address,
                storage_used_gb=storage_used_gb,
                last_heartbeat=datetime.datetime.now(datetime.timezone.utc)
            )
            self.db.add(device)
        else:
            device.status = status
            if ip_address:
                device.ip_address = ip_address
            device.storage_used_gb = storage_used_gb
            device.last_heartbeat = datetime.datetime.now(datetime.timezone.utc)
            self.db.add(device)

        self.db.commit()
        self.db.refresh(device)
        return device
