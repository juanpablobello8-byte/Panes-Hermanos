from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from core.database import supabase
from typing import List, Dict, Any, Optional
from datetime import datetime

# ------ Aplicación FastAPI principal ------
app = FastAPI(
    title="API de Reportes - Panadería",
    description="API para consultar información analítica y reportes automáticos guardados en Supabase.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/guardados", tags=["Reportes Guardados"])
def obtener_reportes_guardados(tipo: Optional[str] = None):
    """
    Obtiene todos los reportes estáticos generados automáticamente (ej. Ventas cruzadas, pedidos de material) 
    que están guardados físcamente en la base de datos para su posterior lectura.
    """
    consulta = supabase.table('reportes').select('*')
    if tipo:
        consulta = consulta.eq('tipo_reporte', tipo)
        
    response = consulta.execute()
    return response.data

@app.get("/guardados/{reporte_id}", tags=["Reportes Guardados"])
def obtener_reporte_guardado(reporte_id: int):
    """Recupera el contenido de un reporte guardado por su ID."""
    response = supabase.table('reportes').select('*').eq('id', reporte_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return response.data[0]


@app.get("/ventas/resumen", tags=["Reportes de Ventas"])
def resumen_ventas_general():
    """Genera un reporte del total histórico de ventas e ingresos."""
    response = supabase.table('ventas').select('total').execute()
    ventas = response.data
    
    total_ingresos = sum([v['total'] for v in ventas])
    total_transacciones = len(ventas)
    
    return {
        "total_transacciones": total_transacciones,
        "total_ingresos": total_ingresos,
        "promedio_por_venta": total_ingresos / total_transacciones if total_transacciones > 0 else 0
    }

@app.get("/ventas/dia", tags=["Reportes de Ventas"])
def resumen_ventas_dia():
    """Calcula las ventas y total de ingresos del día actual (en hora local del servidor)."""
    response = supabase.table('ventas').select('total, fecha_venta').execute()
    ventas = response.data
    
    hoy = datetime.now().date()
    ventas_hoy = []
    for v in ventas:
        try:
            # Convertir UTC → hora local antes de comparar la fecha
            fecha = datetime.fromisoformat(v['fecha_venta'].replace('Z', '+00:00')).astimezone().date()
            if fecha == hoy:
                ventas_hoy.append(v)
        except Exception:
            pass

    total_ingresos = sum([v['total'] for v in ventas_hoy])
    return {
        "ventas_hoy": len(ventas_hoy),
        "total_ingresos": total_ingresos
    }

@app.get("/ventas/mes", tags=["Reportes de Ventas"])
def resumen_ventas_mes():
    """Calcula las ventas y total de ingresos del mes actual (en hora local del servidor)."""
    response = supabase.table('ventas').select('total, fecha_venta').execute()
    ventas = response.data
    
    hoy = datetime.now()
    ventas_mes = []
    for v in ventas:
        try:
            # Convertir UTC → hora local antes de comparar mes/año
            fecha = datetime.fromisoformat(v['fecha_venta'].replace('Z', '+00:00')).astimezone()
            if fecha.year == hoy.year and fecha.month == hoy.month:
                ventas_mes.append(v)
        except Exception:
            pass

    total_ingresos = sum([v['total'] for v in ventas_mes])
    return {
        "ventas_mes": len(ventas_mes),
        "total_ingresos": total_ingresos
    }

@app.get("/productos/mas_vendidos", tags=["Reportes de Análisis"])
def productos_mas_vendidos():
    """Calcula y devuelve los productos que más se han vendido históricamente."""
    # Obtenemos todos los detalles de venta
    response = supabase.table('detalles_venta').select('producto_id, cantidad').execute()
    detalles = response.data
    
    # Agrupamos cantidades por producto_id
    conteo_productos: Dict[int, int] = {}
    for d in detalles:
        pid = d.get('producto_id')
        if pid is not None:
            conteo_productos[pid] = conteo_productos.get(pid, 0) + d['cantidad']
            
    # Obtenemos información de los productos
    if not conteo_productos:
        return []
        
    pids = list(conteo_productos.keys())
    response_prod = supabase.table('productos').select('id, nombre').in_('id', pids).execute()
    productos_info = {p['id']: p['nombre'] for p in response_prod.data}
    
    # Construimos el reporte ordenado
    reporte = []
    for pid, cantidad in conteo_productos.items():
        reporte.append({
            "producto_id": pid,
            "nombre_producto": productos_info.get(pid, "Desconocido"),
            "cantidad_total_vendida": cantidad
        })
        
    # Ordenar de mayor a menor ventas
    reporte = sorted(reporte, key=lambda x: x['cantidad_total_vendida'], reverse=True)
    return reporte

@app.get("/clientes/actividad", tags=["Reportes de Clientes"])
def actividad_clientes():
    """
    (Módulo en preparación). 
    Proyecta un formato de repote de los clientes una vez que la base de datos integre cuentas de clientes fieles.
    """
    # En un entorno real, aquí haríamos join con una tabla 'clientes'. 
    # Por ahora devolvemos un esquema base.
    return {
        "mensaje": "El módulo de reporte de clientes CRM está preparado. Requiere agregar tabla 'clientes'.",
        "mock_data": [
            {"cliente_id": 1, "nombre": "Cliente Frecuente A", "compras_totales": 12},
            {"cliente_id": 2, "nombre": "Cliente Puntos B", "compras_totales": 5}
        ]
    }

if __name__ == "__main__":
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import uvicorn
    uvicorn.run("Reportes:app", host="0.0.0.0", port=8003, reload=True)
