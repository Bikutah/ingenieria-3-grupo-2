from sqlalchemy import Column, Integer, String, DateTime, func , Boolean
from ..database import Base

class Carta(Base):
    __tablename__ = "cartas" # Nombre de la tabla

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    baja = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), index=True)
