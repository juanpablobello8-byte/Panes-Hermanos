from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from typing import List, Optional

# ------ Configuración de Base de Datos ------
# Creará un archivo 'panaderia.db' en tu carpeta local
SQLALCHEMY_DATABASE_URL = "sqlite:///./panaderia.db"

# connect_args={"check_same_thread": False} se requiere en SQLite al usarse con FastAPI
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ------ Modelo SQLAlchemy (Tabla de Base de Datos real) ------
class DBProducto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    descripcion = Column(String, nullable=True)
    precio = Column(Float)
    cantidad_en_stock = Column(Integer)
    categoria = Column(String)

# Crear las tablas automáticamente en el archivo SQLite
Base.metadata.create_all(bind=engine)

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

    model_config = {"from_attributes": True}

# ------ Aplicación FastAPI principal ------
app = FastAPI(
    title="API de Inventario - Panadería",
    description="API para gestionar el inventario de un punto de venta con Base de Datos SQLite persistente.",
    version="2.0.0"
)

# Dependencia para abrir una sesión con la base de datos por cada petición
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/productos", response_model=List[Producto], tags=["Inventario"])
def obtener_productos(db: Session = Depends(get_db)):
    """Obtener todos los productos registrados en la base de datos."""
    productos = db.query(DBProducto).all()
    return productos

@app.get("/productos/{producto_id}", response_model=Producto, tags=["Inventario"])
def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    """Busca un producto particular por su identificador único (ID)."""
    producto = db.query(DBProducto).filter(DBProducto.id == producto_id).first()
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@app.post("/productos", response_model=Producto, status_code=201, tags=["Inventario"])
def crear_producto(producto: ProductoCreate, db: Session = Depends(get_db)):
    """Registra un nuevo tipo de pan o producto en la base de datos."""
    nuevo_producto = DBProducto(**producto.model_dump())
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    return nuevo_producto

@app.put("/productos/{producto_id}", response_model=Producto, tags=["Inventario"])
def actualizar_producto(producto_id: int, producto_actualizado: ProductoCreate, db: Session = Depends(get_db)):
    """Modifica la información (como precio o existencias) de un producto guardado."""
    producto = db.query(DBProducto).filter(DBProducto.id == producto_id).first()
    
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    for key, value in producto_actualizado.model_dump().items():
        setattr(producto, key, value)
        
    db.commit()
    db.refresh(producto)
    return producto

@app.delete("/productos/{producto_id}", status_code=204, tags=["Inventario"])
def eliminar_producto(producto_id: int, db: Session = Depends(get_db)):
    """Elimina permanentemente un producto del catálogo de la panadería."""
    producto = db.query(DBProducto).filter(DBProducto.id == producto_id).first()
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    db.delete(producto)
    db.commit()
    return None

# Semilla (Seeding) de ejemplos para que no empiece vacío si es primera vez
def inicializar_bd():
    db = SessionLocal()
    if db.query(DBProducto).count() == 0:
        ejemplos = [
            DBProducto(nombre="Pan Francés", descripcion="Bolillo tradicional", precio=3.50, cantidad_en_stock=100, categoria="Salado"),
            DBProducto(nombre="Concha de Vainilla", descripcion="Con cobertura clásica", precio=12.00, cantidad_en_stock=50, categoria="Dulce"),
            DBProducto(nombre="Oreja", descripcion="Pan hojaldrado crujiente con azúcar", precio=14.00, cantidad_en_stock=40, categoria="Dulce")
        ]
        db.add_all(ejemplos)
        db.commit()
    db.close()

# Si se ejecuta directamente (no a través de uvicorn en consola) se inician las tablas:
inicializar_bd()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Inventario:app", host="0.0.0.0", port=8000, reload=True)
