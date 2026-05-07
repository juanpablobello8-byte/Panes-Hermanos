from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from core.database import supabase

class OrdenBase(BaseModel):
    pan: str
    cantidad: int
    estado: Optional[str] = 'En Cola'

class OrdenCreate(OrdenBase):
    pass

class Orden(OrdenBase):
    id: int

app = FastAPI(title="API de Órdenes de Horneado")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/ordenes", response_model=List[Orden])
def obtener_ordenes():
    response = supabase.table('ordenes_horneado').select('*').order('id', desc=True).execute()
    return response.data

@app.post("/ordenes", response_model=Orden, status_code=201)
def crear_orden(orden: OrdenCreate):
    response = supabase.table('ordenes_horneado').insert(orden.model_dump()).execute()
    return response.data[0]

@app.put("/ordenes/{orden_id}", response_model=Orden)
def actualizar_orden(orden_id: int, estado: dict):
    response = supabase.table('ordenes_horneado').update({'estado': estado['estado']}).eq('id', orden_id).execute()
    return response.data[0]

@app.delete("/ordenes/{orden_id}", status_code=204)
def eliminar_orden(orden_id: int):
    supabase.table('ordenes_horneado').delete().eq('id', orden_id).execute()
    return None
