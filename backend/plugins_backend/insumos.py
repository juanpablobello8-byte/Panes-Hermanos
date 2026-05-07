from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from core.database import supabase

class InsumoBase(BaseModel):
    nombre: str
    cantidad: str
    costo: float

class InsumoCreate(InsumoBase):
    pass

class Insumo(InsumoBase):
    id: int

app = FastAPI(title="API de Insumos")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/insumos", response_model=List[Insumo])
def obtener_insumos():
    response = supabase.table('insumos').select('*').order('id', desc=True).execute()
    return response.data

@app.post("/insumos", response_model=Insumo, status_code=201)
def crear_insumo(insumo: InsumoCreate):
    response = supabase.table('insumos').insert(insumo.model_dump()).execute()
    return response.data[0]

@app.delete("/insumos/{insumo_id}", status_code=204)
def eliminar_insumo(insumo_id: int):
    supabase.table('insumos').delete().eq('id', insumo_id).execute()
    return None

@app.put("/insumos/{insumo_id}", response_model=Insumo)
def actualizar_insumo(insumo_id: int, insumo: InsumoCreate):
    response = supabase.table('insumos').update(insumo.model_dump()).eq('id', insumo_id).execute()
    data = response.data
    if not data:
        raise HTTPException(status_code=404, detail="Insumo no encontrado")
    return data[0]
