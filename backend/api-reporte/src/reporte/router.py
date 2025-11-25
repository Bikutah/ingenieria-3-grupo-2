from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import date, datetime, timedelta
from collections import Counter
import asyncio, os

from ..database import get_db
from . import models, schemas
from .filters import ReporteFilter

# URL del servicio de facturación (configurable por entorno)
import httpx
FACTURACION_API_URL = os.getenv("FACTURACION_API_URL", "http://gestion-facturacion:8000")
COMANDA_API_URL = os.getenv("COMANDA_API_URL", "http://gestion-comanda:8000")
PRODUCTOS_API_URL = os.getenv("PRODUCTOS_API_URL", "http://gestion-productos:8000")
MOZO_API_URL = os.getenv("MOZO_API_URL", "http://mozo-y-cliente:8000")



from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()


async def get_facturas_pagadas(fecha_desde: date, fecha_hasta: date) -> list:
    """
    Función helper para obtener todas las facturas de la API de facturación.
    """
    # Para probar, hacemos un GET básico sin filtros, pidiendo hasta 1000 facturas.
    url = f"{FACTURACION_API_URL}/factura/"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json().get("items", [])
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Error al contactar la API de facturación: {e}")
    except Exception:
        raise HTTPException(status_code=500, detail="Error inesperado al procesar respuesta de la API de facturación")

@router.get("/ganancias-mensuales/", response_model=list[schemas.GananciaMensual])
async def reporte_ganancias_mensuales(
    año: int = Query(..., description="Año para el cual se generará el reporte de ganancias.")
):
    """
    Calcula la suma de los montos totales de las facturas PAGADAS por cada mes de un año determinado.
    """
    fecha_inicio = date(año, 1, 1)
    fecha_fin = date(año, 12, 31)
    facturas_pagadas = await get_facturas_pagadas(fecha_inicio, fecha_fin)

    ganancias_por_mes = {i: 0.0 for i in range(1, 13)}

    # Como traemos todas las facturas, filtramos aquí por estado y año.
    for factura in facturas_pagadas:
        if (factura.get("estado") == "pagada" and 
            factura.get("total") is not None and 
            factura.get("fecha_emision")):
            fecha_factura = datetime.fromisoformat(factura["fecha_emision"]).date()
            if fecha_factura.year == año:
                mes = fecha_factura.month
                ganancias_por_mes[mes] += factura["total"]

    return [{"mes": mes, "ganancia": total} for mes, total in ganancias_por_mes.items()]


async def get_all_comandas(fecha_desde: date | None = None, fecha_hasta: date | None = None) -> list:
    """
    Función helper para obtener todas las comandas de la API de gestión de comandas.
    Opcionalmente filtra por un rango de fechas.
    """
    # NOTA: En una implementación real, se debería manejar la paginación.
    url = f"{COMANDA_API_URL}/comanda/"
    if fecha_desde and fecha_hasta:
        url += f"&fecha__gte={fecha_desde}&fecha__lte={fecha_hasta}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json().get("items", [])
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Error al contactar la API de comandas: {e}")
    except Exception:
        raise HTTPException(status_code=500, detail="Error inesperado al procesar respuesta de la API de comandas")


async def get_producto_details(id_producto: int) -> dict:
    """
    Obtiene los detalles de un producto específico desde la API de gestión de productos.
    """
    url = f"{PRODUCTOS_API_URL}/productos/{id_producto}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            # Si el producto no se encuentra, devolvemos un diccionario por defecto.
            if response.status_code == 404:
                return {"nombre": f"Producto ID {id_producto} no encontrado", "tipo": "desconocido"}
            response.raise_for_status()
            return response.json()
    except httpx.RequestError:
        # En caso de error de conexión, también devolvemos un default.
        return {"nombre": f"Error al buscar producto ID {id_producto}", "tipo": "desconocido"}


@router.get("/top-productos-vendidos/", response_model=list[schemas.ProductoVendido])
async def reporte_top_productos():
    """
    Devuelve un ranking de los 5 productos más vendidos (platos, bebidas, etc.)
    incluyendo su nombre y tipo.
    """
    comandas = await get_all_comandas()
    conteo_productos = Counter()

    for comanda in comandas:
        # Solo contamos comandas que estén 'pagada' o 'facturada' para reflejar ventas reales
        estado_comanda = comanda.get("estado", "").lower()
        if estado_comanda in ["pagada", "facturada"] and comanda.get("detalles_comanda"):
            for detalle in comanda["detalles_comanda"]:
                if detalle.get("id_producto") and detalle.get("cantidad"):
                    conteo_productos[detalle["id_producto"]] += detalle["cantidad"]

    # Obtener los 5 productos más vendidos
    top_5 = conteo_productos.most_common(5)

    # Crear tareas para obtener los detalles de los productos concurrentemente
    tasks = [get_producto_details(id_prod) for id_prod, _ in top_5]
    detalles_productos = await asyncio.gather(*tasks)

    # Mapear detalles por ID de producto para fácil acceso
    detalles_map = {detalle.get("id"): detalle for detalle in detalles_productos}

    # Construir la respuesta final
    resultado = []
    for id_prod, cantidad in top_5:
        detalle = detalles_map.get(id_prod, {})
        resultado.append({
            "id_producto": id_prod,
            "nombre": detalle.get("nombre", "N/A"),
            "tipo": detalle.get("tipo", "N/A"),
            "cantidad_total": cantidad
        })
    return resultado


