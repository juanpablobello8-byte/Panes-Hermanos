from fastapi import HTTPException
from typing import Any

class POSException(HTTPException):
    def __init__(self, status_code: int, error_code: str, detail: str = None):
        super().__init__(
            status_code=status_code, 
            detail={"error_code": error_code, "message": detail}
        )

# Errores comunes predefinidos
def ErrInvalidCredentials():
    return POSException(status_code=401, error_code="ERR_CREDENCIALES_INVALIDAS", detail="Credenciales incorrectas")

def ErrEmployeeNotFound():
    return POSException(status_code=404, error_code="ERR_EMPLEADO_NO_ENCONTRADO", detail="Empleado no encontrado")

def ErrBranchNotFound():
    return POSException(status_code=404, error_code="ERR_SUCURSAL_NO_ENCONTRADA", detail="Sucursal no encontrada")

def ErrOutOfShift():
    return POSException(status_code=403, error_code="ERR_SIN_TURNO_ACTIVO", detail="Acción denegada: Empleado no tiene turno activo")

def ErrDuplicateEmail():
    return POSException(status_code=409, error_code="ERR_EMAIL_DUPLICADO", detail="El correo electrónico ya está registrado")

def ErrForbidden(detail: str = "Permisos insuficientes"):
    return POSException(status_code=403, error_code="ERR_PROHIBIDO", detail=detail)
