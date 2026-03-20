# modelos_ventas.py
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime
from conexion import Base # 

class VentaDB(Base):
    __tablename__ = "ventas"
    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, index=True, nullable=False) # Se conecta con Empleados
    fecha = Column(DateTime, default=datetime.utcnow)
    total = Column(Float, nullable=False, default=0.0)
    metodo_pago = Column(String(50), nullable=False, default="Efectivo")
    estado = Column(String(50), nullable=False, default="Completada")
    
    # Relación para saber qué panes se vendieron en este ticket
    detalles = relationship("DetalleVentaDB", back_populates="venta")

class DetalleVentaDB(Base):
    __tablename__ = "detalles_venta"
    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    producto_id = Column(Integer, index=True, nullable=False) # Se conecta con Inventario
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    
    venta = relationship("VentaDB", back_populates="detalles")