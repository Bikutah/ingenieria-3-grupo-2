from sqlalchemy import Column, Integer, Float, String, Date, func, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from ..database import Base
import enum

class EstadoComanda(enum.Enum):
    pendiente = "pendiente"
    pagada = "pagada"
    cancelada = "cancelada"
    anulada = "anulada"
    facturada = "facturada"

class Comanda(Base):
    __tablename__ = "comandas" # Nombre de la tabla

    id = Column(Integer, primary_key=True, index=True)
    id_mesa = Column(Integer, index=True, nullable=False)
    id_mozo = Column(Integer, index=True, nullable=False)
    id_reserva = Column(Integer, index=True, nullable=True)
    fecha = Column(Date, index=True, nullable=False)
    estado = Column(Enum(EstadoComanda), default=EstadoComanda.pendiente, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    
    # Relación con detalles
    detalles_comanda = relationship("DetalleComanda", back_populates="comanda")

##Detalle Comanda

class DetalleComanda(Base):
    __tablename__ = "detalle_comandas" # Nombre de la tabla

    id = Column(Integer, primary_key=True, index=True)
    id_comanda = Column(Integer, ForeignKey("comandas.id"), index=True, nullable=False)
    id_producto = Column(Integer, index=True, nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)

    #Relacion Comanda
    comanda = relationship("Comanda", back_populates="detalles_comanda")
