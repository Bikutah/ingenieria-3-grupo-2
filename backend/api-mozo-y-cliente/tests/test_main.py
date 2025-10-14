from httpx import AsyncClient
from src.main import app
import pytest

@pytest.mark.anyio
async def test_health_ok():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
