from httpx import AsyncClient
from src.main import app
import pytest

@pytest.mark.anyio
async def test_cliente_crud():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post("/cliente/", json={"nombre": "ejemplo"})
        assert r.status_code == 200
        data = r.json()
        r = await ac.get("/cliente/")
        assert r.status_code == 200
        assert len(r.json()) >= 1
        r = await ac.get(f"/cliente/{data['id']}")
        assert r.status_code == 200
