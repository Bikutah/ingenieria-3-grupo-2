from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from . import models, schemas
from .filters import ClienteFilter

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()

@router.post("/", response_model=schemas.ClienteOut)
def create(payload: schemas.ClienteCreate, db: Session = Depends(get_db)):
    db_obj = models.Cliente(nombre=payload.nombre, apellido=payload.apellido, dni=payload.dni, telefono=payload.telefono)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{cliente_id}", response_model=schemas.ClienteOut)
def modify(cliente_id: int, payload: schemas.ClienteModify, db: Session = Depends(get_db)):
    cliente = db.get(models.Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    data = payload.model_dump(exclude_unset=True)  # solo campos provistos
    if "dni" in data and data["dni"] is not None:
        existe = db.query(models.Cliente).filter(
            models.Cliente.dni == data["dni"], models.Cliente.id != cliente_id
        ).first()
        if existe:
            raise HTTPException(status_code=409, detail="DNI ya registrado")
    for campo, valor in data.items():
        setattr(cliente, campo, valor)
    
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Violación de unicidad (dni)")

    db.refresh(cliente)
    return cliente


@router.get("/", response_model=Page[schemas.ClienteOut])
def list_all(
    filtro: ClienteFilter = FilterDepends(ClienteFilter),
    db: Session = Depends(get_db),
):
    query = filtro.filter(select(models.Cliente))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.ClienteOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Cliente, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return obj
