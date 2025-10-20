from pydantic import BaseModel, Field, ConfigDict, field_validator
import re

def _clean_str(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return v or None  # convierte "" a None

# Reglas básicas
RE_DNI = re.compile(r"^\d{8}$")         # solo números, 7 a 11 dígitos
RE_TEL = re.compile(r"^[\d\s()+\-]{6,25}$") # números y símbolos comunes, 6–25 chars

class ClienteBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    dni: str = Field(..., min_length=7, max_length=11, description="Solo dígitos")
    telefono: str = Field(..., min_length=6, max_length=25)

    @field_validator("nombre", "apellido", "dni", "telefono", mode="before")
    @classmethod
    def _trim(cls, v):
        return _clean_str(v)
    
    @field_validator("dni")
    @classmethod
    def _validate_dni(cls, v):
        if not RE_DNI.match(v):
            raise ValueError("DNI inválido - debe tener solo dígitos (7 a 11).")
        return v
    @field_validator("telefono")
    @classmethod
    def _validate_telefono(cls, v):
        if not RE_TEL.match(v):
            raise ValueError("Teléfono inválido. Use dígitos y (+ - () espacio).")
        return v

class ClienteCreate(ClienteBase):
    pass

class ClienteModify(BaseModel):
    # Todos opcionales (parcial)
    nombre: str | None = Field(None, min_length=1, max_length=100)
    apellido: str | None = Field(None, min_length=1, max_length=100)
    dni: str | None = Field(None, min_length=7, max_length=11, description="Solo dígitos")
    telefono: str | None = Field(None, min_length=6, max_length=25)
    baja: bool | None = None

    @field_validator("nombre", "apellido", "dni", "telefono", mode="before")
    @classmethod
    def _trim(cls, v):
        return _clean_str(v)

    @field_validator("dni")
    @classmethod
    def _validate_dni(cls, v):
        if v is not None and not RE_DNI.match(v):
            raise ValueError("DNI inválido - debe tener solo dígitos (7 a 11).")
        return v

    @field_validator("telefono")
    @classmethod
    def _validate_telefono(cls, v):
        if v is not None and not RE_TEL.match(v):
            raise ValueError("Teléfono inválido. Use dígitos y (+ - () espacio).")
        return v

class ClienteOut(ClienteBase):
    id: int
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM
