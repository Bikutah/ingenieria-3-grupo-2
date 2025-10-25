from fastapi_filter.contrib.sqlalchemy import Filter
from .models import Reserva
from typing import Optional, List

class ReservaFilter(Filter):
    # Filtros básicos por ID
    id: Optional[int] = None
    id__neq: Optional[int] = None
    id__gte: Optional[int] = None
    id__lte: Optional[int] = None
    
    # Filtros por fecha
    fecha__gte: Optional[str] = None
    fecha__lte: Optional[str] = None
    fecha__gt: Optional[str] = None
    fecha__lt: Optional[str] = None
    
    # Filtros por horario
    horario: Optional[str] = None
    horario__ilike: Optional[str] = None
    
    # Filtros por cantidad de personas
    cantidad_personas: Optional[int] = None
    cantidad_personas__gte: Optional[int] = None
    cantidad_personas__lte: Optional[int] = None
    
    # Filtros por mesa
    id_mesa: Optional[int] = None
    id_mesa__in: Optional[List[int]] = None
    
    # Filtros por cliente
    id_cliente: Optional[int] = None
    
    # Filtros por estado de baja
    baja: Optional[bool] = None
    
    # Ordenamiento
    order_by: Optional[List[str]] = None

    class Constants(Filter.Constants):
        model = Reserva