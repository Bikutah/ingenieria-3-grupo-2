from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, nullable=False, index=True)
    horario = Column(String, nullable=False)
    cantidad_personas = Column(Integer, nullable=False)
    id_mesa = Column(Integer, nullable=False)
    id_cliente = Column(Integer, nullable=False)
    baja = Column(Boolean, default=False)
    
    # Relación con MenuReserva
    menu_reservas = relationship("MenuReserva", back_populates="reserva")

class MenuReserva(Base):
    __tablename__ = "menu_reserva"
    
    id = Column(Integer, primary_key=True, index=True)
    id_reserva = Column(Integer, ForeignKey('reservas.id'), nullable=False)
    monto_seña = Column(Float, nullable=True)
    
    # Relaciones
    reserva = relationship("Reserva", back_populates="menu_reservas")
    detalles_menu = relationship("DetalleMenu", back_populates="menu_reserva")

class DetalleMenu(Base):
    __tablename__ = "detalle_menu"
    
    id = Column(Integer, primary_key=True, index=True)
    id_menu_reserva = Column(Integer, ForeignKey('menu_reserva.id'), nullable=False)
    id_producto = Column(Integer, nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio = Column(Float, nullable=False)
    
    # Relación con MenuReserva
    menu_reserva = relationship("MenuReserva", back_populates="detalles_menu")