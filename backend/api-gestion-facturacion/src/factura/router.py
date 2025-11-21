from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from . import models, schemas
from .filters import FacturaFilter
from .validator import FacturaValidator

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()

@router.post("/", response_model=schemas.FacturaOut, status_code=status.HTTP_201_CREATED)
async def create(payload: schemas.FacturaCreate, db: Session = Depends(get_db)):
    validator = FacturaValidator(db)

    # Validar y obtener datos de la comanda
    datos_comanda = await validator.validar_creacion_factura(payload)

    # Crear detalles de factura desde los detalles de la comanda
    detalles_factura = validator.crear_detalles_factura_desde_comanda(datos_comanda["detalles"])

    # Calcular total con descuento por seña si aplica
    id_reserva = datos_comanda["comanda"].get("id_reserva")
    total = await validator.calcular_total_con_descuento_seña(datos_comanda["detalles"], id_reserva)

    # Obtener monto de seña aplicado como descuento
    monto_seña = await validator.obtener_descuento_seña(id_reserva) if id_reserva else 0.0

    db_factura = models.Factura(
        id_comanda=payload.id_comanda,
        total=total,
        monto_seña=monto_seña,  # Guardar el monto de seña aplicado
        medio_pago=payload.medio_pago,
        estado=models.EstadoFactura.pendiente
    )
    db.add(db_factura)
    db.flush()

    for detalle in detalles_factura:
        db_detalle = models.DetalleFactura(
            id_factura=db_factura.id,
            id_producto=detalle.id_producto,
            cantidad=detalle.cantidad,
            precio_unitario=detalle.precio_unitario,
            subtotal=detalle.subtotal,
        )
        db.add(db_detalle)

    db.commit()
    db.refresh(db_factura)
    return db_factura

@router.get("/", response_model=Page[schemas.FacturaList])
def list_all(
    filtro: FacturaFilter = FilterDepends(FacturaFilter),
    db: Session = Depends(get_db),
):
    query = filtro.filter(select(models.Factura))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.FacturaOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Factura, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return obj

@router.put("/{id_}/pagar", response_model=schemas.FacturaOut)
def mark_as_paid(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Factura, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    validator = FacturaValidator(db)
    validator.validar_transicion_estado(obj, models.EstadoFactura.pagada)

    obj.estado = models.EstadoFactura.pagada
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id_}/cancelar", response_model=schemas.FacturaOut)
def mark_as_cancelled(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Factura, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    validator = FacturaValidator(db)
    validator.validar_transicion_estado(obj, models.EstadoFactura.cancelada)

    obj.estado = models.EstadoFactura.cancelada
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{id_}/anular", response_model=schemas.FacturaOut)
def mark_as_annulled(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Factura, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    validator = FacturaValidator(db)
    validator.validar_transicion_estado(obj, models.EstadoFactura.anulada)

    obj.estado = models.EstadoFactura.anulada
    db.commit()
    db.refresh(obj)
    return obj
