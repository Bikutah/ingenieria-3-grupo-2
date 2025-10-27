from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List

from ..database import get_db
from . import models, schemas
from .filters import ReservaFilter
from .validators import ReservaValidator

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()

@router.post("/", response_model=schemas.ReservaOut, status_code=status.HTTP_201_CREATED)
def create(payload: schemas.ReservaCreate, db: Session = Depends(get_db)):
    # Validar la reserva antes de crearla
    validator = ReservaValidator(db)
    validator.validar_creacion_reserva(payload)

    # Crear la reserva principal
    db_reserva = models.Reserva(
        fecha=payload.fecha,
        horario=payload.horario,
        cantidad_personas=payload.cantidad_personas,
        id_mesa=payload.id_mesa,
        id_cliente=payload.id_cliente,
        baja=payload.baja
    )
    db.add(db_reserva)
    db.flush()
    
    # Crear los menús de reserva si existen
    for menu_reserva in payload.menu_reservas:
        db_menu_reserva = models.MenuReserva(
            id_reserva=db_reserva.id,
            monto_seña=menu_reserva.monto_seña
        )
        db.add(db_menu_reserva)
        db.flush()
        
        # Crear los detalles del menú
        for detalle in menu_reserva.detalles_menu:
            db_detalle = models.DetalleMenu(
                id_menu_reserva=db_menu_reserva.id,
                id_producto=detalle.id_producto,
                cantidad=detalle.cantidad,
                precio=detalle.precio
            )
            db.add(db_detalle)
    
    db.commit()
    db.refresh(db_reserva)
    return db_reserva

@router.get("/", response_model=Page[schemas.ReservaOut])
def list_all(
    filtro: ReservaFilter = FilterDepends(ReservaFilter),
    db: Session = Depends(get_db),
):
    query = filtro.filter(select(models.Reserva))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{id_}", response_model=schemas.ReservaOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.Reserva, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return obj

@router.put("/{id_}", response_model=schemas.ReservaOut)
def modify(id_: int, payload: schemas.ReservaUpdate, db: Session = Depends(get_db)):
    # Validar la actualización de la reserva
    validator = ReservaValidator(db)
    validator.validar_actualizacion_reserva(id_, payload)

    db_reserva = db.get(models.Reserva, id_)
    if db_reserva is None:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    # Actualizar campos
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_reserva, field, value)

    db.commit()
    db.refresh(db_reserva)
    return db_reserva

@router.delete("/{id_}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id_: int, db: Session = Depends(get_db)):
    db_reserva = db.get(models.Reserva, id_)
    if db_reserva is None:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    db_reserva.baja = True
    db.commit()
    return None

@router.patch("/{id_}/reactivar", response_model=schemas.ReservaOut)
def reactivar(id_: int, db: Session = Depends(get_db)):
    db_reserva = db.get(models.Reserva, id_)
    if db_reserva is None:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    db_reserva.baja = False
    db.commit()
    db.refresh(db_reserva)
    return db_reserva

@router.post("/{id_reserva}/menu-reservas", response_model=schemas.MenuReservaOut)
def add_menu_reserva(
    id_reserva: int,
    payload: schemas.MenuReservaCreate,
    db: Session = Depends(get_db)
):
    # Verificar que la reserva existe
    reserva = db.get(models.Reserva, id_reserva)
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    # Crear el menú de reserva
    db_menu_reserva = models.MenuReserva(
        id_reserva=id_reserva,
        monto_seña=payload.monto_seña
    )
    db.add(db_menu_reserva)
    db.flush()

    # Crear los detalles del menú
    for detalle in payload.detalles_menu:
        # Verificar si el producto ya existe en el menú
        existing_detalle = db.query(models.DetalleMenu).filter(
            models.DetalleMenu.id_menu_reserva == db_menu_reserva.id,
            models.DetalleMenu.id_producto == detalle.id_producto
        ).first()

        if existing_detalle:
            # Si existe, sumar la cantidad
            existing_detalle.cantidad += detalle.cantidad
        else:
            # Si no existe, crear nuevo detalle
            db_detalle = models.DetalleMenu(
                id_menu_reserva=db_menu_reserva.id,
                id_producto=detalle.id_producto,
                cantidad=detalle.cantidad,
                precio=detalle.precio
            )
            db.add(db_detalle)

    db.commit()
    db.refresh(db_menu_reserva)
    return db_menu_reserva

@router.get("/{id_reserva}/menu-reservas", response_model=List[schemas.MenuReservaOut])
def get_menu_reservas(id_reserva: int, db: Session = Depends(get_db)):
    reserva = db.get(models.Reserva, id_reserva)
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    return reserva.menu_reservas

@router.put("/{id_reserva}/menu-reservas/{id_menu_reserva}/detalles/{id_detalle}", response_model=schemas.DetalleMenuOut)
def update_detalle_menu(
    id_reserva: int,
    id_menu_reserva: int,
    id_detalle: int,
    cantidad: int,
    db: Session = Depends(get_db)
):
    # Verificar que la reserva existe
    reserva = db.get(models.Reserva, id_reserva)
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    # Verificar que el menú pertenece a la reserva
    menu_reserva = db.get(models.MenuReserva, id_menu_reserva)
    if menu_reserva is None or menu_reserva.id_reserva != id_reserva:
        raise HTTPException(status_code=404, detail="Menú de reserva no encontrado")

    # Verificar que el detalle existe
    detalle = db.get(models.DetalleMenu, id_detalle)
    if detalle is None or detalle.id_menu_reserva != id_menu_reserva:
        raise HTTPException(status_code=404, detail="Detalle del menú no encontrado")

    # Actualizar cantidad
    if cantidad <= 0:
        # Si cantidad es 0 o negativa, eliminar el detalle
        db.delete(detalle)
    else:
        detalle.cantidad = cantidad

    db.commit()
    if cantidad > 0:
        db.refresh(detalle)
        return detalle
    else:
        # Retornar un objeto vacío si se eliminó
        return schemas.DetalleMenuOut(id=id_detalle, id_producto=detalle.id_producto, cantidad=0, precio=detalle.precio)

@router.delete("/{id_reserva}/menu-reservas/{id_menu_reserva}/detalles/{id_detalle}", status_code=status.HTTP_204_NO_CONTENT)
def remove_detalle_menu(
    id_reserva: int,
    id_menu_reserva: int,
    id_detalle: int,
    db: Session = Depends(get_db)
):
    # Verificar que la reserva existe
    reserva = db.get(models.Reserva, id_reserva)
    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    # Verificar que el menú pertenece a la reserva
    menu_reserva = db.get(models.MenuReserva, id_menu_reserva)
    if menu_reserva is None or menu_reserva.id_reserva != id_reserva:
        raise HTTPException(status_code=404, detail="Menú de reserva no encontrado")

    # Verificar que el detalle existe
    detalle = db.get(models.DetalleMenu, id_detalle)
    if detalle is None or detalle.id_menu_reserva != id_menu_reserva:
        raise HTTPException(status_code=404, detail="Detalle del menú no encontrado")

    # Eliminar el detalle
    db.delete(detalle)
    db.commit()
    return None