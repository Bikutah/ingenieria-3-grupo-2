from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from . import models, schemas
from .filters import ComandaFilter
from .validator import ComandaValidator

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()

@router.post("/", response_model=schemas.ComandaOut, status_code=status.HTTP_201_CREATED)
def create(payload: schemas.ComandaCreate, db: Session = Depends(get_db)):
    validator = ComandaValidator(db)
    validator.validar_creacion_comanda(payload)

    db_comanda = models.Comanda(
        id_mesa=payload.id_mesa,
        id_mozo=payload.id_mozo,
        id_reserva=payload.id_reserva,
        fecha=payload.fecha,
        baja=payload.baja
    )
    db.add(db_comanda)
    db.flush()
    for detalle in payload.detalles_comanda:
        db_detalle = models.DetalleComanda(
            id_comanda=db_comanda.id,
            id_producto=detalle.id_producto,
            cantidad=detalle.cantidad,
            precio_unitario=detalle.precio_unitario,
        )
        db.add(db_detalle)

    db.commit()
    db.refresh(db_comanda)
    return db_comanda

##Modificacion Comanda no Detalles
@router.put("/{id_}", response_model=schemas.ComandaOut)
def modify(id_: int, payload: schemas.ComandaCreate, db: Session = Depends(get_db)):
    validator = ComandaValidator(db)
    validator.validar_modificacion_comanda(id_, payload) 

    obj = db.get(models.Comanda, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Comanda no encontrado")
    
    # Excluir detalles_comanda del update (solo se modifican campos de la comanda principal)
    update_data = payload.model_dump(exclude_unset=True, exclude={"detalles_comanda"})
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/", response_model=Page[schemas.ComandaOut])
def list_all(
    filtro: ComandaFilter = FilterDepends(ComandaFilter),
    db: Session = Depends(get_db),
):
    query = filtro.filter(select(models.Comanda))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.ComandaOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Comanda, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Comanda no encontrado")
    return obj

@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Comanda, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Comanda no encontrado")
    obj.baja = True
    db.add(obj)
    db.commit()
    return

@router.get("/{id_comanda}/detalles", response_model=Page[schemas.DetalleComandaOut])
def get_detalles(id_comanda: int, db: Session = Depends(get_db)):
    query = select(models.DetalleComanda).where(models.DetalleComanda.id_comanda == id_comanda)
    return paginate(db, query)

#Modificacion Detalles de Comanda
@router.put("/{id_comanda}/detalles/{id_detalle}", response_model=schemas.DetalleComandaOut)
def update_detalle_comanda(id_comanda:int, id_detalle:int, payload: schemas.DetalleComandaCreate, db: Session = Depends(get_db)):
    comanda = db.get(models.Comanda, id_comanda)
    if comanda is None:
        raise HTTPException(status_code=404, detail="Comanda no encontrada")
    detalle = db.get(models.DetalleComanda, id_detalle)
    if detalle is None or detalle.id_comanda != id_comanda:
        raise HTTPException(status_code=404, detail="Detalle de comanda no encontrado")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(detalle, key, value)
    
    db.commit()
    db.refresh(detalle)
    return detalle

@router.post("/{id_comanda}/detalles", response_model=schemas.DetalleComandaOut, status_code=status.HTTP_201_CREATED)
def add_detalle_comanda(id_comanda:int, payload: schemas.DetalleComandaCreate, db: Session = Depends(get_db)):
    comanda = db.get(models.Comanda, id_comanda)
    if comanda is None:
        raise HTTPException(status_code=404, detail="Comanda no encontrada")
    
    nuevo_detalle = models.DetalleComanda(
        id_comanda=id_comanda,
        id_producto=payload.id_producto,
        cantidad=payload.cantidad,
        precio_unitario=payload.precio_unitario,
    )
    db.add(nuevo_detalle)
    db.commit()
    db.refresh(nuevo_detalle)
    return nuevo_detalle