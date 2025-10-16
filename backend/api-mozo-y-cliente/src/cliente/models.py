from sqlalchemy import Column, Integer, String, DateTime, func
from ..database import Base

class Cliente(Base):
    __tablename__ = "clientes" # Nombre de la tabla

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
