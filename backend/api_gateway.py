from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Aseguramos que los submódulos encuentren 'core'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Importamos las sub-aplicaciones
from Inventario import app as app_inventario
from Ventas import app as app_ventas
from Reportes import app as app_reportes
from Promociones import app as app_promociones
from Empleados import app as app_empleados

app = FastAPI(
    title="Panadería API Gateway",
    description="Servidor unificado que agrupa todos los microservicios en el puerto 8000.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montamos todos los microservicios en la raíz para mantener la URL sencilla para el frontend
app.mount("/api/inventario", app_inventario)
app.mount("/api/ventas", app_ventas)
app.mount("/api/reportes", app_reportes)
app.mount("/api/promociones", app_promociones)
app.mount("/api/empleados", app_empleados)

if __name__ == "__main__":
    import uvicorn
    # Ejecutar este archivo inicia todo el sistema en un solo puerto
    uvicorn.run("api_gateway:app", host="0.0.0.0", port=8000, reload=True)
