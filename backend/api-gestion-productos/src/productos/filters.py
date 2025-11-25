from fastapi_filter.contrib.sqlalchemy import Filter
from .models import Productos
from .schemas import TipoProducto

class ProductosFilter(Filter):
    """Filtros para el modelo de Productos."""
    id: int | None = None
    tipo: TipoProducto | None = None
    nombre__ilike: str | None = None
    precio__gte: float | None = None
    precio__lte: float | None = None
    created_at__gte: str | None = None
    id_carta: int | None = None # Nuevo filtro por ID de carta
    created_at__lte: str | None = None
    baja: bool = False  # Por defecto excluir productos dados de baja

    # Permite ordenar por cualquier campo, ej: ?order_by=-precio&order_by=nombre
    order_by: list[str] | None = None

    class Constants(Filter.Constants):
        model = Productos
