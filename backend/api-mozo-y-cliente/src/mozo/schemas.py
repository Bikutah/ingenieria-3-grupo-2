from pydantic import BaseModel, Field

class MozoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class MozoOut(BaseModel):
    id: int
    nombre: str
