import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.exceptions import POSException
from api.api_router import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Servicio Avanzado de Empleados - Punto de Venta",
    description="Backend Avanzado para el Módulo de Empleados del Sistema POS",
    version="2.0.0",
    docs_url="/docs",
)

# CORS estricto
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        # Restricción de headers para no exponer info vital en la terminal POS web
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Branch-ID"],
    )

# Capturas de errores estructurados para los cajeros POS
@app.exception_handler(POSException)
async def pos_exception_handler(request: Request, exc: POSException):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail, # Contiene el "error_code" parseable por el frontend react
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={
            "error_code": "ERR_VALIDATION_FAILED", 
            "message": "Los datos proporcioados tienen errores",
            "details": exc.errors()
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"FATAL POS ERROR 500: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error_code": "ERR_INTERNAL_SERVER", "message": "Error crítico. Favor de detener operación en caja temporalmente."},
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
