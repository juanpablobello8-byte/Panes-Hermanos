from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    # Mismo algoritmo, pero para PIN numérico
    return bcrypt.checkpw(plain_pin.encode('utf-8'), hashed_pin.encode('utf-8'))

def get_pin_hash(pin: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pin.encode('utf-8'), salt).decode('utf-8')

def create_access_token(subject: str | int, payload_extra: dict = None, expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    if payload_extra:
        to_encode.update(payload_extra)
        
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
