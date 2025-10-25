# src/mozo/schemas.py
from pydantic import BaseModel, Field, ConfigDict, field_validator
import re

# Reglas básicas
RE_DNI = re.compile(r"^\d{8}$")         # solo números, 7 a 11 dígitos
RE_TEL = re.compile(r"^[\d\s()+\-]{6,25}$") # números y símbolos comunes, 6–25 chars

def _clean_str(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return v or None  # convierte "" a None

class MozoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    dni: str = Field(..., min_length=7, max_length=11, description="Solo dígitos")
    direccion: str = Field(..., min_length=1, max_length=150)
    telefono: str = Field(..., min_length=6, max_length=25)

    # Normalización: trim a todos los campos string
    @field_validator("nombre", "apellido", "dni", "direccion", "telefono", mode="before")
    @classmethod
    def _trim(cls, v):
        return _clean_str(v)

    # Validaciones de formato
    @field_validator("dni")
    @classmethod
    def _dni_digits(cls, v: str):
        if not RE_DNI.match(v):
            raise ValueError("DNI debe tener solo dígitos (7 a 11).")
        return v

    @field_validator("telefono")
    @classmethod
    def _telefono_formato(cls, v: str):
        if not RE_TEL.match(v):
            raise ValueError("Teléfono inválido. Use dígitos y (+ - () espacio).")
        return v

class MozoCreate(MozoBase):
    pass

class MozoModify(BaseModel):
    # Todos opcionales (parcial)
    nombre: str | None = Field(None, min_length=1, max_length=100)
    apellido: str | None = Field(None, min_length=1, max_length=100)
    dni: str | None = Field(None, min_length=7, max_length=11, description="Solo dígitos")
    direccion: str | None = Field(None, min_length=1, max_length=150)
    telefono: str | None = Field(None, min_length=6, max_length=25)
    baja: bool | None = None

    # Normalización + validaciones
    @field_validator("nombre", "apellido", "dni", "direccion", "telefono", mode="before")
    @classmethod
    def _trim(cls, v):
        return _clean_str(v)

    @field_validator("dni")
    @classmethod
    def _dni_digits(cls, v: str | None):
        if v is None:
            return v
        if not RE_DNI.match(v):
            raise ValueError("DNI debe tener solo dígitos (7 a 11).")
        return v

    @field_validator("telefono")
    @classmethod
    def _telefono_formato(cls, v: str | None):
        if v is None:
            return v
        if not RE_TEL.match(v):
            raise ValueError("Teléfono inválido. Use dígitos y (+ - () espacio).")
        return v

class MozoOut(MozoBase):
    id: int
    baja: bool
    model_config = ConfigDict(from_attributes=True)
