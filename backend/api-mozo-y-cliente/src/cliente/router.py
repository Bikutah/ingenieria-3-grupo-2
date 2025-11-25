from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import httpx
import os

from ..database import get_db
from . import models, schemas
from .filters import ClienteFilter

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

# URL del servicio de reservas (configurable por entorno)
RESERVAS_API_URL = os.getenv("RESERVAS_API_URL", "http://gestion-reservas:8000")

router = APIRouter()

@router.post("/", response_model=schemas.ClienteOut)
def create(payload: schemas.ClienteCreate, db: Session = Depends(get_db)):
    # Validar unicidad de DNI solo para clientes activos
    existente = db.query(models.Cliente).filter(models.Cliente.dni == payload.dni, models.Cliente.baja == False).first()
    if existente:
        raise HTTPException(status_code=409, detail="DNI ya registrado")

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
            models.Cliente.dni == data["dni"], models.Cliente.id != cliente_id, models.Cliente.baja == False
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
    query = filtro.filter(select(models.Cliente).where(models.Cliente.baja == False))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.ClienteOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Cliente, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return obj

@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Cliente, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Verificar si el cliente tiene reservas activas
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{RESERVAS_API_URL}/reserva/?id_cliente={id_}&baja=false")
            response.raise_for_status()
            reservas_data = response.json()
            if reservas_data.get("total", 0) > 0:
                raise HTTPException(
                    status_code=409,
                    detail="No se puede eliminar el cliente porque tiene reservas activas"
                )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error al verificar reservas del cliente: {str(e)}"
        )

    obj.baja = True
    db.commit()
    return None

