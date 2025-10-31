import pytest
from fastapi.testclient import TestClient

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

# --- Tests para los endpoints de Sectores y Mesas ---

def test_crear_sector_exitoso(client):
    """
    Test para verificar la creación exitosa de un sector.
    """
    sector_data = {
        "nombre": "Sector Principal",
        "numero": "001"
    }
    response = client.post("/sectores/", json=sector_data)

    # Verificar el resultado
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["nombre"] == sector_data["nombre"]
    assert data["numero"] == sector_data["numero"]
    assert "id" in data

def test_crear_sector_con_numero_duplicado(client):
    """
    Test para verificar que no se puede crear un sector con un número que ya existe.
    """
    # Crear sector inicial
    client.post("/sectores/", json={"nombre": "Sector A", "numero": "A01"})

    # Intentar crear otro sector con el mismo número
    response = client.post("/sectores/", json={"nombre": "Sector B", "numero": "A01"})

    assert response.status_code == 409
    assert "Número de sector ya registrado" in response.json()["detail"]

def test_obtener_lista_de_sectores(client):
    """
    Test para verificar que se puede obtener una lista paginada de sectores.
    """
    # Crear datos de prueba
    client.post("/sectores/", json={"nombre": "Sector 1", "numero": "001"})
    client.post("/sectores/", json={"nombre": "Sector 2", "numero": "002"})

    # Obtener la lista
    response = client.get("/sectores/")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["nombre"] == "Sector 1"

def test_filtrar_sectores_por_nombre(client):
    """
    Test para verificar el filtro de sectores por nombre.
    """
    # Crear sectores
    client.post("/sectores/", json={"nombre": "Terraza", "numero": "T01"})
    client.post("/sectores/", json={"nombre": "Interior", "numero": "I01"})

    # Filtrar por nombre que contiene "Terraza"
    response = client.get("/sectores/?nombre__ilike=Terraza")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre"] == "Terraza"

def test_modificar_sector(client):
    """
    Test para verificar la modificación de un sector existente.
    """
    # Datos iniciales
    response_creacion = client.post("/sectores/", json={"nombre": "Sector Original", "numero": "O01"})
    sector_id = response_creacion.json()["id"]

    # Modificar el nombre
    response_modificacion = client.put(f"/sectores/{sector_id}", json={"nombre": "Sector Modificado"})

    assert response_modificacion.status_code == 200
    data = response_modificacion.json()
    assert data["nombre"] == "Sector Modificado"
    assert data["numero"] == "O01"  # El número no debe cambiar

    # Verificar que el cambio persiste
    response_get = client.get(f"/sectores/{sector_id}")
    assert response_get.json()["nombre"] == "Sector Modificado"

def test_modificar_sector_con_numero_duplicado(client):
    """
    Test para verificar que no se puede modificar un sector con un número que ya existe.
    """
    # Crear dos sectores
    client.post("/sectores/", json={"nombre": "Sector A", "numero": "A01"})
    response_b = client.post("/sectores/", json={"nombre": "Sector B", "numero": "B01"})
    sector_b_id = response_b.json()["id"]

    # Intentar modificar el sector B con el número de A
    response = client.put(f"/sectores/{sector_b_id}", json={"numero": "A01"})

    assert response.status_code == 409
    assert "Número de sector ya registrado" in response.json()["detail"]

# --- Tests para el endpoint de Mesas ---

def test_crear_mesa_exitoso(client):
    """
    Test para verificar la creación exitosa de una mesa.
    Primero crea un sector para poder asociarla.
    """
    # 1. Crear un sector primero, ya que es una dependencia
    response_sector = client.post("/sectores/", json={"nombre": "Sector Principal", "numero": "001"})
    assert response_sector.status_code == 200, response_sector.text
    sector_id = response_sector.json()["id"]

    # 2. Ahora crear la mesa
    mesa_data = {
        "numero": "M01",
        "tipo": "interior",
        "cantidad": 4,
        "id_sector": sector_id
    }
    response = client.post("/mesas/", json=mesa_data)

    # 3. Verificar el resultado
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["numero"] == mesa_data["numero"]
    assert data["tipo"] == mesa_data["tipo"]
    assert data["cantidad"] == mesa_data["cantidad"]
    assert data["id_sector"] == sector_id
    assert "id" in data

