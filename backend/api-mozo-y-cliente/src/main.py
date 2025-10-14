from fastapi import FastAPI
from .mozo.router import router as mozo_router
from .cliente.router import router as cliente_router

app = FastAPI(title="API mozo-y-cliente")

@app.get("/health")
def health():
    return {"status": "ok", "service": "mozo-y-cliente"}

app.include_router(mozo_router, prefix="/mozo", tags=["mozo"])
app.include_router(cliente_router, prefix="/cliente", tags=["cliente"])
