from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from core.database import supabase

# ------ Esquemas Pydantic ------
class EmpleadoBase(BaseModel):
    nombre: str
    puesto: str
    telefono: Optional[str] = None

class EmpleadoCreate(EmpleadoBase):
    pass

class Empleado(EmpleadoBase):
    id: int

# ------ Aplicación FastAPI principal ------
app = FastAPI(
    title="API de Empleados - Panadería",
    description="API conectada a Supabase para gestionar empleados.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/empleados", response_model=List[Empleado], tags=["Empleados"])
def obtener_empleados():
    """Obtiene empleados desde Supabase."""
    response = supabase.table('empleados').select('*').execute()
    return response.data

@app.post("/empleados", response_model=Empleado, status_code=201, tags=["Empleados"])
def crear_empleado(empleado: EmpleadoCreate):
    """Registra nuevo empleado en Supabase."""
    response = supabase.table('empleados').insert(empleado.model_dump()).execute()
    return response.data[0]

@app.delete("/empleados/{empleado_id}", status_code=204, tags=["Empleados"])
def eliminar_empleado(empleado_id: int):
    """Elimina empleado de Supabase."""
    supabase.table('empleados').delete().eq('id', empleado_id).execute()
    return None

if __name__ == "__main__":
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import uvicorn
    uvicorn.run("Empleados:app", host="0.0.0.0", port=8004, reload=True)
