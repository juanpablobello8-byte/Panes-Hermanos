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
    empleado_id: Optional[int] = None
    efectivo_recibido: Optional[float] = None
    cambio_entregado: Optional[float] = None

class VentaCreate(VentaBase):
    pass

class Venta(BaseModel):
    id: int
    fecha_venta: datetime
    total: float
    metodo_pago: str
    empleado_id: Optional[int] = None
    efectivo_recibido: Optional[float] = None
    cambio_entregado: Optional[float] = None
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
    ventas_data = response.data
    for v in ventas_data:
        if 'detalles_venta' in v:
            v['detalles'] = v.pop('detalles_venta')
    return ventas_data

@app.get("/ventas/{venta_id}", response_model=Venta, tags=["Ventas"])
def obtener_venta(venta_id: int):
    """Busca una venta particular por su ID en Supabase."""
    response = supabase.table('ventas').select('*, detalles_venta(*)').eq('id', venta_id).execute()
    data = response.data
    if not data:
        raise HTTPException(status_code=404, detail="Registro de venta no encontrado")
    
    venta = data[0]
    if 'detalles_venta' in venta:
        venta['detalles'] = venta.pop('detalles_venta')
    return venta

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
        "metodo_pago": venta_base.metodo_pago,
        "empleado_id": venta_base.empleado_id
    }
    
    # Agregar valores de efectivo si fueron enviados, asumiendo que las columnas existen en la base de datos
    if venta_base.efectivo_recibido is not None:
        venta_insert["efectivo_recibido"] = venta_base.efectivo_recibido
    if venta_base.cambio_entregado is not None:
        venta_insert["cambio_entregado"] = venta_base.cambio_entregado
    
    venta_response = supabase.table('ventas').insert(venta_insert).execute()
    nueva_venta = venta_response.data[0]
    venta_id = nueva_venta['id']
    
    # 2. Asignar el ID de la venta a los detalles e insertar en la tabla hija
    for d in detalles_para_insertar:
        d['venta_id'] = venta_id
        
        # --- NUEVO: REDUCCIÓN DE STOCK AUTOMÁTICA ---
        prod_resp = supabase.table('productos').select('cantidad_en_stock').eq('id', d['producto_id']).execute()
        if prod_resp.data:
            stock_actual = prod_resp.data[0]['cantidad_en_stock']
            nuevo_stock = stock_actual - d['cantidad']
            if nuevo_stock < 0:
                nuevo_stock = 0 # Evitar inventarios negativos por si acaso
            supabase.table('productos').update({'cantidad_en_stock': nuevo_stock}).eq('id', d['producto_id']).execute()
        # --------------------------------------------
        
    detalles_response = supabase.table('detalles_venta').insert(detalles_para_insertar).execute()
    nueva_venta['detalles_venta'] = detalles_response.data
    
    # FastAPI mapeará el field 'detalles_venta' al campo 'detalles' definido en nuestro esquema Pydantic
    # Le pasamos la data manualmente al Pydantic Model
    venta_formateada = {
        "id": nueva_venta["id"],
        "fecha_venta": nueva_venta["created_at"],
        "total": nueva_venta["total"],
        "metodo_pago": nueva_venta["metodo_pago"],
        "empleado_id": nueva_venta.get("empleado_id"),
        "detalles": nueva_venta.get("detalles_venta", [])
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
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import uvicorn
    uvicorn.run("Ventas:app", host="0.0.0.0", port=8002, reload=True)
