from pydantic import BaseModel, Field, ConfigDict

class CartaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class CartaCreate(CartaBase):
    pass

class CartaOut(CartaBase):
    id: int
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM
