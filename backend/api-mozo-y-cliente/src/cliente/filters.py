from fastapi_filter.contrib.sqlalchemy import Filter
from .models import Cliente

class ClienteFilter(Filter):
    # ejemplos típicos (extensible según tu modelo):
    id: int | None = None                    # ?id=1
    id__neq: int | None = None              # ?id__eq=1
    nombre__ilike: str | None = None       # ?nombre__ilike=juan
    apellido__ilike: str | None = None
    dni__ilike: str | None = None
    baja: bool = False                      # Por defecto excluir bajas lógicas

    # orden: ?order_by=-created_at&order_by=nombre
    order_by: list[str] | None = None

    class Constants(Filter.Constants):
        model = Cliente
