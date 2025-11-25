from fastapi import FastAPI
from .database import engine
from .reporte import models as reporte_models
from .reporte.router import router as reporte_router

# Crea las tablas en la base de datos (si no existen)
reporte_models.Base.metadata.create_all(bind=engine)

from fastapi_pagination import add_pagination

app = FastAPI(title="API reporte")

@app.get("/health")
def health():
    return {"status": "ok", "service": "reporte"}

app.include_router(reporte_router, prefix="/reporte", tags=["reporte"])

# activa paginación (page/size en Swagger)
add_pagination(app)
