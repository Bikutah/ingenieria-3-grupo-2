from .models import Cliente
from .exceptions import ClienteNotFoundError

_DB = {}
_SEQ = 0

def create_cliente(nombre: str) -> Cliente:
    global _SEQ
    _SEQ += 1
    inst = Cliente(_SEQ, nombre)
    _DB[_SEQ] = inst
    return inst

def list_clientes(limit: int = 50) -> list[Cliente]:
    return list(_DB.values())[:limit]

def get_cliente(id_: int) -> Cliente:
    if id_ not in _DB:
        raise ClienteNotFoundError()
    return _DB[id_]
