from fastapi import APIRouter, HTTPException, Query
from .schemas import MozoCreate, MozoOut
from .services import create_mozo, list_mozos, get_mozo
from .exceptions import MozoNotFoundError
from .constants import DEFAULT_LIMIT

router = APIRouter()

@router.post("/", response_model=MozoOut)
def create(payload: MozoCreate):
    obj = create_mozo(payload.nombre)
    return {"id": obj.id, "nombre": obj.nombre}

@router.get("/", response_model=list[MozoOut])
def list_all(limit: int = Query(DEFAULT_LIMIT, ge=1, le=500)):
    objs = list_mozos(limit=limit)
    return [{"id": o.id, "nombre": o.nombre} for o in objs]

@router.get("/{id_}", response_model=MozoOut)
def get_one(id_: int):
    try:
        o = get_mozo(id_)
        return {"id": o.id, "nombre": o.nombre}
    except MozoNotFoundError:
        raise HTTPException(status_code=404, detail="Mozo no encontrado")
