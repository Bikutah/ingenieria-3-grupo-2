from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import List
from enum import Enum


class EstadoComanda(str, Enum):
    pendiente = "pendiente"
    pagada = "pagada"
    cancelada = "cancelada"
    anulada = "anulada"
    facturada = "facturada"


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
    id_reserva: int | None = None
    fecha: date
    estado: EstadoComanda = EstadoComanda.pendiente

class ComandaCreate(ComandaBase):
    detalles_comanda: List[DetalleComandaCreate] = Field(..., min_length=1)

class ComandaOut(ComandaBase):
    id: int
    detalles_comanda: List[DetalleComandaOut] = []
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM
