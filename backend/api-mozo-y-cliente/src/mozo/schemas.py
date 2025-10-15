from pydantic import BaseModel, Field, ConfigDict

class MozoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class MozoCreate(MozoBase):
    pass

class MozoOut(MozoBase):
    id: int
    legajo: str
    dni: str
    nombre: str
    apellido: str
    direccion: str | None = None
    telefono: str | None = None
    baja: bool
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM
