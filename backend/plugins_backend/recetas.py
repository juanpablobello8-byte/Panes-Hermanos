from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from core.database import supabase

class RecetaBase(BaseModel):
    nombre: str
    ingredientes: str

class RecetaCreate(RecetaBase):
    pass

class Receta(RecetaBase):
    id: int

app = FastAPI(title="API de Recetas")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/recetas", response_model=List[Receta])
def obtener_recetas():
    response = supabase.table('recetas').select('*').order('id', desc=True).execute()
    return response.data

@app.post("/recetas", response_model=Receta, status_code=201)
def crear_receta(receta: RecetaCreate):
    response = supabase.table('recetas').insert(receta.model_dump()).execute()
    return response.data[0]

@app.delete("/recetas/{receta_id}", status_code=204)
def eliminar_receta(receta_id: int):
    supabase.table('recetas').delete().eq('id', receta_id).execute()
    return None
