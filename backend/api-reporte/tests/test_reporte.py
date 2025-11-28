import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, Mock
from datetime import date

# --- Solución al problema de importación ---
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.main import app

# --- Fixture de Pytest para el Cliente de Test ---
@pytest.fixture()
def client():
    yield TestClient(app)

# --- Tests para el endpoint de Reportes ---

@patch('httpx.AsyncClient.get', new_callable=AsyncMock)
def test_reporte_ganancias_mensuales(mock_get, client):
    """
    Test para verificar el reporte de ganancias mensuales.
    """
    # Mock de la respuesta de la API de facturación
    mock_response = Mock()
    mock_response.json.return_value = {
        "items": [
            {"estado": "pagada", "total": 1000.0, "fecha_emision": "2023-01-15"},
            {"estado": "pagada", "total": 2000.0, "fecha_emision": "2023-01-20"},
            {"estado": "pendiente", "total": 500.0, "fecha_emision": "2023-01-25"},  # No debería contar
            {"estado": "pagada", "total": 1500.0, "fecha_emision": "2023-02-10"},
        ]
    }
    mock_response.raise_for_status = Mock()
    mock_get.return_value = mock_response

    response = client.get("/reporte/ganancias-mensuales/?año=2023")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 12  # 12 meses
    assert data[0]["mes"] == 1  # Enero
    assert data[0]["ganancia"] == 3000.0  # 1000 + 2000
    assert data[1]["mes"] == 2  # Febrero
    assert data[1]["ganancia"] == 1500.0

@patch('httpx.AsyncClient.get', new_callable=AsyncMock)
def test_reporte_top_productos_vendidos(mock_get, client):
    """
    Test para verificar el reporte de top productos vendidos.
    """
    # Mock de la respuesta de la API de comandas
    mock_comanda_response = Mock()
    mock_comanda_response.json.return_value = {
        "items": [
            {
                "estado": "pagada",
                "detalles_comanda": [
                    {"id_producto": 1, "cantidad": 2},
                    {"id_producto": 2, "cantidad": 1}
                ]
            },
            {
                "estado": "facturada",
                "detalles_comanda": [
                    {"id_producto": 1, "cantidad": 3},
                    {"id_producto": 3, "cantidad": 1}
                ]
            }
        ]
    }
    mock_comanda_response.raise_for_status = Mock()

    # Mock de las respuestas de la API de productos
    def mock_get_product(url):
        mock_resp = Mock()
        mock_resp.raise_for_status = Mock()
        if "productos/1" in url:
            mock_resp.json.return_value = {"id": 1, "nombre": "Pizza", "tipo": "plato"}
        elif "productos/2" in url:
            mock_resp.json.return_value = {"id": 2, "nombre": "Cerveza", "tipo": "bebida"}
        elif "productos/3" in url:
            mock_resp.json.return_value = {"id": 3, "nombre": "Ensalada", "tipo": "plato"}
        else:
            mock_resp.status_code = 404
            mock_resp.json.return_value = {}
        return mock_resp

    mock_get.side_effect = lambda url: mock_get_product(url) if "productos" in url else mock_comanda_response

    response = client.get("/reporte/top-productos-vendidos/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3  # Top 3 productos
    assert data[0]["id_producto"] == 1
    assert data[0]["nombre"] == "Pizza"
    assert data[0]["cantidad_total"] == 5  # 2 + 3

@patch('httpx.AsyncClient.get', new_callable=AsyncMock)
def test_reporte_dias_concurridos(mock_get, client):
    """
    Test para verificar el reporte de días concurridos.
    """
    # Mock de la respuesta de la API de comandas
    mock_response = Mock()
    mock_response.json.return_value = {
        "items": [
            {"fecha": "2023-10-01"},  # Domingo
            {"fecha": "2023-10-02"},  # Lunes
            {"fecha": "2023-10-02"},  # Lunes
            {"fecha": "2023-10-03"},  # Martes
            {"fecha": "2023-10-06"},  # Viernes
            {"fecha": "2023-10-06"},  # Viernes
            {"fecha": "2023-10-06"},  # Viernes
        ]
    }
    mock_response.raise_for_status = Mock()
    mock_get.return_value = mock_response

    response = client.get("/reporte/dias-concurridos/?fecha_desde=2023-10-01&fecha_hasta=2023-10-07")
    assert response.status_code == 200
    data = response.json()
    assert data["lunes"] == 2
    assert data["viernes"] == 3
    assert data["domingo"] == 1
    assert data["martes"] == 1
    # Otros días deberían ser 0

@patch('httpx.AsyncClient.get', new_callable=AsyncMock)
def test_reporte_mozo_del_mes(mock_get, client):
    """
    Test para verificar el reporte del mozo del mes.
    """
    # Mock de la respuesta de la API de comandas
    mock_comanda_response = Mock()
    mock_comanda_response.json.return_value = {
        "items": [
            {"id_mozo": 1, "fecha": "2023-10-01"},
            {"id_mozo": 1, "fecha": "2023-10-05"},
            {"id_mozo": 2, "fecha": "2023-10-10"},
            {"id_mozo": 1, "fecha": "2023-10-15"},
            {"id_mozo": 3, "fecha": "2023-10-20"},
        ]
    }
    mock_comanda_response.raise_for_status = Mock()

    # Mock de la respuesta de la API de mozos
    def mock_get_mozo(url):
        mock_resp = Mock()
        mock_resp.raise_for_status = Mock()
        if "mozo/1" in url:
            mock_resp.json.return_value = {"id": 1, "nombre": "Juan", "apellido": "Pérez"}
        elif "mozo/2" in url:
            mock_resp.json.return_value = {"id": 2, "nombre": "María", "apellido": "García"}
        elif "mozo/3" in url:
            mock_resp.json.return_value = {"id": 3, "nombre": "Carlos", "apellido": "López"}
        else:
            mock_resp.status_code = 404
            mock_resp.json.return_value = {}
        return mock_resp

    mock_get.side_effect = lambda url: mock_get_mozo(url) if "mozo" in url else mock_comanda_response

    response = client.get("/reporte/mozo-del-mes/?año=2023&mes=10")
    assert response.status_code == 200
    data = response.json()
    assert data["id_mozo"] == 1
    assert data["nombre_completo"] == "Juan Pérez"
    assert data["cantidad_comandas"] == 3

@patch('httpx.AsyncClient.get', new_callable=AsyncMock)
def test_reporte_mozo_del_mes_sin_comandas(mock_get, client):
    """
    Test para verificar el manejo cuando no hay comandas en el período.
    """
    # Mock de respuesta vacía
    mock_response = Mock()
    mock_response.json.return_value = {"items": []}
    mock_response.raise_for_status = Mock()
    mock_get.return_value = mock_response

    response = client.get("/reporte/mozo-del-mes/?año=2023&mes=11")
    assert response.status_code == 404
    assert "No se encontraron comandas" in response.json()["detail"]