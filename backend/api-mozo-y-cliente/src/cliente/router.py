from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from . import models, schemas

router = APIRouter()

@router.post("/", response_model=schemas.ClienteOut)
def create(payload: schemas.ClienteCreate, db: Session = Depends(get_db)):
    db_obj = models.Cliente(nombre=payload.nombre)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=list[schemas.ClienteOut])
def list_all(db: Session = Depends(get_db)):
    return db.query(models.Cliente).all()

@router.get("/{id_}", response_model=schemas.ClienteOut)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.query(models.Cliente).get(id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return obj
