from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import List, Optional, Literal
from enum import Enum

# Enums para coincidir con los modelos
class MedioPago(str, Enum):
    transferencia = "transferencia"
    debito = "debito"
    credito = "credito"
    efectivo = "efectivo"

class EstadoFactura(str, Enum):
    pendiente = "pendiente"
    pagada = "pagada"
    cancelada = "cancelada"
    anulada = "anulada"

# Schemas para DetalleFactura
class DetalleFacturaBase(BaseModel):
    id_producto: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)
    precio_unitario: float = Field(..., gt=0)
    subtotal: float = Field(..., gt=0)

class DetalleFacturaCreate(DetalleFacturaBase):
    pass

class DetalleFacturaOut(DetalleFacturaBase):
    id: int
    id_factura: int
    model_config = ConfigDict(from_attributes=True)

# Schemas para Factura
class FacturaBase(BaseModel):
    id_comanda: int = Field(..., gt=0)
    total: float = Field(..., gt=0)
    medio_pago: MedioPago
    estado: EstadoFactura = EstadoFactura.pendiente

class FacturaCreate(FacturaBase):
    """Para crear factura - estado siempre pendiente inicialmente"""
    estado: Literal["pendiente"] = "pendiente"  
    detalles_factura: List[DetalleFacturaCreate] = Field(..., min_length=1)

class FacturaOut(FacturaBase):
    id: int
    fecha_emision: datetime
    detalles_factura: List[DetalleFacturaOut] = []
    model_config = ConfigDict(from_attributes=True)

# Schemas para operaciones específicas
class FacturaUpdateEstado(BaseModel):
    """Para marcar como pagada, cancelada o anulada"""
    estado: EstadoFactura = Field(..., description="Nuevo estado de la factura")

class FacturaList(BaseModel):
    """Para listados con paginación"""
    id: int
    id_comanda: int
    fecha_emision: datetime
    total: float
    medio_pago: MedioPago
    estado: EstadoFactura
    model_config = ConfigDict(from_attributes=True)
