from fastapi_filter.contrib.sqlalchemy import Filter
from .models import Sectores

class SectoresFilter(Filter):
    # ejemplos típicos (extensible según tu modelo):
    id : int | None = None              # ?id=1
    id__neq: int | None = None              # ?id__neq=1
    nombre__ilike: str | None = None       # ?nombre__ilike=juan
    created_at__gte: str | None = None     # ?created_at__gte=2025-01-01
    created_at__lte: str | None = None     # ?created_at__lte=2025-12-31
    baja: bool = False                    # Por defecto excluir bajas lógicas

    # orden: ?order_by=-created_at&order_by=nombre
    order_by: list[str] | None = None

    class Constants(Filter.Constants):
        model = Sectores
