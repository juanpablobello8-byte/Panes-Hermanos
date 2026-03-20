from typing import Annotated, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import ValidationError

from core.config import settings
from core.exceptions import ErrInvalidCredentials, ErrForbidden
from schemas.token_acceso import TokenPayload

security = HTTPBearer()

TokenDep = Annotated[HTTPAuthorizationCredentials, Depends(security)]

def get_current_user_payload(credentials: TokenDep) -> TokenPayload:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return TokenPayload(**payload)
    except (jwt.PyJWTError, ValidationError):
        raise ErrInvalidCredentials()

# Placeholder for get_current_employee since DB is being removed
def get_current_employee(payload: TokenPayload = Depends(get_current_user_payload)) -> dict:
    # This will be implemented by the database person
    # For now, we return data from the token
    return {
        "id": payload.sub,
        "permisos": payload.permisos
    }

class RequirePermissions:
    """Dependencia parametrizable para restringir URLs basándose en claims de seguridad JWT"""
    def __init__(self, required_perms: List[str]):
        self.required_perms = required_perms

    def __call__(self, payload: TokenPayload = Depends(get_current_user_payload)) -> TokenPayload:
        if not payload.permisos:
            raise ErrForbidden("No hay permisos asignados al rol de este usuario.")
            
        user_perms = payload.permisos.split(',')
        
        # Permitir si es Admin global ("*")
        if "*" in user_perms:
            return payload

        # Verificar si todos los permisos requeridos están en los claims
        for rp in self.required_perms:
            if rp not in user_perms:
                raise ErrForbidden(f"Permiso requerido no cumplido: {rp}")
                
        return payload
