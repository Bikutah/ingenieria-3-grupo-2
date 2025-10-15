from sqlalchemy import Column, Integer, String, Boolean, event
from sqlalchemy.orm import declarative_base
from ..database import Base

class Mozo(Base):
    __tablename__ = "mozos"

    id = Column(Integer, primary_key=True, index=True)
    legajo = Column(String, unique=True, index=True)
    dni = Column(String, unique=True, nullable=False)
    nombre = Column(String, nullable=False)
    apellido = Column(String, nullable=False)
    direccion = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    baja = Column(Boolean, default=False)

    def __repr__(self):
        return f"<Mozo(nombre='{self.nombre}', apellido='{self.apellido}', legajo='{self.legajo}')>"

@event.listens_for(Mozo, "before_insert")
def generar_legajo(mapper, connection, target):
    """Genera el legajo antes de insertar el registro."""
    if not target.legajo and target.nombre and target.apellido and target.dni:
        inicial_nombre = target.nombre[0].upper()
        inicial_apellido = target.apellido[0].upper()
        ultimos_digitos_dni = target.dni[-4:]
        target.legajo = f"{inicial_nombre}{inicial_apellido}{ultimos_digitos_dni}"
