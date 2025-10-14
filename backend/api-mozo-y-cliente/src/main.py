from fastapi import FastAPI
from .database import engine
from .mozo import models as mozo_models
from .cliente import models as cliente_models
from .mozo.router import router as mozo_router
from .cliente.router import router as cliente_router

# Crea las tablas en la base de datos (si no existen)
mozo_models.Base.metadata.create_all(bind=engine)
cliente_models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API mozo-y-cliente")

@app.get("/health")
def health():
    return {"status": "ok", "service": "mozo-y-cliente"}

app.include_router(mozo_router, prefix="/mozo", tags=["mozo"])
app.include_router(cliente_router, prefix="/cliente", tags=["cliente"])
