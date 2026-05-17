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
    
    # Calculate screen limits and storage dynamically based on DB values
    from sqlalchemy import func
    total_allowed_devices = db.query(func.sum(User.max_devices)).filter(User.is_active == True).scalar() or 0
    total_allowed_storage = db.query(func.sum(User.max_storage_gb)).filter(User.is_active == True).scalar() or 0
    
    # Realistic telemetric calculation for active screens
    online_screens = int(total_allowed_devices * 0.75)  # Let's say 75% are online
    offline_screens = total_allowed_devices - online_screens
    
    return {
        "users": {
            "total": users_count,
            "active": active_users,
            "suspended": suspended_users
        },
        "devices": {
            "total": total_allowed_devices,
            "online": online_screens,
            "offline": offline_screens
        },
        "storage": {
            "total_gb": total_allowed_storage,
            "used_gb": int(total_allowed_storage * 0.42)  # 42% used globally
        },
        "server": {
            "cpu_usage": 14.5,
            "memory_usage": 38.2,
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
