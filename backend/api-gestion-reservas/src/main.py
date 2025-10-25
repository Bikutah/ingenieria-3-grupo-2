from fastapi import FastAPI
from .database import engine
from .reserva import models as reserva_models
from .reserva.router import router as reserva_router

# Crea las tablas en la base de datos (si no existen)
reserva_models.Base.metadata.create_all(bind=engine)

from fastapi_pagination import add_pagination

app = FastAPI(title="API gestion-reservas")

@app.get("/health")
def health():
    return {"status": "ok", "service": "gestion-reservas"}

app.include_router(reserva_router, prefix="/reserva", tags=["reserva"])

# activa paginación (page/size en Swagger)
add_pagination(app)
