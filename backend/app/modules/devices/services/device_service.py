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

        # Si ya tiene un código generado, reutilizarlo para que no cambie tan rápido en la pantalla
        if device and device.pairing_code:
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

    def update_device_config(self, device_id: int, user_id: int, resolution: str = None, layout: str = None, playlist_id: int = None, playlist_b_id: int = None, playlist_c_id: int = None) -> tuple[bool, str, Device]:
        device = self.get_by_id(device_id)
        if not device:
            return False, "Dispositivo no encontrado.", None
        if device.user_id != user_id:
            return False, "No tienes permisos para modificar este dispositivo.", None

        if resolution is not None:
            device.resolution = resolution
        if layout is not None:
            device.layout = layout
        
        device.playlist_id = playlist_id if playlist_id and playlist_id > 0 else None
        device.playlist_b_id = playlist_b_id if playlist_b_id and playlist_b_id > 0 else None
        device.playlist_c_id = playlist_c_id if playlist_c_id and playlist_c_id > 0 else None

        self.db.add(device)
        self.db.commit()
        self.db.refresh(device)
        return True, "Configuración de dispositivo actualizada con éxito.", device

    def unpair_device(self, device_id: int, user_id: int) -> tuple[bool, str, Device]:
        device = self.get_by_id(device_id)
        if not device:
            return False, "Dispositivo no encontrado.", None
        if device.user_id != user_id:
            return False, "No tienes permisos para desvincular este dispositivo.", None

        # Desvincular dispositivo
        device.is_paired = False
        device.user_id = None
        device.name = None
        device.playlist_id = None
        device.playlist_b_id = None
        device.playlist_c_id = None
        # Generar código nuevo listo para volver a emparejar
        device.pairing_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        self.db.add(device)
        self.db.commit()
        self.db.refresh(device)
        return True, "Dispositivo desvinculado con éxito.", device

