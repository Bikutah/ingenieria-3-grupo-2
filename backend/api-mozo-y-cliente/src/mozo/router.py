from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from . import models, schemas
from .filters import MozoFilter

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()

@router.post("/", response_model=schemas.MozoOut)
def create(payload: schemas.MozoCreate, db: Session = Depends(get_db)):
    db_obj = models.Mozo(nombre=payload.nombre, apellido=payload.apellido, dni=payload.dni, direccion=payload.direccion, telefono=payload.telefono)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{mozo_id}", response_model=schemas.MozoOut)
def modify(mozo_id: int, payload: schemas.MozoModify, db: Session = Depends(get_db)):
    mozo = db.get(models.Mozo, mozo_id)
    if not mozo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mozo no encontrado")

    data = payload.model_dump(exclude_unset=True)  # solo campos provistos
    # Si vas a validar DNI único a mano:
    if "dni" in data and data["dni"] is not None:
        existe = db.query(models.Mozo).filter(
            models.Mozo.dni == data["dni"], models.Mozo.id != mozo_id
        ).first()
        if existe:
            raise HTTPException(status_code=409, detail="DNI ya registrado")

    for campo, valor in data.items():
        setattr(mozo, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Por si la unicidad la maneja la BD
        raise HTTPException(status_code=409, detail="Violación de unicidad (dni)")

    db.refresh(mozo)
    return mozo

@router.get("/", response_model=Page[schemas.MozoOut])
def list_all(
    filtro: MozoFilter = FilterDepends(MozoFilter),
    db: Session = Depends(get_db),
):
    query = filtro.filter(select(models.Mozo))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.MozoOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Mozo, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Mozo no encontrado")
    return obj
