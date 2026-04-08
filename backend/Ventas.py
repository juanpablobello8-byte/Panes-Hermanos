from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from core.database import supabase

# ------ Esquemas Pydantic ------
class DetalleVentaBase(BaseModel):
    producto_id: int
    cantidad: int
    precio_unitario: float

class DetalleVenta(DetalleVentaBase):
    id: Optional[int] = None
    venta_id: Optional[int] = None
    subtotal: float

class VentaBase(BaseModel):
    detalles: List[DetalleVentaBase]
    metodo_pago: str

class VentaCreate(VentaBase):
    pass

class Venta(BaseModel):
    id: int
    fecha_venta: datetime
    total: float
    metodo_pago: str
    detalles: Optional[List[DetalleVenta]] = []

# ------ Aplicación FastAPI principal ------
app = FastAPI(
    title="API de Ventas - Panadería",
    description="API conectada a Supabase para gestionar el registro de ventas.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ventas", response_model=List[Venta], tags=["Ventas"])
def obtener_ventas():
    """Obtiene ventas con sus detalles desde Supabase."""
    response = supabase.table('ventas').select('*, detalles_venta(*)').execute()
    # Supabase devuelve los detalles_venta como una lista anidada si se usa la notación (*)
    return response.data

@app.get("/ventas/{venta_id}", response_model=Venta, tags=["Ventas"])
def obtener_venta(venta_id: int):
    """Busca una venta particular por su ID en Supabase."""
    response = supabase.table('ventas').select('*, detalles_venta(*)').eq('id', venta_id).execute()
    data = response.data
    if not data:
        raise HTTPException(status_code=404, detail="Registro de venta no encontrado")
    return data[0]

@app.post("/ventas", response_model=Venta, status_code=201, tags=["Ventas"])
def registrar_venta(venta_base: VentaCreate):
    """Registra una nueva venta procesando sus detalles en Supabase."""
    total_venta = 0.0
    detalles_para_insertar = []
    
    # Pre-calcular totales
    for detalle in venta_base.detalles:
        subtotal = detalle.cantidad * detalle.precio_unitario
        total_venta += subtotal
        
        # Guardaremos este objeto temporalmente
        detalles_para_insertar.append({
            "producto_id": detalle.producto_id,
            "cantidad": detalle.cantidad,
            "precio_unitario": detalle.precio_unitario,
            "subtotal": subtotal
        })
        
    # 1. Insertar la tabla padre (venta)
    venta_insert = {
        "total": total_venta,
        "metodo_pago": venta_base.metodo_pago
    }
    
    venta_response = supabase.table('ventas').insert(venta_insert).execute()
    nueva_venta = venta_response.data[0]
    venta_id = nueva_venta['id']
    
    # 2. Asignar el ID de la venta a los detalles e insertar en la tabla hija
    for d in detalles_para_insertar:
        d['venta_id'] = venta_id
        
    detalles_response = supabase.table('detalles_venta').insert(detalles_para_insertar).execute()
    nueva_venta['detalles_venta'] = detalles_response.data
    
    # FastAPI mapeará el field 'detalles_venta' al campo 'detalles' definido en nuestro esquema Pydantic
    # Le pasamos la data manualmente al Pydantic Model
    venta_formateada = {
        "id": nueva_venta["id"],
        "fecha_venta": nueva_venta["created_at"],
        "total": nueva_venta["total"],
        "metodo_pago": nueva_venta["metodo_pago"],
        "detalles": nueva_venta["detalles_venta"]
    }
    
    # 3. Autogenerar y Guardar Reporte en Base de Datos
    reporte_insert = {
        "tipo_reporte": "Venta Registrada",
        "referencia_id": venta_id,
        "contenido": venta_formateada
    }
    supabase.table('reportes').insert(reporte_insert).execute()
    
    return venta_formateada

@app.delete("/ventas/{venta_id}", status_code=204, tags=["Ventas"])
def anular_venta(venta_id: int):
    """Anula o elimina un registro de venta en Supabase."""
    supabase.table('ventas').delete().eq('id', venta_id).execute()
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.Ventas:app", host="0.0.0.0", port=8002, reload=True)
