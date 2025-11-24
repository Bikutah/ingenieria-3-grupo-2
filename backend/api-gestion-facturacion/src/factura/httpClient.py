# app/clients/comanda_client.py
import httpx
from .. import config  # donde tengas COMANDA_API_BASE_URL

class ComandaClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or config.settings.COMANDA_API_BASE_URL

    async def marcar_comanda_facturada(self, id_comanda: int):
        async with httpx.AsyncClient(base_url=self.base_url, timeout=5) as client:
            resp = await client.put(
                f"/comanda/{id_comanda}/facturar",
            )
            resp.raise_for_status()
            return None
        
    async def marcar_comanda_pendiente(self, id_comanda: int):
        async with httpx.AsyncClient(base_url=self.base_url, timeout=5) as client:
            resp = await client.put(
                f"/comanda/{id_comanda}/pendiente",
            )
            resp.raise_for_status()
            return None


    async def marcar_comanda_pagada(self, id_comanda: int):
        async with httpx.AsyncClient(base_url=self.base_url, timeout=5) as client:
            resp = await client.put(
                f"/comanda/{id_comanda}/pagada",
            )
            resp.raise_for_status()
            return None

