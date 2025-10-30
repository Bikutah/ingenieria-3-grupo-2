from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from ..productos.schemas import ProductosOut # Importar el esquema de ProductosOut


class CartaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre de la seccion")
    baja: bool = Field(False, description="Indica si el producto está dado de baja (True) o activo (False)")


class CartaCreate(CartaBase):
    pass

class CartaModify(CartaBase):
    """Esquema para modificar una carta. Todos los campos son opcionales."""
    nombre: Optional[str] = Field(None, min_length=1, max_length=40)
    baja: Optional[bool] = None



class CartaOut(CartaBase):
    id: int
    productos: List[ProductosOut] = [] # Lista de productos asociados a esta carta
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM
