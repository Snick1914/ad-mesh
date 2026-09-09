from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ad-mesh"
    API_V1_STR: str = "/api/v1"
    
    # Google Auth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    
    # CORS
    BACKEND_CORS_ORIGINS: List[Union[AnyHttpUrl, str]] = []

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            import json
            try:
                return json.loads(v)
            except Exception:
                return []
        elif isinstance(v, list):
            return v
        return v

    # Database
    POSTGRES_SERVER: str = "db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "admesh_db"
    SQLALCHEMY_DATABASE_URI: str = ""

    @validator("SQLALCHEMY_DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: str, values: dict) -> str:
        if isinstance(v, str) and v:
            return v
        return f"postgresql://{values.get('POSTGRES_USER')}:{values.get('POSTGRES_PASSWORD')}@{values.get('POSTGRES_SERVER')}/{values.get('POSTGRES_DB')}"

    # SMTP / Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    EMAIL_FROM: str = ""
    EMAIL_FROM_NAME: str = "ad-mesh Alertas"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
