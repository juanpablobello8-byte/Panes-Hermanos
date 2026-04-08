from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

# ------ Esquemas Pydantic (Validación de Datos en la API) ------
class PromocionBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    descuento_porcentaje: float
    producto_id_aplicable: Optional[int] = None # ID del producto si aplica a uno específico, o null si es general
    fecha_inicio: date
    fecha_fin: date
    activa: bool = True

class PromocionCreate(PromocionBase):
    pass

class Promocion(PromocionBase):
    id: int

# ------ Simulación de Base de Datos en Memoria ------
promociones_db: List[Promocion] = []
id_counter = 1

# Semilla de ejemplos
def inicializar_bd():
    global id_counter
    if not promociones_db:
        ejemplos = [
            Promocion(
                id=1, 
                nombre="Descuento de Verano", 
                descripcion="20% de descuento en todos los panes dulces",
                descuento_porcentaje=20.0,
                producto_id_aplicable=None,
                fecha_inicio=date(2026, 6, 1),
                fecha_fin=date(2026, 8, 31),
                activa=True
            ),
            Promocion(
                id=2, 
                nombre="Mitad de precio en Conchas", 
                descripcion="Conchas de vainilla a mitad de precio solo hoy",
                descuento_porcentaje=50.0,
                producto_id_aplicable=2, # Asumiendo que 2 es el ID de la Concha en Inventario
                fecha_inicio=date.today(),
                fecha_fin=date.today(),
                activa=True
            )
        ]
        promociones_db.extend(ejemplos)
        id_counter = 3

inicializar_bd()

# ------ Aplicación FastAPI principal ------
app = FastAPI(
    title="API de Promociones - Panadería",
    description="API para gestionar las promociones aplicables al inventario. (Módulo basado en inventario)",
    version="1.0.0"
)

@app.get("/promociones", response_model=List[Promocion], tags=["Promociones"])
def obtener_promociones():
    """Obtener todas las promociones registradas."""
    return promociones_db

@app.get("/promociones/{promocion_id}", response_model=Promocion, tags=["Promociones"])
def obtener_promocion(promocion_id: int):
    """Busca una promoción particular por su identificador único (ID)."""
    promocion = next((p for p in promociones_db if p.id == promocion_id), None)
    if promocion is None:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    return promocion

@app.post("/promociones", response_model=Promocion, status_code=201, tags=["Promociones"])
def crear_promocion(promocion_base: PromocionCreate):
    """Registra una nueva promoción para el inventario."""
    global id_counter
    nueva_promocion = Promocion(id=id_counter, **promocion_base.model_dump())
    promociones_db.append(nueva_promocion)
    id_counter += 1
    return nueva_promocion

@app.put("/promociones/{promocion_id}", response_model=Promocion, tags=["Promociones"])
def actualizar_promocion(promocion_id: int, promocion_actualizada: PromocionCreate):
    """Modifica la información de una promoción existente."""
    for index, p in enumerate(promociones_db):
        if p.id == promocion_id:
            promocion_modificada = Promocion(id=promocion_id, **promocion_actualizada.model_dump())
            promociones_db[index] = promocion_modificada
            return promocion_modificada
            
    raise HTTPException(status_code=404, detail="Promoción no encontrada")

@app.delete("/promociones/{promocion_id}", status_code=204, tags=["Promociones"])
def eliminar_promocion(promocion_id: int):
    """Elimina permanentemente una promoción."""
    global promociones_db
    promocion = next((p for p in promociones_db if p.id == promocion_id), None)
    if promocion is None:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
        
    promociones_db = [p for p in promociones_db if p.id != promocion_id]
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Promociones:app", host="0.0.0.0", port=8001, reload=True)
