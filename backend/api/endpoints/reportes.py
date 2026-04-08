from fastapi import APIRouter, Depends
from typing import Any
from datetime import datetime

from api.deps import RequirePermissions

router = APIRouter()

@router.get("/ventas-dia", dependencies=[Depends(RequirePermissions(["reportes:leer"]))])
def ventas_dia() -> Any:
    return {
        "fecha": datetime.now(),
        "total_ventas": 5000,
        "transacciones": 30
    }

@router.get("/resumen", dependencies=[Depends(RequirePermissions(["reportes:leer"]))])
def resumen() -> Any:
    return {
        "ventas_totales": 20000,
        "productos_vendidos": 150,
        "empleados_activos": 8
    }