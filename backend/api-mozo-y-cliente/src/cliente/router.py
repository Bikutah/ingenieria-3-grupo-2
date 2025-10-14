from fastapi import APIRouter, HTTPException, Query
from .schemas import ClienteCreate, ClienteOut
from .services import create_cliente, list_clientes, get_cliente
from .exceptions import ClienteNotFoundError
from .constants import DEFAULT_LIMIT

router = APIRouter()

@router.post("/", response_model=ClienteOut)
def create(payload: ClienteCreate):
    obj = create_cliente(payload.nombre)
    return {"id": obj.id, "nombre": obj.nombre}

@router.get("/", response_model=list[ClienteOut])
def list_all(limit: int = Query(DEFAULT_LIMIT, ge=1, le=500)):
    objs = list_clientes(limit=limit)
    return [{"id": o.id, "nombre": o.nombre} for o in objs]

@router.get("/{id_}", response_model=ClienteOut)
def get_one(id_: int):
    try:
        o = get_cliente(id_)
        return {"id": o.id, "nombre": o.nombre}
    except ClienteNotFoundError:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
