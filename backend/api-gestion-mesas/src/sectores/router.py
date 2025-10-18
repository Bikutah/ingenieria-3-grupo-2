from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from . import models, schemas
from .filters import SectoresFilter  # Debés crear este filter si querés filtrar

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()

@router.post("/", response_model=schemas.SectoresOut)
def create(payload: schemas.SectoresCreate, db: Session = Depends(get_db)):
    db_obj = models.Sectores(nombre=payload.nombre, numero=payload.numero)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{sector_id}", response_model=schemas.SectoresOut)
def modify(sector_id: int, payload: schemas.SectoresModify, db: Session = Depends(get_db)):
    sector = db.get(models.Sectores, sector_id)
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector no encontrado")

    data = payload.model_dump(exclude_unset=True)

    # Validación de número único (si aplica)
    if "numero" in data and data["numero"] is not None:
        existe = db.query(models.Sectores).filter(
            models.Sectores.numero == data["numero"], models.Sectores.id != sector_id
        ).first()
        if existe:
            raise HTTPException(status_code=409, detail="Número de sector ya registrado")

    for campo, valor in data.items():
        setattr(sector, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Violación de unicidad")

    db.refresh(sector)
    return sector

@router.get("/", response_model=Page[schemas.SectoresOut])
def list_all(
    filtro: SectoresFilter = FilterDepends(SectoresFilter),
    db: Session = Depends(get_db),
):
    query = filtro.filter(select(models.Sectores))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.SectoresOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Sectores, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    return obj
