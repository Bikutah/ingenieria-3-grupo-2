from .models import Mozo
from .exceptions import MozoNotFoundError

_DB = {}
_SEQ = 0

def create_mozo(nombre: str) -> Mozo:
    global _SEQ
    _SEQ += 1
    inst = Mozo(_SEQ, nombre)
    _DB[_SEQ] = inst
    return inst

def list_mozos(limit: int = 50) -> list[Mozo]:
    return list(_DB.values())[:limit]

def get_mozo(id_: int) -> Mozo:
    if id_ not in _DB:
        raise MozoNotFoundError()
    return _DB[id_]
