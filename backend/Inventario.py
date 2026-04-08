from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from core.database import supabase

# ------ Esquemas Pydantic (Validación de Datos en la API) ------
class ProductoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio: float
    cantidad_en_stock: int
    categoria: str

class ProductoCreate(ProductoBase):
    pass

class Producto(ProductoBase):
    id: int

# ------ Aplicación FastAPI principal ------
app = FastAPI(
    title="API de Inventario - Panadería",
    description="API para gestionar el inventario conectado a Supabase.",
    version="3.0.0"
)

@app.get("/productos", response_model=List[Producto], tags=["Inventario"])
def obtener_productos():
    """Obtener todos los productos registrados desde Supabase."""
    response = supabase.table('productos').select('*').execute()
    return response.data

@app.get("/productos/{producto_id}", response_model=Producto, tags=["Inventario"])
def obtener_producto(producto_id: int):
    """Busca un producto particular por su identificador único (ID)."""
    response = supabase.table('productos').select('*').eq('id', producto_id).execute()
    data = response.data
    if not data:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return data[0]

@app.post("/productos", response_model=Producto, status_code=201, tags=["Inventario"])
def crear_producto(producto_base: ProductoCreate):
    """Registra un nuevo tipo de pan o producto en Supabase."""
    response = supabase.table('productos').insert(producto_base.model_dump()).execute()
    return response.data[0]

@app.put("/productos/{producto_id}", response_model=Producto, tags=["Inventario"])
def actualizar_producto(producto_id: int, producto_actualizado: ProductoCreate):
    """Modifica la información (como precio o existencias) de un producto en Supabase."""
    response = supabase.table('productos').update(producto_actualizado.model_dump()).eq('id', producto_id).execute()
    data = response.data
    if not data:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return data[0]

@app.delete("/productos/{producto_id}", status_code=204, tags=["Inventario"])
def eliminar_producto(producto_id: int):
    """Elimina permanentemente un producto de Supabase."""
    response = supabase.table('productos').delete().eq('id', producto_id).execute()
    if not response.data:
        # Nota: Supabase delete() a veces no retorna datos si no hay selección implícita, 
        # pero es suficiente con intentar eliminar
        pass
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.Inventario:app", host="0.0.0.0", port=8000, reload=True)
