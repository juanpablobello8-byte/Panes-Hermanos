from typing import Annotated
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import timedelta

from core.security import verify_password, verify_pin, create_access_token
from core.config import settings
from core.exceptions import ErrInvalidCredentials, ErrBranchNotFound
from schemas.token_acceso import Token

router = APIRouter()

# Esquema para login en punto de venta
class AccesoCajaRequest(BaseModel):
    id_sucursal: int
    pin_pos: str

@router.post("/login-web", response_model=Token)
def login_administrador(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """ Inicio de sesión para administradores/gerentes desde entorno Web """
    # This will be replaced by database logic by the DB teammate
    # For now, we allow any login with 'admin@example.com' and 'admin'
    if form_data.username == "admin@example.com" and form_data.password == "admin":
        permisos = "*"
        expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        token = create_access_token(
            subject=1, 
            payload_extra={"permisos": permisos, "id_sucursal": "1"},
            expires_delta=expires
        )
        return Token(token_acceso=token, tipo_token="bearer")
    
    raise ErrInvalidCredentials()

@router.post("/acceso-caja", response_model=Token)
def login_terminal_pos(
    request: AccesoCajaRequest
) -> Token:
    """ Acceso rápido a terminal POS usando PIN y sucursal """
    # This will be replaced by database logic
    # For now, we allow PIN '1234' for sucursal 1
    if request.id_sucursal == 1 and request.pin_pos == "1234":
        permisos = "turno:operar"
        expires = timedelta(minutes=settings.POS_PIN_TOKEN_EXPIRE_MINUTES)
        token = create_access_token(
            subject=1,
            payload_extra={"permisos": permisos, "id_sucursal": "1", "es_pos": True},
            expires_delta=expires
        )
        return Token(token_acceso=token, tipo_token="bearer")
            
    raise ErrInvalidCredentials()
