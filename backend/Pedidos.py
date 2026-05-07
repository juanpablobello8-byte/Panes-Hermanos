from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from core.database import supabase

class PedidoBase(BaseModel):
    cliente: str
    detalle: str
    fecha: str
    estado: Optional[str] = 'Pendiente'

class PedidoCreate(PedidoBase):
    pass

class Pedido(PedidoBase):
    id: int

app = FastAPI(title="API de Pedidos")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/pedidos", response_model=List[Pedido])
def obtener_pedidos():
    response = supabase.table('pedidos').select('*').order('fecha', desc=False).execute()
    return response.data

@app.post("/pedidos", response_model=Pedido, status_code=201)
def crear_pedido(pedido: PedidoCreate):
    response = supabase.table('pedidos').insert(pedido.model_dump()).execute()
    return response.data[0]

@app.put("/pedidos/{pedido_id}", response_model=Pedido)
def actualizar_pedido_estado(pedido_id: int, estado: dict):
    response = supabase.table('pedidos').update({'estado': estado['estado']}).eq('id', pedido_id).execute()
    return response.data[0]

@app.delete("/pedidos/{pedido_id}", status_code=204)
def eliminar_pedido(pedido_id: int):
    supabase.table('pedidos').delete().eq('id', pedido_id).execute()
    return None
