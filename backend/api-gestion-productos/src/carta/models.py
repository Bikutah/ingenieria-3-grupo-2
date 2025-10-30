from sqlalchemy import Column, Integer, String, DateTime, func, Boolean
from sqlalchemy.orm import relationship
from ..database import Base

class Carta(Base):
    __tablename__ = "cartas" # Nombre de la tabla

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), index=True, nullable=False, unique=True)
    baja = Column(Boolean, default=False, nullable=False) # Asegúrate de que esta columna exista si la usas en schemas
    
    productos = relationship("Productos", back_populates="carta") # Relación con el modelo Productos
