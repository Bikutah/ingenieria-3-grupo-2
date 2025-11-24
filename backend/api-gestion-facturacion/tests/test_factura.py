import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from unittest.mock import patch, AsyncMock

# --- Solución al problema de importación ---
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.database import Base, get_db
from src.factura import models

# --- Configuración de la Base de Datos de Prueba ---
# Usamos una base de datos SQLite en memoria para los tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # Deshabilita el pooling de conexiones para SQLite en memoria
)

# Creamos una sesión de prueba
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Sobrescribir la Dependencia de la Base de Datos ---
# Esta función reemplazará a `get_db` durante los tests
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Le decimos a la app de FastAPI que use nuestra BD de prueba
app.dependency_overrides[get_db] = override_get_db

# --- Fixture de Pytest para el Cliente de Test ---
# Este fixture se ejecutará antes de cada test
@pytest.fixture()
def client():
    # Crea todas las tablas en la base de datos en memoria
    Base.metadata.create_all(bind=engine)

    # Yield es como un return, pero el código continúa después de que el test termina
    yield TestClient(app)

    # Limpia la base de datos después de cada test
    Base.metadata.drop_all(bind=engine)

# --- Tests para el endpoint de Facturas ---

@patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada')
@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
@patch('src.factura.validator.FacturaValidator.calcular_total_con_descuento_seña')
def test_crear_factura_exitoso(mock_calcular_total, mock_obtener_datos, mock_marcar_facturada, client):
    """
    Test para verificar la creación exitosa de una factura desde id_comanda.
    """
    # Mockear los datos de la comanda y sus detalles
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": [
            {
                "id": 1,
                "id_comanda": 1,
                "id_producto": 1,
                "cantidad": 2,
                "precio_unitario": 150000
            },
            {
                "id": 2,
                "id_comanda": 1,
                "id_producto": 2,
                "cantidad": 1,
                "precio_unitario": 100000
            }
        ]
    }
    mock_calcular_total.return_value = 400000  # Total calculado
    mock_marcar_facturada.return_value = None  # Mock exitoso

    # Datos de factura: solo id_comanda y medio_pago
    factura_data = {
        "id_comanda": 1,
        "medio_pago": "transferencia"
    }

    response = client.post("/factura/", json=factura_data)

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["id_comanda"] == 1
    assert data["total"] == 400000  # 2*150000 + 1*100000
    assert data["monto_seña"] == 0.0  # Sin reserva, sin seña
    assert data["medio_pago"] == "transferencia"
    assert data["estado"] == "pendiente"
    assert "id" in data
    assert "fecha_emision" in data
    assert len(data["detalles_factura"]) == 2

@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_crear_factura_sin_detalles_comanda(mock_obtener_datos, client):
    """
    Test para verificar que no se puede crear factura si la comanda no tiene detalles.
    """
    # Mockear comanda sin detalles
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": []  # Sin detalles
    }

    factura_data = {
        "id_comanda": 1,
        "medio_pago": "efectivo"
    }

    response = client.post("/factura/", json=factura_data)
    # Debería fallar porque no hay detalles para facturar
    assert response.status_code == 400  # Error de validación por comanda sin detalles
    assert "sin detalles" in response.json()["detail"]

@patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada')
@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_obtener_lista_de_facturas(mock_obtener_datos, mock_marcar_facturada, client):
    """
    Test para verificar que se puede obtener una lista paginada de facturas.
    """
    # Mock para primera factura
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }
    mock_marcar_facturada.return_value = None  # Mock exitoso

    # Crear primera factura
    client.post("/factura/", json={"id_comanda": 1, "medio_pago": "efectivo"})

    # Mock para segunda factura
    mock_obtener_datos.return_value = {
        "comanda": {"id": 2, "fecha": "2025-01-02"},
        "detalles": [{"id": 2, "id_comanda": 2, "id_producto": 2, "cantidad": 1, "precio_unitario": 200000}]
    }

    # Crear segunda factura
    client.post("/factura/", json={"id_comanda": 2, "medio_pago": "transferencia"})

    response = client.get("/factura/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2

@patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada')
@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_filtrar_facturas_por_estado(mock_obtener_datos, mock_marcar_facturada, client):
    """
    Test para verificar el filtro de facturas por estado.
    """
    # Mock para primera factura
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }
    mock_marcar_facturada.return_value = None  # Mock exitoso

    # Crear primera factura
    response1 = client.post("/factura/", json={"id_comanda": 1, "medio_pago": "efectivo"})
    factura_id = response1.json()["id"]

    # Cambiar una factura a pagada
    with patch('src.factura.httpClient.ComandaClient.marcar_comanda_pagada') as mock_marcar_pagada:
        mock_marcar_pagada.return_value = None
        client.put(f"/factura/{factura_id}/pagar")

    # Mock para segunda factura
    mock_obtener_datos.return_value = {
        "comanda": {"id": 2, "fecha": "2025-01-02"},
        "detalles": [{"id": 2, "id_comanda": 2, "id_producto": 2, "cantidad": 1, "precio_unitario": 200000}]
    }

    # Crear segunda factura pendiente
    client.post("/factura/", json={"id_comanda": 2, "medio_pago": "transferencia"})

    # Filtrar por estado pendiente
    response = client.get("/factura/?estado=pendiente")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1  # Solo una factura pendiente
    assert data["items"][0]["estado"] == "pendiente"

@patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada')
@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_filtrar_facturas_por_comanda(mock_obtener_datos, mock_marcar_facturada, client):
    """
    Test para verificar el filtro de facturas por id_comanda.
    """
    # Mock para primera factura
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }
    mock_marcar_facturada.return_value = None  # Mock exitoso

    # Crear primera factura
    client.post("/factura/", json={"id_comanda": 1, "medio_pago": "efectivo"})

    # Mock para segunda factura
    mock_obtener_datos.return_value = {
        "comanda": {"id": 2, "fecha": "2025-01-02"},
        "detalles": [{"id": 2, "id_comanda": 2, "id_producto": 2, "cantidad": 1, "precio_unitario": 200000}]
    }

    # Crear segunda factura
    client.post("/factura/", json={"id_comanda": 2, "medio_pago": "transferencia"})

    # Filtrar por id_comanda=1
    response = client.get("/factura/?id_comanda=1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["id_comanda"] == 1

@patch('src.factura.httpClient.ComandaClient.marcar_comanda_pagada')
@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_marcar_factura_como_pagada(mock_obtener_datos, mock_marcar_pagada, client):
    """
    Test para verificar el cambio de estado a pagada.
    """
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }
    mock_marcar_pagada.return_value = None  # Mock exitoso

    # Agregar mock para crear factura
    with patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada') as mock_marcar_facturada:
        mock_marcar_facturada.return_value = None
        # Crear factura
        response_creacion = client.post("/factura/", json={"id_comanda": 1, "medio_pago": "efectivo"})
        factura_id = response_creacion.json()["id"]

    # Marcar como pagada

    # Marcar como pagada
    response = client.put(f"/factura/{factura_id}/pagar")
    assert response.status_code == 200
    data = response.json()
    assert data["estado"] == "pagada"

    # Verificar que persiste
    response_get = client.get(f"/factura/{factura_id}")
    assert response_get.json()["estado"] == "pagada"

@patch('src.factura.httpClient.ComandaClient.marcar_comanda_pendiente')
@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_marcar_factura_como_cancelada(mock_obtener_datos, mock_marcar_pendiente, client):
    """
    Test para verificar el cambio de estado a cancelada.
    """
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }
    mock_marcar_pendiente.return_value = None  # Mock exitoso

    # Agregar mock para crear factura
    with patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada') as mock_marcar_facturada:
        mock_marcar_facturada.return_value = None
        # Crear factura
        response_creacion = client.post("/factura/", json={"id_comanda": 1, "medio_pago": "efectivo"})
        factura_id = response_creacion.json()["id"]

    # Marcar como cancelada
    response = client.put(f"/factura/{factura_id}/cancelar")
    assert response.status_code == 200
    data = response.json()
    assert data["estado"] == "cancelada"

@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_marcar_factura_como_anulada(mock_obtener_datos, client):
    """
    Test para verificar el cambio de estado a anulada.
    """
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }

    # Agregar mock para crear factura
    with patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada') as mock_marcar_facturada:
        mock_marcar_facturada.return_value = None
        # Crear factura
        response_creacion = client.post("/factura/", json={"id_comanda": 1, "medio_pago": "efectivo"})
        factura_id = response_creacion.json()["id"]

    # Marcar como anulada
    with patch('src.factura.httpClient.ComandaClient.marcar_comanda_pendiente') as mock_marcar_pendiente:
        mock_marcar_pendiente.return_value = None
        response = client.put(f"/factura/{factura_id}/anular")
        assert response.status_code == 200
        data = response.json()
        assert data["estado"] == "anulada"

@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_no_pagar_factura_ya_pagada(mock_obtener_datos, client):
    """
    Test para verificar que no se puede pagar una factura ya pagada.
    """
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }

    # Crear y pagar factura
    with patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada') as mock_marcar_facturada, \
         patch('src.factura.httpClient.ComandaClient.marcar_comanda_pagada') as mock_marcar_pagada:
        mock_marcar_facturada.return_value = None
        mock_marcar_pagada.return_value = None
        response_creacion = client.post("/factura/", json={"id_comanda": 1, "medio_pago": "efectivo"})
        factura_id = response_creacion.json()["id"]
        client.put(f"/factura/{factura_id}/pagar")

    # Intentar pagar nuevamente
    response = client.put(f"/factura/{factura_id}/pagar")
    assert response.status_code == 400
    assert "No se puede cambiar el estado" in response.json()["detail"]

