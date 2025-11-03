from sqlalchemy import Column, Integer, String, DateTime, func, Float, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base
from .schemas import TipoProducto # Importamos el Enum para usarlo en la columna

class Productos(Base):
    __tablename__ = "productos" # Nombre de la tabla
    id = Column(Integer, primary_key=True, index=True) 
    nombre = Column(String(100), index=True, nullable=False, unique=True)
    tipo = Column(Enum(TipoProducto), nullable=False)
    precio = Column(Float, nullable=False)
    descripcion = Column(String(255), nullable=True)
    cm3 = Column(Integer, nullable=True)
    baja = Column(Boolean, default=False, nullable=False)
    id_carta = Column(Integer, ForeignKey("cartas.id"), nullable=False) # Clave foránea a la tabla de cartas
    created_at = Column(DateTime, server_default=func.now(), index=True)

    carta = relationship("Carta", back_populates="productos") # Relación con el modelo Carta
