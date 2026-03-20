from fastapi import APIRouter, Depends, Query
from typing import Any, List

from api.deps import RequirePermissions, get_current_employee
from core.security import get_password_hash, get_pin_hash
from core.exceptions import ErrDuplicateEmail, ErrEmployeeNotFound, ErrBranchNotFound
from schemas.empleado import EmpleadoRespuesta, EmpleadoCrear, EmpleadoActualizar

router = APIRouter()

# Mock data for demonstration purposes while DB is being implemented
MOCK_EMPLOYEES = [
    {
        "id": 1,
        "nombre": "Juan",
        "apellido": "Perez",
        "email": "juan@example.com",
        "telefono": "1234567890",
        "salario": 1500.0,
        "id_sucursal": 1,
        "id_rol": 1,
        "activo": True
    }
]

@router.get("/", response_model=List[EmpleadoRespuesta], dependencies=[Depends(RequirePermissions(["empleado:leer"]))])
def listar_empleados(
    id_sucursal: int | None = None,
    activo: bool = True,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Búsqueda avanzada de empleados. Requiere permisos de lectura."""
    # This will be replaced by database logic by the DB teammate
    return MOCK_EMPLOYEES[skip : skip + limit]

@router.get("/{id}", response_model=EmpleadoRespuesta, dependencies=[Depends(RequirePermissions(["empleado:leer"]))])
def obtener_empleado(id: int) -> Any:
    # This will be replaced by database logic
    for emp in MOCK_EMPLOYEES:
        if emp["id"] == id:
            return emp
    raise ErrEmployeeNotFound()

@router.post("/", response_model=EmpleadoRespuesta, dependencies=[Depends(RequirePermissions(["empleado:crear"]))])
def crear_empleado(
    emp_in: EmpleadoCrear
) -> Any:
    """Alta de empleado. Verifica unicidad de email y existencia de sucursal/rol."""
    # Placeholder implementation
    return {
        "id": 2,
        **emp_in.model_dump(),
        "activo": True
    }

@router.patch("/{id}", response_model=EmpleadoRespuesta, dependencies=[Depends(RequirePermissions(["empleado:actualizar"]))])
def actualizar_empleado(
    id: int,
    emp_in: EmpleadoActualizar
) -> Any:
    # Placeholder implementation
    for emp in MOCK_EMPLOYEES:
        if emp["id"] == id:
            update_data = emp_in.model_dump(exclude_unset=True)
            return {**emp, **update_data}
    raise ErrEmployeeNotFound()

@router.delete("/{id}", response_model=EmpleadoRespuesta, dependencies=[Depends(RequirePermissions(["empleado:eliminar"]))])
def eliminar_empleado(id: int) -> Any:
    """Baja lógica de la base de datos para mantener historial del POS"""
    # Placeholder implementation
    for emp in MOCK_EMPLOYEES:
        if emp["id"] == id:
            emp["activo"] = False
            return emp
    raise ErrEmployeeNotFound()
