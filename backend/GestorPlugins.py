from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import zipfile
import json
import shutil
from typing import List

app = APIRouter()

PLUGINS_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "plugins.json")
BACKEND_PLUGINS_DIR = os.path.join(os.path.dirname(__file__), "plugins_backend")
FRONTEND_PLUGINS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "plugins")

# Ensure directories exist
os.makedirs(BACKEND_PLUGINS_DIR, exist_ok=True)
os.makedirs(FRONTEND_PLUGINS_DIR, exist_ok=True)
if not os.path.exists(PLUGINS_CONFIG_FILE):
    with open(PLUGINS_CONFIG_FILE, "w") as f:
        json.dump({"active_plugins": []}, f)

def get_config():
    with open(PLUGINS_CONFIG_FILE, "r") as f:
        return json.load(f)

def save_config(config):
    with open(PLUGINS_CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=4)

@app.get("/activos")
def get_active_plugins():
    return get_config().get("active_plugins", [])

@app.post("/upload")
async def upload_plugin(file: UploadFile = File(...)):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un .zip")
    
    temp_zip_path = os.path.join(BACKEND_PLUGINS_DIR, "temp.zip")
    with open(temp_zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            # Check manifest
            if 'manifest.json' not in zip_ref.namelist():
                raise HTTPException(status_code=400, detail="El zip no contiene manifest.json")
            
            with zip_ref.open('manifest.json') as f:
                manifest = json.load(f)
                
            plugin_id = manifest.get('id')
            if not plugin_id:
                raise HTTPException(status_code=400, detail="manifest.json inválido: falta 'id'")
                
            # Extract backend
            if 'backend.py' in zip_ref.namelist():
                zip_ref.extract('backend.py', BACKEND_PLUGINS_DIR)
                os.rename(os.path.join(BACKEND_PLUGINS_DIR, 'backend.py'), os.path.join(BACKEND_PLUGINS_DIR, f"{plugin_id}.py"))
                
            # Extract frontend
            frontend_plugin_dir = os.path.join(FRONTEND_PLUGINS_DIR, plugin_id)
            os.makedirs(frontend_plugin_dir, exist_ok=True)
            if 'ui.html' in zip_ref.namelist():
                zip_ref.extract('ui.html', frontend_plugin_dir)
            if 'logic.js' in zip_ref.namelist():
                zip_ref.extract('logic.js', frontend_plugin_dir)
                
            # Update config
            config = get_config()
            active = config.get("active_plugins", [])
            
            # Remove old entry if exists
            active = [p for p in active if p['id'] != plugin_id]
            active.append(manifest)
            config["active_plugins"] = active
            save_config(config)
            
            return {"status": "success", "message": f"Plugin {plugin_id} instalado correctamente", "manifest": manifest}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_zip_path):
            os.remove(temp_zip_path)

@app.delete("/uninstall/{plugin_id}")
def uninstall_plugin(plugin_id: str):
    config = get_config()
    active = config.get("active_plugins", [])
    
    # Check if plugin is in config
    if not any(p['id'] == plugin_id for p in active):
        raise HTTPException(status_code=404, detail="Plugin no encontrado")
        
    # Remove from config
    active = [p for p in active if p['id'] != plugin_id]
    config["active_plugins"] = active
    save_config(config)
    
    # Remove backend file
    backend_file = os.path.join(BACKEND_PLUGINS_DIR, f"{plugin_id}.py")
    if os.path.exists(backend_file):
        os.remove(backend_file)
        
    # Remove frontend dir
    frontend_plugin_dir = os.path.join(FRONTEND_PLUGINS_DIR, plugin_id)
    if os.path.exists(frontend_plugin_dir):
        shutil.rmtree(frontend_plugin_dir)
        
    return {"status": "success", "message": f"Plugin {plugin_id} extraído. Datos conservados en BD."}
