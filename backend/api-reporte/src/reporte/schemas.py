from pydantic import BaseModel, Field, ConfigDict, conint

class ReporteBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class ReporteCreate(ReporteBase):
    pass

class ReporteOut(ReporteBase):
    id: int
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM

# --- Schema para el reporte de ganancias mensuales ---

class GananciaMensual(BaseModel):
    mes: conint(ge=1, le=12)
    ganancia: float

# --- Schema para el reporte de top productos vendidos ---
class ProductoVendido(BaseModel):
    id_producto: int
    nombre: str
    tipo: str
    cantidad_total: int

# --- Schema para el reporte de concurrencia por día de la semana ---
class ConcurrenciaSemanal(BaseModel):
    lunes: int
    martes: int
    miercoles: int
    jueves: int
    viernes: int
    sabado: int
    domingo: int

# --- Schema para el reporte de Mozo del Mes ---
class MozoDelMes(BaseModel):
    id_mozo: int
    nombre_completo: str
    cantidad_comandas: int
