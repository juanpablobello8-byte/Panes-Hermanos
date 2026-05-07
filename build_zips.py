import os
import zipfile
import json
import shutil

backend_dir = os.path.join(os.path.dirname(__file__), "backend")
zips_dir = os.path.join(os.path.dirname(__file__), "plugins_zips")
os.makedirs(zips_dir, exist_ok=True)

plugins = [
    {"id": "mermas", "name": "Mermas", "file": "Mermas.py", "route": "/api/mermas", "menu_class": "menu-mermas"},
    {"id": "ordenes", "name": "Órdenes de Horneado", "file": "Ordenes.py", "route": "/api/ordenes", "menu_class": "menu-ordenes"}, # Note: HTML uses menu-ordenes? Wait, check index.html.
    {"id": "promociones", "name": "Promociones", "file": "Promociones.py", "route": "/api/promociones", "menu_class": "menu-promociones"},
    {"id": "recetas", "name": "Recetas", "file": "Recetas.py", "route": "/api/recetas", "menu_class": "menu-recetas"},
    {"id": "insumos", "name": "Carga de Insumos", "file": "Insumos.py", "route": "/api/insumos", "menu_class": "menu-insumos"}
]

for p in plugins:
    # Check if backend file exists
    py_path = os.path.join(backend_dir, p["file"])
    if not os.path.exists(py_path):
        print(f"Skipping {p['name']}, file not found.")
        continue
        
    zip_path = os.path.join(zips_dir, f"plugin_{p['id']}.zip")
    with zipfile.ZipFile(zip_path, 'w') as zf:
        # Add backend file
        zf.write(py_path, "backend.py")
        # Add manifest
        manifest = {
            "id": p["id"],
            "name": p["name"],
            "api_route": p["route"],
            "menu_class": p["menu_class"]
        }
        zf.writestr("manifest.json", json.dumps(manifest, indent=4))
    
    print(f"Created {zip_path}")
    
    # Remove from backend so it truly acts as a plugin
    os.remove(py_path)
    
print("Done creating plugins!")
