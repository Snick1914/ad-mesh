from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
import bcrypt

ALGORITHM = "HS256"
SECRET_KEY = "DEVELOPMENT_SECRET_KEY" # In production, use environment variable

def create_access_token(
    subject: Union[str, Any],
    email: str = "",
    full_name: str = "",
    expires_delta: timedelta = None,
    is_superuser: bool = False,
    has_telemetry: bool = True,
    has_ads: bool = True
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=60 * 24 * 8
        )
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "email": email,
        "full_name": full_name,
        "is_superuser": is_superuser,
        "has_telemetry": has_telemetry,
        "has_ads": has_ads
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")
