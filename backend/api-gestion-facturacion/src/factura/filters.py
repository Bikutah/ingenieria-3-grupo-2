from fastapi_filter.contrib.sqlalchemy import Filter
from .models import Factura, MedioPago, EstadoFactura

class FacturaFilter(Filter):
    # Filtros básicos
    id: int | None = None                    # ?id=1
    id__neq: int | None = None               # ?id__neq=1
    id_comanda: int | None = None            # ?id_comanda=123
    id_comanda__neq: int | None = None       # ?id_comanda__neq=123

    # Filtros por fecha
    fecha_emision__gte: str | None = None    # ?fecha_emision__gte=2025-01-01
    fecha_emision__lte: str | None = None    # ?fecha_emision__lte=2025-12-31
    created_at__gte: str | None = None       # ?created_at__gte=2025-01-01T00:00:00
    created_at__lte: str | None = None       # ?created_at__lte=2025-12-31T23:59:59

    # Filtros por total
    total__gte: float | None = None          # ?total__gte=100.0
    total__lte: float | None = None          # ?total__lte=500.0

    # Filtros por enums
    medio_pago: MedioPago | None = None      # ?medio_pago=efectivo
    estado: EstadoFactura | None = None      # ?estado=pendiente

    # Ordenamiento: ?order_by=-fecha_emision&order_by=id_comanda
    order_by: list[str] | None = None

    class Constants(Filter.Constants):
        model = Factura
