from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import List, Optional

# Schemas para DetalleMenu
class DetalleMenuBase(BaseModel):
    id_producto: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)
    precio: float = Field(..., gt=0)

class DetalleMenuCreate(DetalleMenuBase):
    pass

class DetalleMenuOut(DetalleMenuBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Schemas para MenuReserva
class MenuReservaBase(BaseModel):
    monto_seña: Optional[float] = Field(None, ge=0)

class MenuReservaCreate(MenuReservaBase):
    detalles_menu: List[DetalleMenuCreate] = Field(..., min_items=1)

class MenuReservaOut(MenuReservaBase):
    id: int
    id_reserva: int
    detalles_menu: List[DetalleMenuOut] = []
    model_config = ConfigDict(from_attributes=True)

# Schemas para Reserva
class ReservaBase(BaseModel):
    fecha: datetime
    horario: str = Field(..., min_length=1, max_length=10)
    cantidad_personas: int = Field(..., gt=0)
    id_mesa: int = Field(..., gt=0)
    id_cliente: int = Field(..., gt=0)
    baja: bool = False

class ReservaCreate(ReservaBase):
    menu_reservas: List[MenuReservaCreate] = []

class ReservaUpdate(BaseModel):
    fecha: Optional[datetime] = None
    horario: Optional[str] = Field(None, min_length=1, max_length=10)
    cantidad_personas: Optional[int] = Field(None, gt=0)
    id_mesa: Optional[int] = Field(None, gt=0)
    id_cliente: Optional[int] = Field(None, gt=0)
    baja: Optional[bool] = None

class ReservaOut(ReservaBase):
    id: int
    menu_reservas: List[MenuReservaOut] = []
    model_config = ConfigDict(from_attributes=True)