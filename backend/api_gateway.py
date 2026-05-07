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
from Empleados import app as app_empleados
from Pedidos import app as app_pedidos

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

# Montamos los microservicios base
app.mount("/api/inventario", app_inventario)
app.mount("/api/ventas", app_ventas)
app.mount("/api/empleados", app_empleados)
app.mount("/api/pedidos", app_pedidos)

# Microservicios que serán extraídos a plugins (los mantenemos por ahora mientras hacemos la transición)
app.mount("/api/reportes", app_reportes)
# NOTA: Promociones, Recetas, Ordenes, Mermas e Insumos ya fueron extraidos a plugins.

from GestorPlugins import app as app_gestor_plugins
app.include_router(app_gestor_plugins, prefix="/api/gestor-plugins")

# Y cargamos los plugins dinámicos
import json
import importlib.util
plugins_config_path = os.path.join(os.path.dirname(__file__), "plugins.json")
plugins_dir = os.path.join(os.path.dirname(__file__), "plugins_backend")
if os.path.exists(plugins_config_path):
    with open(plugins_config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
        for plugin in config.get("active_plugins", []):
            pid = plugin.get("id")
            proute = plugin.get("api_route")
            p_file = os.path.join(plugins_dir, f"{pid}.py")
            if os.path.exists(p_file):
                spec = importlib.util.spec_from_file_location(pid, p_file)
                module = importlib.util.module_from_spec(spec)
                sys.modules[pid] = module
                spec.loader.exec_module(module)
                if hasattr(module, "app"):
                    app.mount(proute, module.app)

if __name__ == "__main__":
    import uvicorn
    # Ejecutar este archivo inicia todo el sistema en un solo puerto
    uvicorn.run("api_gateway:app", host="0.0.0.0", port=8000, reload=False)
