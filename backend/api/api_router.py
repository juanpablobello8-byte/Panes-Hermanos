from fastapi import APIRouter
from api.endpoints import auth, employees, shifts

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/autenticacion", tags=["autenticacion"])
api_router.include_router(employees.router, prefix="/empleados", tags=["empleados"])
api_router.include_router(shifts.router, prefix="/empleados/mi-turno", tags=["turnos-pos"])
