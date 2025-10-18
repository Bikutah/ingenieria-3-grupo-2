from sqlalchemy import Column, Integer, String, DateTime, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Mesas(Base):
    __tablename__ = "mesas" 

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, index=True)  
    tipo = Column(String)  
    cantidad = Column(Integer)  
    baja = Column(Boolean, nullable=False, server_default="0", index=True)
    id_sector = Column(Integer, ForeignKey("sectores.id"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)

    # Relación con sectores
    sector = relationship("Sectores", back_populates="mesas")