from fastapi import FastAPI
from .database import engine
from .productos import models as productos_models
from .carta import models as carta_models
from .productos.router import router as productos_router
from .carta.router import router as carta_router

# Crea las tablas en la base de datos (si no existen)
productos_models.Base.metadata.create_all(bind=engine)
carta_models.Base.metadata.create_all(bind=engine)

from fastapi_pagination import add_pagination

app = FastAPI(title="API gestion-productos")

@app.get("/health")
def health():
    return {"status": "ok", "service": "gestion-productos"}

app.include_router(productos_router, prefix="/productos", tags=["productos"])
app.include_router(carta_router, prefix="/carta", tags=["carta"])

# activa paginación (page/size en Swagger)
add_pagination(app)
