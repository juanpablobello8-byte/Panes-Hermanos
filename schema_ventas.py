from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

# Lo que te envía el Frontend por cada pan en el carrito
class ProductoVentaCreate(BaseModel):
    producto_id: int = Field(..., gt=0, description="ID del pan en el inventario")
    cantidad: int = Field(..., gt=0, description="Cuántas piezas de este pan")
    precio_unitario: float = Field(..., gt=0, description="Precio al momento de la venta")

# Lo que te envía el Frontend al darle "Cobrar"
class VentaCreate(BaseModel):
    empleado_id: int = Field(..., gt=0, description="ID del cajero que cobra")
    metodo_pago: str = Field(default="Efectivo", description="Método de pago (Efectivo, Tarjeta, etc.)")
    productos: List[ProductoVentaCreate] = Field(..., description="Lista de panes en el carrito")

# Lo que tú le respondes al Frontend y a Jesús (Reportes)
class VentaOut(BaseModel):
    id: int
    empleado_id: int
    fecha: datetime
    total: float
    metodo_pago: str
    estado: str
    
    class Config:
        from_attributes = True