@router.get("/dias-concurridos/", response_model=schemas.ConcurrenciaSemanal)
async def reporte_dias_concurridos(
    fecha_desde: date = Query(..., description="Fecha de inicio del rango a analizar."),
    fecha_hasta: date = Query(..., description="Fecha de fin del rango a analizar.")
):
    """
    Analiza las comandas en un rango de fechas y devuelve la cantidad
    total de comandas por cada día de la semana.
    """
    # Se traen todas las comandas sin filtro en la URL, ya que la API de comandas
    # no soporta el filtrado por fecha directamente.
    comandas = await get_all_comandas() 

    # Mapeo de weekday() a nombres de días en español (0=lunes)
    dias_semana = {
        0: "lunes", 1: "martes", 2: "miercoles",
        3: "jueves", 4: "viernes", 5: "sabado", 6: "domingo"
    }
    conteo_dias = Counter()

    # El filtrado por fecha se hace aquí, en Python
    for comanda in comandas:
        if comanda.get("fecha"):
            fecha_comanda = date.fromisoformat(comanda["fecha"])
            if fecha_desde <= fecha_comanda <= fecha_hasta:
                nombre_dia = dias_semana[fecha_comanda.weekday()]
                conteo_dias[nombre_dia] += 1

    # Devolvemos el conteo para cada día, asegurando que todos los días aparezcan
    return {dia: conteo_dias[dia] for dia in dias_semana.values()}


async def get_mozo_details(id_mozo: int) -> dict:
    """
    Obtiene los detalles de un mozo específico desde la API de mozos.
    """
    url = f"{MOZO_API_URL}/mozo/{id_mozo}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            if response.status_code == 404:
                return {"nombre": f"Mozo ID {id_mozo}", "apellido": "no encontrado"}
            response.raise_for_status()
            return response.json()
    except httpx.RequestError:
        return {"nombre": f"Error al buscar mozo ID {id_mozo}", "apellido": ""}


@router.get("/mozo-del-mes/", response_model=schemas.MozoDelMes)
async def reporte_mozo_del_mes(
    año: int = Query(..., description="Año a analizar."),
    mes: int = Query(..., ge=1, le=12, description="Mes a analizar.")
):
    """
    Encuentra al mozo con la mayor cantidad de comandas atendidas en un mes y año específicos.
    """
    # Determinar primer y último día del mes
    fecha_inicio = date(año, mes, 1)
    # Para obtener el último día, vamos al primer día del mes siguiente y restamos un día
    siguiente_mes = mes + 1 if mes < 12 else 1
    siguiente_año = año if mes < 12 else año + 1
    fecha_fin = date(siguiente_año, siguiente_mes, 1) - timedelta(days=1)

    # Se traen todas las comandas y se filtran por fecha aquí en Python
    todas_las_comandas = await get_all_comandas()
    comandas_del_periodo = [
        c for c in todas_las_comandas
        if c.get("fecha") and fecha_inicio <= date.fromisoformat(c["fecha"]) <= fecha_fin
    ]

    if not comandas_del_periodo:
        raise HTTPException(status_code=404, detail="No se encontraron comandas para el período especificado.")

    conteo_mozos = Counter(comanda["id_mozo"] for comanda in comandas_del_periodo if comanda.get("id_mozo"))

    if not conteo_mozos:
        raise HTTPException(status_code=404, detail="No hay comandas con mozo asignado en este período.")

    # Obtener el mozo con más comandas
    id_mozo_top, cantidad = conteo_mozos.most_common(1)[0]

    # Obtener los detalles del mozo
    detalles_mozo = await get_mozo_details(id_mozo_top)
    nombre_completo = f"{detalles_mozo.get('nombre', '')} {detalles_mozo.get('apellido', '')}".strip()

    return {"id_mozo": id_mozo_top, "nombre_completo": nombre_completo, "cantidad_comandas": cantidad}
