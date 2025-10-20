from sqlalchemy import Column, Integer, String, DateTime, func, Float, Boolean, Enum
from ..database import Base
from .schemas import TipoProducto # Importamos el Enum para usarlo en la columna

class Productos(Base):
    __tablename__ = "productos" # Nombre de la tabla (corregido de "productoss")

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), index=True, nullable=False, unique=True)
    tipo = Column(Enum(TipoProducto), nullable=False)
    precio = Column(Float, nullable=False)
    descripcion = Column(String(255), nullable=True)
    cm3 = Column(Integer, nullable=True)
    baja = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)
