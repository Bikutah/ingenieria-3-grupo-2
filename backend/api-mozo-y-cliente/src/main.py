from fastapi import FastAPI
from .database import engine
from .mozo import models as mozo_models
from .cliente import models as cliente_models
from .mozo.router import router as mozo_router
from .cliente.router import router as cliente_router

# Crea las tablas en la base de datos (si no existen)
mozo_models.Base.metadata.create_all(bind=engine)
cliente_models.Base.metadata.create_all(bind=engine)
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="API mozo-y-cliente")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite (React)
        "http://localhost:3000",  # Create React App
        "http://localhost:5174",  # Vite alternativo
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Permite GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],  # Permite todos los headers
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "mozo-y-cliente"}

app.include_router(mozo_router, prefix="/mozo", tags=["mozo"])
app.include_router(cliente_router, prefix="/cliente", tags=["cliente"])
