from sqlalchemy import Column, Integer, String, DateTime, func, Boolean
from ..database import Base
from sqlalchemy.orm import relationship

class Sectores(Base):
    __tablename__ = "sectores" # Nombre de la tabla

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    numero = Column(String)
    baja = Column(Boolean, nullable=False, server_default="0", index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)

    mesas = relationship("Mesas", back_populates="sector")