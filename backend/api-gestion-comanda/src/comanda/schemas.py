from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import List

#Schema para Detalle Comanda
class DetalleComandaBase(BaseModel):
    id_producto: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)
    precio_unitario: float = Field(..., gt=0)

class DetalleComandaCreate(DetalleComandaBase):
    pass

class DetalleComandaOut(DetalleComandaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

#Schemas para Comanda
class ComandaBase(BaseModel):
    id_mesa: int = Field(..., gt=0)
    id_mozo: int = Field(..., gt=0)
    id_reserva: int | None = Field(None, gt=0)
    fecha: date
    baja: bool = False

class ComandaCreate(ComandaBase):
    detalles_comanda: List[DetalleComandaCreate] = Field(..., min_length=1)

class ComandaOut(ComandaBase):
    id: int
    detalles_comanda: List[DetalleComandaOut] = []
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM
