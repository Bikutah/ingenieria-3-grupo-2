from pydantic import BaseModel, Field, ConfigDict

class FacturaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class FacturaCreate(FacturaBase):
    pass

class FacturaOut(FacturaBase):
    id: int
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM
