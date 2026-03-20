from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

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

# ------ Simulación de Base de Datos en Memoria ------
productos_db: List[Producto] = []
id_counter = 1

# Semilla de ejemplos
def inicializar_bd():
    global id_counter
    if not productos_db:
        ejemplos = [
            Producto(id=1, nombre="Pan Francés", descripcion="Bolillo tradicional", precio=3.50, cantidad_en_stock=100, categoria="Salado"),
            Producto(id=2, nombre="Concha de Vainilla", descripcion="Con cobertura clásica", precio=12.00, cantidad_en_stock=50, categoria="Dulce"),
            Producto(id=3, nombre="Oreja", descripcion="Pan hojaldrado crujiente con azúcar", precio=14.00, cantidad_en_stock=40, categoria="Dulce")
        ]
        productos_db.extend(ejemplos)
        id_counter = 4

inicializar_bd()

# ------ Aplicación FastAPI principal ------
app = FastAPI(
    title="API de Inventario - Panadería",
    description="API para gestionar el inventario de un punto de venta. (Módulo de inventario sin conexión a BD)",
    version="2.0.0"
)

@app.get("/productos", response_model=List[Producto], tags=["Inventario"])
def obtener_productos():
    """Obtener todos los productos registrados en el inventario."""
    return productos_db

@app.get("/productos/{producto_id}", response_model=Producto, tags=["Inventario"])
def obtener_producto(producto_id: int):
    """Busca un producto particular por su identificador único (ID)."""
    producto = next((p for p in productos_db if p.id == producto_id), None)
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@app.post("/productos", response_model=Producto, status_code=201, tags=["Inventario"])
def crear_producto(producto_base: ProductoCreate):
    """Registra un nuevo tipo de pan o producto en el inventario."""
    global id_counter
    nuevo_producto = Producto(id=id_counter, **producto_base.model_dump())
    productos_db.append(nuevo_producto)
    id_counter += 1
    return nuevo_producto

@app.put("/productos/{producto_id}", response_model=Producto, tags=["Inventario"])
def actualizar_producto(producto_id: int, producto_actualizado: ProductoCreate):
    """Modifica la información (como precio o existencias) de un producto guardado."""
    for index, p in enumerate(productos_db):
        if p.id == producto_id:
            producto_modificado = Producto(id=producto_id, **producto_actualizado.model_dump())
            productos_db[index] = producto_modificado
            return producto_modificado
            
    raise HTTPException(status_code=404, detail="Producto no encontrado")

@app.delete("/productos/{producto_id}", status_code=204, tags=["Inventario"])
def eliminar_producto(producto_id: int):
    """Elimina permanentemente un producto del catálogo del inventario."""
    global productos_db
    producto = next((p for p in productos_db if p.id == producto_id), None)
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    productos_db = [p for p in productos_db if p.id != producto_id]
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Inventario:app", host="0.0.0.0", port=8000, reload=True)
