from pydantic import BaseModel, Field, ConfigDict

class ClienteBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class ClienteCreate(ClienteBase):
    pass

class ClienteOut(ClienteBase):
    id: int
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM
