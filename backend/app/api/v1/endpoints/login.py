from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.user import Token, UserCreate, User as UserSchema
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

router = APIRouter()

def ensure_linking_code(db: Session, user: User) -> str:
    if not user.linking_code:
        import random
        import string
        while True:
            code = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
            full_code = f"USR-{code}"
            exists = db.query(User).filter(User.linking_code == full_code).first()
            if not exists:
                user.linking_code = full_code
                db.add(user)
                db.commit()
                db.refresh(user)
                break
    return user.linking_code

@router.get("/users/me", response_model=UserSchema)
def read_user_me(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get current user profile.
    """
    ensure_linking_code(db, current_user)
    return current_user

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    linking_code = ensure_linking_code(db, user)
    access_token_expires = timedelta(minutes=60 * 24)
    return {
        "access_token": security.create_access_token(
            user.id,
            email=user.email,
            full_name=user.full_name or "",
            expires_delta=access_token_expires,
            is_superuser=user.is_superuser,
            has_telemetry=user.has_telemetry,
            has_ads=user.has_ads,
            linking_code=linking_code
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserSchema)
def register_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    db_obj = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        company_name=user_in.company_name,
        is_superuser=False,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    ensure_linking_code(db, db_obj)
    return db_obj

from pydantic import BaseModel
from typing import Optional

class GoogleToken(BaseModel):
    id_token: str
    company_name: Optional[str] = None

@router.post("/login/google", response_model=Token)
def login_google(
    *,
    db: Session = Depends(deps.get_db),
    token_data: GoogleToken,
) -> Any:
    token_in = token_data.id_token
    """
    Login with Google.
    Verifies the token and creates a user if it doesn't exist.
    """
    try:
        # Specify the CLIENT_ID of the app that accesses the backend:
        idinfo = id_token.verify_oauth2_token(token_in, google_requests.Request(), settings.GOOGLE_CLIENT_ID)

        # ID token is valid. Get the user's Google ID from the decoded token.
        google_id = idinfo['sub']
        email = idinfo['email']
        full_name = idinfo.get('name', '')
        
        # Check if user exists by google_id or email
        user = db.query(User).filter((User.google_id == google_id) | (User.email == email)).first()
        
        if not user:
            # Create new user
            fallback_company = token_data.company_name or f"Empresa de {full_name}"
            user = User(
                email=email,
                full_name=full_name,
                google_id=google_id,
                company_name=fallback_company,
                is_active=True,
                is_superuser=False,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        elif not user.google_id:
            # Link existing email-only user to google_id
            user.google_id = google_id
            db.add(user)
            db.commit()
            db.refresh(user)

        linking_code = ensure_linking_code(db, user)
        access_token_expires = timedelta(minutes=60 * 24)
        return {
            "access_token": security.create_access_token(
                user.id,
                email=user.email,
                full_name=user.full_name or "",
                expires_delta=access_token_expires,
                is_superuser=user.is_superuser,
                has_telemetry=user.has_telemetry,
                has_ads=user.has_ads,
                linking_code=linking_code
            ),
            "token_type": "bearer",
        }
    except ValueError:
        # Invalid token
        raise HTTPException(status_code=400, detail="Invalid Google token")
