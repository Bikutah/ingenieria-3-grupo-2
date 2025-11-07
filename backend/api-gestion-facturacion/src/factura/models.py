from sqlalchemy import Column, Integer, Float, String, DateTime, func, ForeignKey, Enum
from sqlalchemy.orm import relationship
from ..database import Base
import enum

class MedioPago(enum.Enum):
    transferencia = "transferencia"
    debito = "debito"
    credito = "credito"
    efectivo = "efectivo"

class EstadoFactura(enum.Enum):
    pendiente = "pendiente"
    pagada = "pagada"
    cancelada = "cancelada"
    anulada = "anulada"

class Factura(Base):
    __tablename__ = "facturas"  

    id = Column(Integer, primary_key=True, index=True)
    id_comanda = Column(Integer, index=True, nullable=False)  
    fecha_emision = Column(DateTime, server_default=func.now(), index=True, nullable=False)
    total = Column(Float, nullable=False)
    medio_pago = Column(Enum(MedioPago), nullable=False)
    estado = Column(Enum(EstadoFactura), default=EstadoFactura.pendiente, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)

    # Relación con detalles
    detalles_factura = relationship("DetalleFactura", back_populates="factura")

class DetalleFactura(Base):
    __tablename__ = "detalle_facturas"  

    id = Column(Integer, primary_key=True, index=True)
    id_factura = Column(Integer, ForeignKey("facturas.id"), index=True, nullable=False)
    id_producto = Column(Integer, index=True, nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)  

    # Relación con Factura
    factura = relationship("Factura", back_populates="detalles_factura")
