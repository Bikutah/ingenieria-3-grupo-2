from sqlalchemy import Column, Integer, String, DateTime, Boolean,func
from ..database import Base

class Cliente(Base):
    __tablename__ = "clientes" # Nombre de la tabla

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    apellido = Column(String, index=True)
    dni = Column(String, index=True)
    telefono = Column(String)
    baja = Column(Boolean, nullable=False, server_default="0", index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