def test_crear_mesa_con_sector_inexistente(client):
    """
    Test para verificar que no se puede crear una mesa si el id_sector no existe.
    """
    mesa_data = {
        "numero": "M01",
        "tipo": "exterior",
        "cantidad": 2,
        "id_sector": 999  # Un ID que no existe
    }
    response = client.post("/mesas/", json=mesa_data)

    assert response.status_code == 404
    assert response.json()["detail"] == "Sector no encontrado"

def test_crear_mesa_con_numero_duplicado_en_sector(client):
    """
    Test para verificar que no se puede crear una mesa con un número que ya existe en el mismo sector.
    """
    # Crear sector y mesa inicial
    client.post("/sectores/", json={"nombre": "Sector A", "numero": "A01"})
    client.post("/mesas/", json={"numero": "M01", "tipo": "interior", "cantidad": 4, "id_sector": 1})

    # Intentar crear otra mesa con el mismo número en el mismo sector
    response = client.post("/mesas/", json={"numero": "M01", "tipo": "exterior", "cantidad": 2, "id_sector": 1})

    assert response.status_code == 409
    assert "Ya existe una mesa con este número en el sector" in response.json()["detail"]

def test_obtener_lista_de_mesas(client):
    """
    Test para verificar que se puede obtener una lista paginada de mesas.
    """
    # Crear datos de prueba
    client.post("/sectores/", json={"nombre": "Sector Único", "numero": "U01"})
    client.post("/mesas/", json={"numero": "M01", "tipo": "interior", "cantidad": 4, "id_sector": 1})
    client.post("/mesas/", json={"numero": "M02", "tipo": "exterior", "cantidad": 6, "id_sector": 1})

    # Obtener la lista
    response = client.get("/mesas/")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["numero"] == "M01"

def test_filtrar_mesas_por_sector(client):
    """
    Test para verificar el filtro de mesas por id_sector.
    """
    # Crear dos sectores y mesas en cada uno
    client.post("/sectores/", json={"nombre": "Sector A", "numero": "A01"})  # id=1
    client.post("/sectores/", json={"nombre": "Sector B", "numero": "B01"})  # id=2
    client.post("/mesas/", json={"numero": "M01", "tipo": "interior", "cantidad": 4, "id_sector": 1})
    client.post("/mesas/", json={"numero": "M02", "tipo": "exterior", "cantidad": 6, "id_sector": 2})

    # Filtrar por el sector 1
    response = client.get("/mesas/?id_sector=1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["numero"] == "M01"

    # Filtrar por el sector 2
    response = client.get("/mesas/?id_sector=2")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["numero"] == "M02"

def test_modificar_mesa(client):
    """
    Test para verificar la modificación de una mesa existente.
    """
    # Datos iniciales
    client.post("/sectores/", json={"nombre": "Sector Original", "numero": "O01"})
    response_creacion = client.post("/mesas/", json={"numero": "M01", "tipo": "interior", "cantidad": 4, "id_sector": 1})
    mesa_id = response_creacion.json()["id"]

    # Modificar la cantidad
    response_modificacion = client.put(f"/mesas/{mesa_id}", json={"cantidad": 6})

    assert response_modificacion.status_code == 200
    data = response_modificacion.json()
    assert data["cantidad"] == 6
    assert data["numero"] == "M01"  # El número no debe cambiar

    # Verificar que el cambio persiste
    response_get = client.get(f"/mesas/{mesa_id}")
    assert response_get.json()["cantidad"] == 6