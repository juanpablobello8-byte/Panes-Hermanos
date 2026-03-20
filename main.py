from fastapi import FastAPI
from conexion import engine, Base
import modelos_ventas
from routers import ventas

# Crea las tablas en la base de datos sqlite al iniciar
modelos_ventas.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Punto de Venta Panadería", 
    description="API para el módulo de ventas",
    version="1.0.0"
)

# Inicializamos el router de ventas
app.include_router(ventas.router)

@app.get("/")
def root():
    return {
        "mensaje": "Bienvenido al Sistema POS de la Panadería. Abre /docs en tu navegador para ver y probar los endpoints."
    }
