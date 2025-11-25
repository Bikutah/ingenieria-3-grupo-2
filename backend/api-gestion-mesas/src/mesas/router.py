from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from ..sectores import models as sectores_models
from . import models, schemas
from .filters import MesasFilter

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

import httpx

# URLs de otros microservicios
RESERVAS_API_URL = "http://gestion-reservas:8000"
COMANDAS_API_URL = "http://gestion-comanda:8000"

router = APIRouter()

@router.post("/", response_model=schemas.MesasOut)
def create(payload: schemas.MesasCreate, db: Session = Depends(get_db)):
    # Verificar que el sector existe
    sector = db.get(sectores_models.Sectores, payload.id_sector)
    if not sector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Sector no encontrado"
        )
    
    # Verificar número único en el mismo sector solo para mesas activas
    existe = db.query(models.Mesas).filter(
        models.Mesas.numero == payload.numero,
        models.Mesas.id_sector == payload.id_sector,
        models.Mesas.baja == False
    ).first()
    if existe:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una mesa con este número en el sector"
        )
    
    db_obj = models.Mesas(
        numero=payload.numero,
        tipo=payload.tipo,
        cantidad=payload.cantidad,
        id_sector=payload.id_sector
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{mesa_id}", response_model=schemas.MesasOut)
def modify(mesa_id: int, payload: schemas.MesasModify, db: Session = Depends(get_db)):
    mesa = db.get(models.Mesas, mesa_id)
    if not mesa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Mesa no encontrada"
        )

    data = payload.model_dump(exclude_unset=True)

    # Validar que el sector existe si se quiere modificar
    if "id_sector" in data and data["id_sector"] is not None:
        sector = db.get(sectores_models.Sectores, data["id_sector"])
        if not sector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sector no encontrado"
            )

    # Validar número único si se modifica solo para mesas activas
    if "numero" in data and data["numero"] is not None:
        sector_id = data.get("id_sector", mesa.id_sector)
        existe = db.query(models.Mesas).filter(
            models.Mesas.numero == data["numero"],
            models.Mesas.id_sector == sector_id,
            models.Mesas.id != mesa_id,
            models.Mesas.baja == False
        ).first()
        if existe:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una mesa con este número en el sector"
            )

    for campo, valor in data.items():
        setattr(mesa, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Error de integridad en los datos"
        )

    db.refresh(mesa)
    return mesa

@router.get("/", response_model=Page[schemas.MesasOut])
def list_all(
    filtro: MesasFilter = FilterDepends(MesasFilter),
    db: Session = Depends(get_db),
):
    query = filtro.filter(select(models.Mesas).where(models.Mesas.baja == False))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.MesasOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Mesas, id_)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesa no encontrada"
        )
    return obj

@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Mesas, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")

    # Verificar si la mesa está en reservas activas
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{RESERVAS_API_URL}/reserva/?id_mesa={id_}&baja=false")
            response.raise_for_status()
            reservas_data = response.json()
    except Exception:
        # Si hay cualquier error (conexión, parsing, etc.), asumir que no hay reservas activas
        reservas_data = {"total": 0}

    if reservas_data.get("total", 0) > 0:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar la mesa porque tiene reservas activas"
        )

    # Verificar si la mesa está en comandas pendientes
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{COMANDAS_API_URL}/comanda/?id_mesa={id_}&estado=pendiente")
            response.raise_for_status()
            comandas_data = response.json()
    except Exception:
        comandas_data = {"total": 0}

    if comandas_data.get("total", 0) > 0:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar la mesa porque tiene comandas pendientes"
        )

    # Verificar si la mesa está en comandas facturadas
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{COMANDAS_API_URL}/comanda/?id_mesa={id_}&estado=facturada")
            response.raise_for_status()
            comandas_data = response.json()
    except Exception:
        comandas_data = {"total": 0}

    if comandas_data.get("total", 0) > 0:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar la mesa porque tiene comandas facturadas"
        )

    obj.baja = True
    db.commit()
    return None
