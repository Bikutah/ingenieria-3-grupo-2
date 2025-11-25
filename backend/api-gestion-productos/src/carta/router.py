from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..productos import models as productos_models  # Importar modelo de Productos
from . import models, schemas
from .filters import CartaFilter

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()

@router.post("/", response_model=schemas.CartaOut, status_code=status.HTTP_201_CREATED)
def create(payload: schemas.CartaCreate, db: Session = Depends(get_db)):
    # Verificar que el nombre de la carta sea único solo para cartas activas
    carta_existente = db.query(models.Carta).filter(
        models.Carta.nombre == payload.nombre,
        models.Carta.baja == False
    ).first()
    if carta_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una carta con el nombre '{payload.nombre}'"
        )

    # Creamos el objeto del modelo a partir del payload Pydantic
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
    query = filtro.filter(select(models.Carta).where(models.Carta.baja == False))
    query = filtro.sort(query)
    return paginate(db, query)

@router.put("/{carta_id}", response_model=schemas.CartaOut)
def modify(carta_id: int, payload: schemas.CartaModify, db: Session = Depends(get_db)):
    carta = db.get(models.Carta, carta_id)
    if not carta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Carta no encontrado"
        )
    data = payload.model_dump(exclude_unset=True)

    # Si se intenta modificar nombre, verificar unicidad solo para cartas activas
    if "nombre" in data and data["nombre"] is not None:
        carta_existente = db.query(models.Carta).filter(
            models.Carta.nombre == data["nombre"],
            models.Carta.id != carta_id,
            models.Carta.baja == False
        ).first()
        if carta_existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una carta con el nombre '{data['nombre']}'"
            )

    for campo, valor in data.items():
        setattr(carta, campo, valor)
        
    db.commit()
    db.refresh(carta)
    return carta
    

@router.get("/{id_}", response_model=schemas.CartaOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Carta, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Carta no encontrado")
    return obj

@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Carta, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Carta no encontrado")

    # Verificar si la carta tiene productos activos
    productos_activos = db.query(productos_models.Productos).filter(
        productos_models.Productos.id_carta == id_,
        productos_models.Productos.baja == False
    ).count()

    if productos_activos > 0:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar la carta porque tiene productos activos"
        )

    obj.baja = True
    db.commit()
    return None
