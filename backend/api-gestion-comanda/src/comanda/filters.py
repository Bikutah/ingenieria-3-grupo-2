from fastapi_filter.contrib.sqlalchemy import Filter
from .models import Comanda

class ComandaFilter(Filter):
    # ejemplos típicos (extensible según tu modelo):
    id : int | None = None              # ?id=1
    id__neq: int | None = None              # ?id__neq=1
    id_mesa: int | None = None          # ?id_mesa=1
    estado: str | None = None           # ?estado=pendiente
    estado__in: str | None = None       # ?estado__in=pendiente,facturada
    created_at__gte: str | None = None     # ?created_at__gte=2025-01-01
    created_at__lte: str | None = None     # ?created_at__lte=2025-12-31

    # orden: ?order_by=-created_at&order_by=nombre
    order_by: list[str] | None = None

    class Constants(Filter.Constants):
        model = Comanda
