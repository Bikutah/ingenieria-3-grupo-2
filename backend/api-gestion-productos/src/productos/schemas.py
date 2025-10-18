from pydantic import BaseModel, Field, ConfigDict

class ProductosBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class ProductosCreate(ProductosBase):
    pass

class ProductosOut(ProductosBase):
    id: int
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM
