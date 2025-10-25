from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from . import models, schemas
from .filters import CartaFilter

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()

@router.post("/", response_model=schemas.CartaOut)
def create(payload: schemas.CartaCreate, db: Session = Depends(get_db)):
    db_obj = models.Carta(nombre=payload.nombre)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=Page[schemas.CartaOut])
def list_all(
    filtro: CartaFilter = FilterDepends(CartaFilter),
    db: Session = Depends(get_db),
):
    query = filtro.filter(select(models.Carta))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.CartaOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Carta, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Carta no encontrado")
    return obj
