from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import httpx
import os

from ..database import get_db
from . import models, schemas
from .filters import MozoFilter

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

# URL del servicio de comandas (configurable por entorno)
COMANDAS_API_URL = os.getenv("COMANDAS_API_URL", "http://gestion-comanda:8000")

router = APIRouter()

@router.post("/", response_model=schemas.MozoOut)
def create(payload: schemas.MozoCreate, db: Session = Depends(get_db)):
    # Validar unicidad de DNI solo para mozos activos
    existente = db.query(models.Mozo).filter(models.Mozo.dni == payload.dni, models.Mozo.baja == False).first()
    if existente:
        raise HTTPException(status_code=409, detail="DNI ya registrado")

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
    # Si vas a validar DNI único a mano (solo contra activos):
    if "dni" in data and data["dni"] is not None:
        existe = db.query(models.Mozo).filter(
            models.Mozo.dni == data["dni"], models.Mozo.id != mozo_id, models.Mozo.baja == False
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
    query = filtro.filter(select(models.Mozo).where(models.Mozo.baja == False))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.MozoOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Mozo, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Mozo no encontrado")
    return obj

@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Mozo, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Mozo no encontrado")

    # Verificar si el mozo tiene comandas pendientes o facturadas
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{COMANDAS_API_URL}/comanda/?id_mozo={id_}&estado__in=pendiente,facturada")
            response.raise_for_status()
            comandas_data = response.json()
            if comandas_data.get("total", 0) > 0:
                raise HTTPException(
                    status_code=409,
                    detail="No se puede eliminar el mozo porque tiene comandas pendientes o facturadas"
                )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error al verificar comandas del mozo: {str(e)}"
        )

    obj.baja = True
    db.commit()
    return None

