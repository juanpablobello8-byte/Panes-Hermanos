# routers/ventas.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from conexion import get_db
from modelos_ventas import VentaDB, DetalleVentaDB
from schema_ventas import VentaCreate, VentaOut

# router independiente
router = APIRouter(prefix="/ventas", tags=["Módulo de Ventas (Punto de Venta)"])

@router.post("", response_model=VentaOut, status_code=status.HTTP_201_CREATED)
def registrar_venta(venta_data: VentaCreate, db: Session = Depends(get_db)):
    """
    Registra una nueva venta en la panadería, calcula el total y guarda el detalle.
    """
    # Creamos la venta principal
    nueva_venta = VentaDB(
        empleado_id=venta_data.empleado_id, 
        total=0.0,
        metodo_pago=venta_data.metodo_pago,
        estado="Completada"
    )
    db.add(nueva_venta)
    db.commit()
    db.refresh(nueva_venta)
    
    total_calculado = 0.0
    
    # Procesa el carrito de compras (los detalles)
    for item in venta_data.productos:
        subtotal_item = item.cantidad * item.precio_unitario
        total_calculado += subtotal_item
        
        nuevo_detalle = DetalleVentaDB(
            venta_id=nueva_venta.id,
            producto_id=item.producto_id,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=subtotal_item
        )
        db.add(nuevo_detalle)
        
        # ---> AQUÍ SE CONECTA CON JUAN (INVENTARIOS) <---
        # Cuando Juan tenga su función lista:
        # inventario.descontar_stock(db, item.producto_id, item.cantidad)
    
    # Actualiza el total real de la venta
    nueva_venta.total = total_calculado
    db.commit()
    db.refresh(nueva_venta)
    
    return nueva_venta

@router.get("", response_model=List[VentaOut])
def obtener_historial_ventas(db: Session = Depends(get_db)):
    """
    Obtiene todas las ventas. (Jesús usará este endpoint para sus Reportes).
    """
    return db.query(VentaDB).all()

@router.get("/{venta_id}", response_model=VentaOut)
def obtener_detalle_venta(venta_id: int, db: Session = Depends(get_db)):
    """
    Busca una venta específica por su ID (Útil para reimprimir un ticket).
    """
    venta = db.query(VentaDB).filter(VentaDB.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta

@router.put("/{venta_id}/cancelar", response_model=VentaOut)
def cancelar_venta(venta_id: int, db: Session = Depends(get_db)):
    """
    Cancela una venta, cambia su estado y (en el futuro) avisa para devolver el inventario.
    """
    venta = db.query(VentaDB).filter(VentaDB.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    if venta.estado == "Cancelada":
        raise HTTPException(status_code=400, detail="La venta ya está cancelada")
        
    venta.estado = "Cancelada"
    
    # ---> AQUÍ SE CONECTA CON JUAN (INVENTARIOS) <---
    # Por cada detalle de venta:
    # for detalle in venta.detalles:
    #     inventario.devolver_stock(db, detalle.producto_id, detalle.cantidad)
    
    db.commit()
    db.refresh(venta)
    return venta

@router.get("/reportes/corte-dia", response_model=dict)
def corte_de_caja_dia(db: Session = Depends(get_db)):
    """
    Genera el corte de caja del día (solo ventas completadas).
    """
    from datetime import date
    hoy = date.today()
    
    ventas_hoy = db.query(VentaDB).filter(VentaDB.estado == "Completada").all()
    
    total_hoy = 0.0
    conteo_hoy = 0
    for v in ventas_hoy:
        if v.fecha.date() == hoy:
            total_hoy += v.total
            conteo_hoy += 1
            
    return {
        "fecha_corte": str(hoy),
        "ventas_realizadas": conteo_hoy,
        "ingresos_totales": total_hoy,
        "mensaje": "Corte de caja generado exitosamente"
    }