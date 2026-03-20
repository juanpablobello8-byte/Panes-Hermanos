from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from typing import Any

from api.deps import get_current_employee, RequirePermissions
from core.exceptions import ErrOutOfShift, ErrForbidden
from schemas.turno import RespuestaTurno

router = APIRouter()

@router.post("/entrada", response_model=RespuestaTurno, dependencies=[Depends(RequirePermissions(["turno:operar"]))])
def registrar_entrada(
    empleado_actual: dict = Depends(get_current_employee)
) -> Any:
    """Registra la entrada (inicio de turno) del cajero"""
    # This will be replaced by database logic by the DB teammate
    return {
        "id": 1,
        "id_empleado": empleado_actual["id"],
        "id_sucursal": 1,
        "hora_entrada": datetime.now(timezone.utc),
        "estado": "activo"
    }

@router.post("/salida", response_model=RespuestaTurno, dependencies=[Depends(RequirePermissions(["turno:operar"]))])
def registrar_salida(
    empleado_actual: dict = Depends(get_current_employee)
) -> Any:
    """Registra la salida (fin de turno) del cajero"""
    # This will be replaced by database logic
    return {
        "id": 1,
        "id_empleado": empleado_actual["id"],
        "id_sucursal": 1,
        "hora_entrada": datetime.now(timezone.utc),
        "hora_salida": datetime.now(timezone.utc),
        "estado": "cerrado"
    }
