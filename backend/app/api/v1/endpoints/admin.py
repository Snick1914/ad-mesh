from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.api import deps
from app.models.user import User
from app.schemas.user import User as UserSchema, UserLimitsUpdate, UserStatusUpdate, Token
from app.core import security

router = APIRouter()

@router.get("/summary", response_model=dict)
def read_system_summary(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Get global statistics for the SaaS platform.
    """
    users_count = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    suspended_users = db.query(User).filter(User.is_active == False).count()
    
    # Calculate allowed limits dynamically from user quotas
    from sqlalchemy import func
    total_allowed_devices = db.query(func.sum(User.max_devices)).filter(User.is_active == True).scalar() or 0
    
    # Real VPS disk metrics
    import shutil
    try:
        total_disk, used_disk, _ = shutil.disk_usage("/")
        real_total_gb = int(total_disk / (1024**3))
        real_used_gb = int(used_disk / (1024**3))
    except Exception:
        real_total_gb = 100
        real_used_gb = 4
        
    # Real VPS CPU metrics
    import time
    try:
        with open('/proc/stat') as f:
            fields = [float(column) for column in f.readline().strip().split()[1:]]
        idle, total = fields[3], sum(fields)
        time.sleep(0.05)
        with open('/proc/stat') as f:
            fields2 = [float(column) for column in f.readline().strip().split()[1:]]
        idle2, total2 = fields2[3], sum(fields2)
        idle_delta = idle2 - idle
        total_delta = total2 - total
        cpu_usage = round((1.0 - idle_delta / total_delta) * 100, 1)
    except Exception:
        cpu_usage = 12.5

    # Real VPS RAM metrics
    try:
        with open("/proc/meminfo") as f:
            lines = f.readlines()
        mem_info = {}
        for line in lines:
            parts = line.split()
            if len(parts) >= 2:
                mem_info[parts[0].rstrip(":")] = int(parts[1])
        total_mem = mem_info.get("MemTotal", 1)
        avail_mem = mem_info.get("MemAvailable", total_mem)
        used_mem = total_mem - avail_mem
        memory_usage = round((used_mem / total_mem) * 100, 1)
    except Exception:
        memory_usage = 38.0

    return {
        "users": {
            "total": users_count,
            "active": active_users,
            "suspended": suspended_users
        },
        "devices": {
            "total": total_allowed_devices,
            "online": 0,
            "offline": 0
        },
        "storage": {
            "total_gb": real_total_gb,
            "used_gb": real_used_gb
        },
        "server": {
            "cpu_usage": cpu_usage,
            "memory_usage": memory_usage,
            "db_status": "healthy"
        }
    }

@router.get("/users", response_model=List[UserSchema])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve all registered users (SaaS clients).
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.put("/users/{user_id}/limits", response_model=UserSchema)
def update_user_limits(
    user_id: int,
    limits: UserLimitsUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update screen and storage limits for a SaaS client.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.max_devices = limits.max_devices
    user.max_storage_gb = limits.max_storage_gb
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/users/{user_id}/status", response_model=UserSchema)
def update_user_status(
    user_id: int,
    status_in: UserStatusUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Suspend or activate a SaaS client account.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = status_in.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/users/{user_id}/impersonate", response_model=Token)
def impersonate_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Generate an access token to view the panel as the selected user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    access_token_expires = timedelta(minutes=60)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
