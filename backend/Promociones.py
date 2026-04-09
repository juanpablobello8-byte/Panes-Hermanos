from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from core.database import supabase

# ------ Esquemas Pydantic (Validación de Datos en la API) ------
class PromocionBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    descuento_porcentaje: float
    producto_id_aplicable: Optional[int] = None
    fecha_inicio: date
    fecha_fin: date
    activa: bool = True

class PromocionCreate(PromocionBase):
    pass

class Promocion(PromocionBase):
    id: int

# ------ Aplicación FastAPI principal ------
app = FastAPI(
    title="API de Promociones - Panadería",
    description="API conectada a Supabase para gestionar las promociones.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/promociones", response_model=List[Promocion], tags=["Promociones"])
def obtener_promociones():
    """Obtener todas las promociones registradas en Supabase."""
    response = supabase.table('promociones').select('*').execute()
    return response.data

@app.get("/promociones/{promocion_id}", response_model=Promocion, tags=["Promociones"])
def obtener_promocion(promocion_id: int):
    """Busca una promoción particular por su identificador único (ID)."""
    response = supabase.table('promociones').select('*').eq('id', promocion_id).execute()
    data = response.data
    if not data:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    return data[0]

@app.post("/promociones", response_model=Promocion, status_code=201, tags=["Promociones"])
def crear_promocion(promocion_base: PromocionCreate):
    """Registra una nueva promoción en la base de datos."""
    # Convertir las fechas a formato de texto para Supabase (ISO) si es necesario, 
    # aunque pydantic+supabase suele manejar bien el .model_dump()
    data_to_insert = promocion_base.model_dump()
    data_to_insert['fecha_inicio'] = data_to_insert['fecha_inicio'].isoformat()
    data_to_insert['fecha_fin'] = data_to_insert['fecha_fin'].isoformat()
    
    response = supabase.table('promociones').insert(data_to_insert).execute()
    return response.data[0]

@app.put("/promociones/{promocion_id}", response_model=Promocion, tags=["Promociones"])
def actualizar_promocion(promocion_id: int, promocion_actualizada: PromocionCreate):
    """Modifica la información de una promoción en Supabase."""
    data_to_update = promocion_actualizada.model_dump()
    data_to_update['fecha_inicio'] = data_to_update['fecha_inicio'].isoformat()
    data_to_update['fecha_fin'] = data_to_update['fecha_fin'].isoformat()

    response = supabase.table('promociones').update(data_to_update).eq('id', promocion_id).execute()
    data = response.data
    if not data:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    return data[0]

@app.delete("/promociones/{promocion_id}", status_code=204, tags=["Promociones"])
def eliminar_promocion(promocion_id: int):
    """Elimina permanentemente una promoción de Supabase."""
    supabase.table('promociones').delete().eq('id', promocion_id).execute()
    return None

if __name__ == "__main__":
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import uvicorn
    uvicorn.run("Promociones:app", host="0.0.0.0", port=8001, reload=True)
