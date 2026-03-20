# Panes-Hermanos - Advanced POS Employee Service

Este proyecto ha sido reestructurado para facilitar el desarrollo grupal. 

## Cambios Realizados

1. **Eliminación de persistencia (Base de Datos):** 
   - Se eliminaron todos los modelos SQLAlchemy, la conexión de base de datos (`db/`), y el archivo `.db`.
   - Las dependencias `sqlalchemy` y `alembic` fueron removidas de `requirements.txt`.
   - Los endpoints en `api/endpoints/` ahora usan datos simulados (MOCK) o placeholders para facilitar que el compañero encargado de la base de datos implemente la lógica de persistencia sin romper el flujo del API.

2. **Reestructuración de carpetas:**
   - Todo el código del servicio se movió a la carpeta `backend/` para permitir que otros módulos (como frontend u otros microservicios) tengan su propio espacio en el repositorio raíz.

3. **Estrategia de Ramas:**
   - **`main`**: Rama de producción (estable).
   - **`develop`**: Rama base de integración para desarrollo diario.
   - **`feature/backend-api-v1`**: Rama actual con la estructura limpia del API.

## Cómo empezar

1. Instalar dependencias dentro de `backend/`:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Ejecutar la aplicación:
   ```bash
   uvicorn main:app --reload
   ```

## Notas para el encargado de la Base de Datos

- En `backend/api/deps.py`, se deben reimplementar `get_db` y las dependencias de sesión.
- En `backend/api/endpoints/`, reemplazar los diccionarios mock por consultas reales.
- Se recomienda crear una nueva rama (ej. `feature/database-integration`) para estas tareas.

---
Enlace original: https://github.com/juanpablobello8-byte/Panes-Hermanos
