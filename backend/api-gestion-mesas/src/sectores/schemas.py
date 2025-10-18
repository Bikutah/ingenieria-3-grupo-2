from pydantic import BaseModel, Field, ConfigDict, field_validator

def _clean_str(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return v or None

class SectoresBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    numero: str = Field(..., min_length=1, max_length=25)

    @field_validator("nombre", "numero", mode="before")
    @classmethod
    def _trim(cls, v):
        return _clean_str(v)

class SectoresCreate(SectoresBase):
    pass

class SectoresModify(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    numero: str | None = Field(None, min_length=1, max_length=25)
    baja: bool | None = None

    @field_validator("nombre", "numero", mode="before")
    @classmethod
    def _trim(cls, v):
        return _clean_str(v)

class SectoresOut(SectoresBase):
    id: int
    baja: bool
    model_config = ConfigDict(from_attributes=True)
