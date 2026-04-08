from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime

# ------ Esquemas Pydantic (Validación de Datos en la API) ------
class DetalleVentaBase(BaseModel):
    producto_id: int
    cantidad: int
    precio_unitario: float

class DetalleVenta(DetalleVentaBase):
    subtotal: float

class VentaBase(BaseModel):
    detalles: List[DetalleVentaBase]
    metodo_pago: str # Ej. "Efectivo", "Tarjeta", "Transferencia"

class VentaCreate(VentaBase):
    pass

class Venta(BaseModel):
    id: int
    fecha_venta: datetime
    detalles: List[DetalleVenta]
    total: float
    metodo_pago: str

# ------ Simulación de Base de Datos en Memoria ------
ventas_db: List[Venta] = []
id_counter_ventas = 1

def inicializar_bd():
    global id_counter_ventas
    if not ventas_db:
        # Ejemplo de una venta inicial
        detalles_ejemplo = [
            DetalleVenta(producto_id=1, cantidad=2, precio_unitario=3.50, subtotal=7.0),
            DetalleVenta(producto_id=2, cantidad=1, precio_unitario=12.00, subtotal=12.0)
        ]
        ejemplos = [
            Venta(
                id=1,
                fecha_venta=datetime.now(),
                detalles=detalles_ejemplo,
                total=19.0,
                metodo_pago="Efectivo"
            )
        ]
        ventas_db.extend(ejemplos)
        id_counter_ventas = 2

inicializar_bd()

# ------ Aplicación FastAPI principal ------
app = FastAPI(
    title="API de Ventas - Panadería",
    description="API para gestionar el registro de ventas, cantidades, precios y cobros.",
    version="1.0.0"
)

@app.get("/ventas", response_model=List[Venta], tags=["Ventas"])
def obtener_ventas():
    """Obtener el registro histórico de todas las ventas realizadas."""
    return ventas_db

@app.get("/ventas/{venta_id}", response_model=Venta, tags=["Ventas"])
def obtener_venta(venta_id: int):
    """Busca una venta particular por su ID o número de ticket."""
    venta = next((v for v in ventas_db if v.id == venta_id), None)
    if venta is None:
        raise HTTPException(status_code=404, detail="Registro de venta no encontrado")
    return venta

@app.post("/ventas", response_model=Venta, status_code=201, tags=["Ventas"])
def registrar_venta(venta_base: VentaCreate):
    """Registra una nueva venta procesando cada detalle (calcula subtotales y total automáticamente)."""
    global id_counter_ventas
    
    detalles_venta = []
    total_venta = 0.0
    
    # Procesamiento dinámico de los detalles de la venta (precio * cantidad)
    for detalle in venta_base.detalles:
        subtotal = detalle.cantidad * detalle.precio_unitario
        detalles_venta.append(DetalleVenta(
            producto_id=detalle.producto_id,
            cantidad=detalle.cantidad,
            precio_unitario=detalle.precio_unitario,
            subtotal=subtotal
        ))
        total_venta += subtotal
        
    nueva_venta = Venta(
        id=id_counter_ventas,
        fecha_venta=datetime.now(),
        detalles=detalles_venta,
        total=total_venta,
        metodo_pago=venta_base.metodo_pago
    )
    
    ventas_db.append(nueva_venta)
    id_counter_ventas += 1
    return nueva_venta

@app.delete("/ventas/{venta_id}", status_code=204, tags=["Ventas"])
def anular_venta(venta_id: int):
    """Anula o elimina un registro de venta (para devoluciones o errores)."""
    global ventas_db
    venta = next((v for v in ventas_db if v.id == venta_id), None)
    if venta is None:
        raise HTTPException(status_code=404, detail="Registro de venta no encontrado")
        
    ventas_db = [v for v in ventas_db if v.id != venta_id]
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Ventas:app", host="0.0.0.0", port=8002, reload=True)
