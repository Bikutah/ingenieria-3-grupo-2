from fastapi import FastAPI
from .database import engine
from .comanda import models as comanda_models
from .comanda.router import router as comanda_router

# Crea las tablas en la base de datos (si no existen)
comanda_models.Base.metadata.create_all(bind=engine)

from fastapi_pagination import add_pagination

app = FastAPI(title="API gestion-comanda")

@app.get("/health")
def health():
    return {"status": "ok", "service": "gestion-comanda"}

app.include_router(comanda_router, prefix="/comanda", tags=["comanda"])

# activa paginación (page/size en Swagger)
add_pagination(app)
