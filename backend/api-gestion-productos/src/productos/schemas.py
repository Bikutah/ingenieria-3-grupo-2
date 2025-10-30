from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from enum import Enum

class TipoProducto(str, Enum):
    """Enumeración para los tipos de producto."""
    PLATO = "plato"
    POSTRE = "postre"
    BEBIDA = "bebida"


class ProductosBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=40, description="Nombre del producto")
    tipo: TipoProducto = Field(..., description="Tipo de producto (plato, postre, bebida)")
    precio: float = Field(..., gt=0, description="Precio del producto")
    descripcion: Optional[str] = Field(None, max_length=255, description="Descripción opcional del producto")
    cm3: Optional[int] = Field(None, gt=0, description="Volumen en cm3 (solo para bebidas)")
    id_carta: int = Field(..., description="ID de la carta a la que pertenece el producto")
    baja: bool = Field(False, description="Indica si el producto está dado de baja (True) o activo (False)")


class ProductosCreate(ProductosBase):
    """Esquema para la creación de un nuevo producto."""
    pass


class ProductosModify(ProductosBase):
    """Esquema para modificar un producto. Todos los campos son opcionales."""
    nombre: Optional[str] = Field(None, min_length=1, max_length=40)
    tipo: Optional[TipoProducto] = None
    precio: Optional[float] = Field(None, gt=0)
    descripcion: Optional[str] = Field(None, max_length=255)
    cm3: Optional[int] = Field(None, gt=0)
    id_carta: Optional[int] = Field(None, description="ID de la carta a la que pertenece el producto")
    baja: Optional[bool] = None


class ProductosOut(ProductosBase):
    """Esquema para devolver un producto en la respuesta de la API."""
    id: int
    model_config = ConfigDict(from_attributes=True)
