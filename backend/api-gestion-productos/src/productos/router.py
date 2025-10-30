from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..carta import models as carta_models # Importar el modelo de Carta
from . import models, schemas
from .filters import ProductosFilter

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()

@router.post("/", response_model=schemas.ProductosOut)
def create(payload: schemas.ProductosCreate, db: Session = Depends(get_db)):
    # Verificar que el nombre del producto sea único
    producto_existente = db.query(models.Productos).filter(models.Productos.nombre == payload.nombre).first()
    if producto_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un producto con el nombre '{payload.nombre}'",
        )

    # Verificar que la carta exista
    carta_existente = db.get(carta_models.Carta, payload.id_carta)
    if not carta_existente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Carta con ID '{payload.id_carta}' no encontrada",
        )

    # Creamos el objeto del modelo a partir del payload Pydantic
    # El método model_dump() convierte el schema en un diccionario
    db_obj = models.Productos(**payload.model_dump(exclude_unset=True))
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=Page[schemas.ProductosOut])
def list_all(
    filtro: ProductosFilter = FilterDepends(ProductosFilter),
    db: Session = Depends(get_db),
):
    query = filtro.filter(select(models.Productos))
    query = filtro.sort(query)
    return paginate(db, query)

@router.put("/{producto_id}", response_model=schemas.ProductosOut)
def modify(producto_id: int, payload: schemas.ProductosModify, db: Session = Depends(get_db)):
    producto = db.get(models.Productos, producto_id)
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )

    # Obtenemos los datos del payload que realmente se enviaron (para no sobreescribir con None)
    data = payload.model_dump(exclude_unset=True)

    # Si se intenta modificar id_carta, verificar que la nueva carta exista
    if "id_carta" in data and data["id_carta"] is not None:
        carta_existente = db.get(carta_models.Carta, data["id_carta"])
        if not carta_existente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Carta con ID '{data['id_carta']}' no encontrada",
            )

    # Actualizamos los campos del objeto de la base de datos
    for campo, valor in data.items():
        setattr(producto, campo, valor)

    db.commit()
    db.refresh(producto)
    return producto

@router.get("/{id_}", response_model=schemas.ProductosOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Productos, id_)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    return obj
