from fastapi import FastAPI
from .database import engine
from .mesas import models as mesas_models
from .sectores import models as sectores_models
from .mesas.router import router as mesas_router
from .sectores.router import router as sectores_router

# Crea las tablas en la base de datos (si no existen)
mesas_models.Base.metadata.create_all(bind=engine)
sectores_models.Base.metadata.create_all(bind=engine)

from fastapi_pagination import add_pagination

app = FastAPI(title="API gestion-mesas")

@app.get("/health")
def health():
    return {"status": "ok", "service": "gestion-mesas"}

app.include_router(mesas_router, prefix="/mesas", tags=["mesas"])
app.include_router(sectores_router, prefix="/sectores", tags=["sectores"])

# activa paginación (page/size en Swagger)
add_pagination(app)