@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_no_cancelar_factura_ya_pagada(mock_obtener_datos, client):
    """
    Test para verificar que no se puede cancelar una factura ya pagada.
    """
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }

    # Crear y pagar factura
    with patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada') as mock_marcar_facturada, \
         patch('src.factura.httpClient.ComandaClient.marcar_comanda_pagada') as mock_marcar_pagada:
        mock_marcar_facturada.return_value = None
        mock_marcar_pagada.return_value = None
        response_creacion = client.post("/factura/", json={"id_comanda": 1, "medio_pago": "efectivo"})
        factura_id = response_creacion.json()["id"]
        client.put(f"/factura/{factura_id}/pagar")

    # Intentar cancelar
    response = client.put(f"/factura/{factura_id}/cancelar")
    assert response.status_code == 400
    assert "No se puede cambiar el estado" in response.json()["detail"]

@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_obtener_factura_por_id(mock_obtener_datos, client):
    """
    Test para verificar la obtención de una factura específica.
    """
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }

    # Crear factura
    with patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada') as mock_marcar_facturada:
        mock_marcar_facturada.return_value = None
        response_creacion = client.post("/factura/", json={"id_comanda": 1, "medio_pago": "efectivo"})
        factura_id = response_creacion.json()["id"]

    # Obtener factura
    response = client.get(f"/factura/{factura_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == factura_id
    assert data["id_comanda"] == 1
    assert len(data["detalles_factura"]) == 1

def test_obtener_factura_inexistente(client):
    """
    Test para verificar el manejo de IDs inexistentes.
    """
    response = client.get("/factura/999")
    assert response.status_code == 404

@patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada')
@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
@patch('src.factura.validator.FacturaValidator.calcular_total_con_descuento_seña')
def test_crear_factura_sin_reserva(mock_calcular_total, mock_obtener_datos, mock_marcar_facturada, client):
    """
    Test para verificar que factura sin reserva cobra el total completo.
    """
    # Configurar mocks
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "fecha": "2025-01-01"},  # Sin id_reserva
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }
    mock_calcular_total.return_value = 100000  # Total completo
    mock_marcar_facturada.return_value = None  # Mock exitoso

    factura_data = {
        "id_comanda": 1,
        "medio_pago": "efectivo"
    }

    response = client.post("/factura/", json=factura_data)
    assert response.status_code == 201
    data = response.json()
    assert data["id_comanda"] == 1
    assert data["total"] == 100000  # Cobra el total completo
    assert data["monto_seña"] == 0.0  # Reserva sin seña

@patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada')
@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
@patch('src.factura.validator.FacturaValidator.calcular_total_con_descuento_seña')
def test_crear_factura_con_reserva_sin_seña(mock_calcular_total, mock_obtener_datos, mock_marcar_facturada, client):
    """
    Test para verificar que reserva con monto_seña = 0 cobra el total completo.
    """
    # Configurar mocks
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "id_reserva": 123, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }
    mock_calcular_total.return_value = 100000  # Total completo (sin descuento)
    mock_marcar_facturada.return_value = None  # Mock exitoso

    factura_data = {
        "id_comanda": 1,
        "medio_pago": "efectivo"
    }

    response = client.post("/factura/", json=factura_data)
    assert response.status_code == 201
    data = response.json()
    assert data["id_comanda"] == 1
    assert data["total"] == 100000  # Cobra el total completo

@patch('src.factura.httpClient.ComandaClient.marcar_comanda_facturada')
@patch('src.factura.validator.FacturaValidator.obtener_descuento_seña')
@patch('src.factura.validator.FacturaValidator.calcular_total_con_descuento_seña')
@patch('src.factura.validator.FacturaValidator.obtener_datos_comanda')
def test_crear_factura_con_reserva_con_seña(mock_obtener_datos, mock_calcular_total, mock_obtener_descuento, mock_marcar_facturada, client):
    """
    Test para verificar que se aplica descuento automático si monto_seña > 0.
    """
    # Configurar mocks
    mock_obtener_datos.return_value = {
        "comanda": {"id": 1, "id_reserva": 123, "fecha": "2025-01-01"},
        "detalles": [{"id": 1, "id_comanda": 1, "id_producto": 1, "cantidad": 1, "precio_unitario": 100000}]
    }
    mock_calcular_total.return_value = 50000  # Total con descuento de seña de 50000
    mock_obtener_descuento.return_value = 50000  # Monto de seña aplicado
    mock_marcar_facturada.return_value = None  # Mock exitoso

    factura_data = {
        "id_comanda": 1,
        "medio_pago": "efectivo"
    }

    response = client.post("/factura/", json=factura_data)
    assert response.status_code == 201
    data = response.json()
    assert data["id_comanda"] == 1
    assert data["total"] == 50000  # Aplica descuento por seña
    assert data["monto_seña"] == 50000  # Guarda el monto de seña aplicado

# Este test ya no aplica porque ahora el total se calcula automáticamente
# def test_validacion_total_incorrecto(client):
#     pass