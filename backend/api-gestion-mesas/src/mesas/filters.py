from fastapi_filter.contrib.sqlalchemy import Filter
from .models import Mesas

class MesasFilter(Filter):
    id: int | None = None
    id__neq: int | None = None
    numero__ilike: str | None = None
    tipo__ilike: str | None = None
    cantidad__gte: int | None = None
    cantidad__lte: int | None = None
    id_sector: int | None = None
    baja: bool | None = None
    created_at__gte: str | None = None
    created_at__lte: str | None = None
    
    order_by: list[str] | None = None

    class Constants(Filter.Constants):
        model = Mesas