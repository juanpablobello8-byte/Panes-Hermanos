import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Advanced POS Employee Service"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ultra-secure-pos-key-change-it")
    ALGORITHM: str = "HS256"
    
    # Tokens de corta duracion para el terminal POS y normal para login gerencial
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    POS_PIN_TOKEN_EXPIRE_MINUTES: int = 15  # El token de cajero expira rápido para seguridad
    
    # Origenes permitidos estrictamente desde variables de entorno
    CORS_ORIGINS: list[str] = ["http://192.168.1.50", "http://localhost:3000", "https://admin.mi-pos.com"]
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
