from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from ..mesas import models as mesas_models
from . import models, schemas
from .filters import SectoresFilter  # Debés crear este filter si querés filtrar

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

import httpx

router = APIRouter()

@router.post("/", response_model=schemas.SectoresOut)
def create(payload: schemas.SectoresCreate, db: Session = Depends(get_db)):
    # Validar número único solo para sectores activos
    existe = db.query(models.Sectores).filter(
        models.Sectores.numero == payload.numero,
        models.Sectores.baja == False
    ).first()
    if existe:
        raise HTTPException(status_code=409, detail="Número de sector ya registrado")

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

    # Validación de número único (si aplica) solo para sectores activos
    if "numero" in data and data["numero"] is not None:
        existe = db.query(models.Sectores).filter(
            models.Sectores.numero == data["numero"],
            models.Sectores.id != sector_id,
            models.Sectores.baja == False
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
    query = filtro.filter(select(models.Sectores)).where(models.Sectores.baja == False)
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.SectoresOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Sectores, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    return obj

@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Sectores, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Sector no encontrado")

    # Verificar si el sector tiene mesas activas
    mesas_activas = db.query(mesas_models.Mesas).filter(
        mesas_models.Mesas.id_sector == id_,
        mesas_models.Mesas.baja == False
    ).count()

    if mesas_activas > 0:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar el sector porque tiene mesas activas"
        )

    obj.baja = True
    db.commit()
    return None
