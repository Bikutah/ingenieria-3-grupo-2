import pytest
from fastapi.testclient import TestClient
from datetime import date

# --- Solución al problema de importación ---
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.database import Base, get_db

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

# --- Tests para el endpoint de Comanda ---

def test_crear_comanda_exitoso(client):
    """
    Test para verificar la creación exitosa de una comanda con detalles.
    """
    comanda_data = {
        "id_mesa": 1,
        "id_mozo": 1,
        "id_reserva": None,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [
            {
                "id_producto": 10,
                "cantidad": 2,
                "precio_unitario": 150.50
            },
            {
                "id_producto": 20,
                "cantidad": 1,
                "precio_unitario": 250.75
            }
        ]
    }
    response = client.post("/comanda/", json=comanda_data)
    
    # Verificar el resultado
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["id_mesa"] == comanda_data["id_mesa"]
    assert data["id_mozo"] == comanda_data["id_mozo"]
    assert data["baja"] == False
    assert "id" in data
    assert len(data["detalles_comanda"]) == 2
    assert data["detalles_comanda"][0]["precio_unitario"] == 150.50

def test_crear_comanda_sin_detalles(client):
    """
    Test para verificar que no se puede crear una comanda sin detalles.
    Debe requerir al menos 1 detalle (min_items=1).
    """
    comanda_data = {
        "id_mesa": 1,
        "id_mozo": 1,
        "id_reserva": None,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": []  # Lista vacía
    }
    response = client.post("/comanda/", json=comanda_data)
    
    assert response.status_code == 422  # Unprocessable Entity (error de validación)

def test_crear_comanda_con_precio_decimal(client):
    """
    Test para verificar que el precio_unitario acepta valores decimales (Float).
    """
    comanda_data = {
        "id_mesa": 5,
        "id_mozo": 2,
        "id_reserva": None,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [
            {
                "id_producto": 15,
                "cantidad": 3,
                "precio_unitario": 99.99
            }
        ]
    }
    response = client.post("/comanda/", json=comanda_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["detalles_comanda"][0]["precio_unitario"] == 99.99

def test_obtener_lista_de_comandas(client):
    """
    Test para verificar que se puede obtener una lista paginada de comandas.
    """
    # Crear datos de prueba
    client.post("/comanda/", json={
        "id_mesa": 1,
        "id_mozo": 1,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [{"id_producto": 1, "cantidad": 1, "precio_unitario": 10.0}]
    })
    client.post("/comanda/", json={
        "id_mesa": 2,
        "id_mozo": 2,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [{"id_producto": 2, "cantidad": 2, "precio_unitario": 20.0}]
    })

    # Obtener la lista
    response = client.get("/comanda/")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 2
    assert len(data["items"]) == 2

def test_obtener_comanda_por_id(client):
    """
    Test para verificar que se puede obtener una comanda específica por ID.
    """
    # Crear una comanda
    response_creacion = client.post("/comanda/", json={
        "id_mesa": 3,
        "id_mozo": 1,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [{"id_producto": 5, "cantidad": 1, "precio_unitario": 50.0}]
    })
    comanda_id = response_creacion.json()["id"]

    # Obtener por ID
    response = client.get(f"/comanda/{comanda_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == comanda_id
    assert data["id_mesa"] == 3

def test_obtener_detalles_de_comanda(client):
    """
    Test para verificar que se pueden obtener los detalles de una comanda.
    """
    # Crear comanda con detalles
    response_creacion = client.post("/comanda/", json={
        "id_mesa": 4,
        "id_mozo": 2,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [
            {"id_producto": 10, "cantidad": 2, "precio_unitario": 100.0},
            {"id_producto": 20, "cantidad": 1, "precio_unitario": 200.0}
        ]
    })
    comanda_id = response_creacion.json()["id"]

    # Obtener detalles
    response = client.get(f"/comanda/{comanda_id}/detalles")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2

def test_agregar_detalle_a_comanda(client):
    """
    Test para verificar que se puede agregar un detalle a una comanda existente.
    """
    # Crear comanda
    response_creacion = client.post("/comanda/", json={
        "id_mesa": 5,
        "id_mozo": 3,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [{"id_producto": 1, "cantidad": 1, "precio_unitario": 10.0}]
    })
    comanda_id = response_creacion.json()["id"]

    # Agregar nuevo detalle
    nuevo_detalle = {
        "id_producto": 30,
        "cantidad": 3,
        "precio_unitario": 89.99
    }
    response = client.post(f"/comanda/{comanda_id}/detalles", json=nuevo_detalle)
    
    assert response.status_code == 201
    data = response.json()
    assert data["id_producto"] == 30
    assert data["cantidad"] == 3
    assert data["precio_unitario"] == 89.99

    # Verificar que ahora hay 2 detalles
    response_detalles = client.get(f"/comanda/{comanda_id}/detalles")
    assert response_detalles.json()["total"] == 2

def test_modificar_detalle_de_comanda(client):
    """
    Test para verificar que se puede modificar un detalle existente.
    """
    # Crear comanda con detalle
    response_creacion = client.post("/comanda/", json={
        "id_mesa": 6,
        "id_mozo": 1,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [{"id_producto": 50, "cantidad": 1, "precio_unitario": 100.0}]
    })
    comanda_id = response_creacion.json()["id"]
    detalle_id = response_creacion.json()["detalles_comanda"][0]["id"]

    # Modificar el detalle
    detalle_modificado = {
        "id_producto": 50,
        "cantidad": 5,  # Cambiar cantidad
        "precio_unitario": 95.0  # Cambiar precio
    }
    response = client.put(f"/comanda/{comanda_id}/detalles/{detalle_id}", json=detalle_modificado)
    
    assert response.status_code == 200
    data = response.json()
    assert data["cantidad"] == 5
    assert data["precio_unitario"] == 95.0

def test_eliminar_comanda_soft_delete(client):
    """
    Test para verificar que el DELETE marca baja=True (soft delete) sin eliminar físicamente.
    """
    # Crear comanda
    response_creacion = client.post("/comanda/", json={
        "id_mesa": 7,
        "id_mozo": 2,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [{"id_producto": 1, "cantidad": 1, "precio_unitario": 10.0}]
    })
    comanda_id = response_creacion.json()["id"]

    # Eliminar (soft delete)
    response_delete = client.delete(f"/comanda/{comanda_id}")
    assert response_delete.status_code == 204

    # Verificar que todavía existe pero con baja=True
    response_get = client.get(f"/comanda/{comanda_id}")
    assert response_get.status_code == 200
    data = response_get.json()
    assert data["baja"] == True

def test_modificar_comanda(client):
    """
    Test para verificar la modificación de una comanda existente.
    """
    # Crear comanda inicial
    response_creacion = client.post("/comanda/", json={
        "id_mesa": 8,
        "id_mozo": 1,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [{"id_producto": 1, "cantidad": 1, "precio_unitario": 10.0}]
    })
    comanda_id = response_creacion.json()["id"]

    # Modificar la comanda (cambiar mesa y mozo)
    comanda_modificada = {
        "id_mesa": 9,
        "id_mozo": 3,
        "fecha": str(date.today()),
        "baja": False,
        "detalles_comanda": [{"id_producto": 1, "cantidad": 1, "precio_unitario": 10.0}]
    }
    response = client.put(f"/comanda/{comanda_id}", json=comanda_modificada)
    
    assert response.status_code == 200
    data = response.json()
    assert data["id_mesa"] == 9
    assert data["id_mozo"] == 3
