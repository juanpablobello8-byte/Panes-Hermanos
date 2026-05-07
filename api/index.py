import sys
import os

# Añadimos la carpeta backend al path para que Python encuentre los módulos
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, backend_path)

from api_gateway import app
