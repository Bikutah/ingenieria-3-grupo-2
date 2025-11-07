from fastapi import FastAPI
from .database import engine
from .factura import models as factura_models
from .factura.router import router as factura_router

# Crea las tablas en la base de datos (si no existen)
factura_models.Base.metadata.create_all(bind=engine)

from fastapi_pagination import add_pagination

app = FastAPI(title="API gestion-facturacion")

@app.get("/health")
def health():
    return {"status": "ok", "service": "gestion-facturacion"}

app.include_router(factura_router, prefix="/factura", tags=["factura"])

# activa paginación (page/size en Swagger)
add_pagination(app)
