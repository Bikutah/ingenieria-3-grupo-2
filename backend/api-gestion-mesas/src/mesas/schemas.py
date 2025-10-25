from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional

def _clean_str(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return v or None

class MesasBase(BaseModel):
    numero: str = Field(..., min_length=1, max_length=50)
    tipo: str = Field(..., min_length=1, max_length=50)
    cantidad: int = Field(..., gt=0)
    id_sector: int = Field(..., gt=0)

    @field_validator("numero", "tipo", mode="before")
    @classmethod
    def _trim(cls, v):
        return _clean_str(v)

class MesasCreate(MesasBase):
    pass

class MesasModify(BaseModel):
    numero: Optional[str] = Field(None, min_length=1, max_length=50)
    tipo: Optional[str] = Field(None, min_length=1, max_length=50)
    cantidad: Optional[int] = Field(None, gt=0)
    id_sector: Optional[int] = Field(None, gt=0)
    baja: Optional[bool] = None

    @field_validator("numero", "tipo", mode="before")
    @classmethod
    def _trim(cls, v):
        return _clean_str(v)

class MesasOut(MesasBase):
    id: int
    baja: bool
    model_config = ConfigDict(from_attributes=True)

class MesasWithSectorOut(MesasOut):
    sector_nombre: str
    sector_numero: str