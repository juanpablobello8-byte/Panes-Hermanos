from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from core.database import supabase

class MermaBase(BaseModel):
    pan: str
    cantidad: int
    motivo: str
    fecha_registro: Optional[str] = None

class MermaCreate(MermaBase):
    pass

class Merma(MermaBase):
    id: int

app = FastAPI(title="API de Mermas")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/mermas", response_model=List[Merma])
def obtener_mermas():
    response = supabase.table('mermas').select('*').order('id', desc=True).execute()
    return response.data

@app.post("/mermas", response_model=Merma, status_code=201)
def crear_merma(merma: MermaCreate):
    data = merma.model_dump()
    if not data['fecha_registro']:
        import datetime
        data['fecha_registro'] = datetime.datetime.now().strftime('%Y-%m-%d')
    response = supabase.table('mermas').insert(data).execute()
    return response.data[0]
