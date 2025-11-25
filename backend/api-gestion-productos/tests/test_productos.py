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

# --- Tests para el endpoint de Productos ---

def test_crear_producto_exitoso(client):
    """
    Test para verificar la creación exitosa de un producto.
    Primero crea una carta para poder asociarla.
    """
    # 1. Crear una carta primero, ya que es una dependencia
    response_carta = client.post("/carta/", json={"nombre": "Carta de Verano"})
    assert response_carta.status_code == 201, response_carta.text
    carta_id = response_carta.json()["id"]

    # 2. Ahora crear el producto
    producto_data = {
        "nombre": "Pizza Margarita",
        "tipo": "plato",
        "precio": 12.50,
        "id_carta": carta_id
    }
    response = client.post("/productos/", json=producto_data)
    
    # 3. Verificar el resultado
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["nombre"] == producto_data["nombre"]
    assert data["precio"] == producto_data["precio"]
    assert data["id_carta"] == carta_id
    assert "id" in data

def test_crear_producto_con_carta_inexistente(client):
    """
    Test para verificar que no se puede crear un producto si el id_carta no existe.
    """
    producto_data = {
        "nombre": "Jugo de Naranja",
        "tipo": "bebida",
        "precio": 3.00,
        "id_carta": 999  # Un ID que no existe
    }
    response = client.post("/productos/", json=producto_data)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Carta con ID '999' no encontrada"

def test_crear_producto_con_nombre_duplicado(client):
    """
    Test para verificar que no se puede crear un producto con un nombre que ya existe.
    """
    # Crear carta y producto inicial
    client.post("/carta/", json={"nombre": "Carta Principal"})
    client.post("/productos/", json={"nombre": "Agua Mineral", "tipo": "bebida", "precio": 2.0, "id_carta": 1})

    # Intentar crear otro producto con el mismo nombre
    response = client.post("/productos/", json={"nombre": "Agua Mineral", "tipo": "bebida", "precio": 2.5, "id_carta": 1})

    assert response.status_code == 409
    assert "Ya existe un producto con el nombre 'Agua Mineral'" in response.json()["detail"]

def test_obtener_lista_de_productos(client):
    """
    Test para verificar que se puede obtener una lista paginada de productos.
    """
    # Crear datos de prueba
    client.post("/carta/", json={"nombre": "Carta Única"})
    client.post("/productos/", json={"nombre": "Producto 1", "tipo": "plato", "precio": 10, "id_carta": 1})
    client.post("/productos/", json={"nombre": "Producto 2", "tipo": "postre", "precio": 5, "id_carta": 1})

    # Obtener la lista
    response = client.get("/productos/")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["nombre"] == "Producto 1"

def test_filtrar_productos_por_carta(client):
    """
    Test para verificar el filtro de productos por id_carta.
    """
    # Crear dos cartas y productos en cada una
    client.post("/carta/", json={"nombre": "Carta A"}) # id=1
    client.post("/carta/", json={"nombre": "Carta B"}) # id=2
    client.post("/productos/", json={"nombre": "Papas Fritas", "tipo": "plato", "precio": 4, "id_carta": 1})
    client.post("/productos/", json={"nombre": "Helado", "tipo": "postre", "precio": 3, "id_carta": 2})

    # Filtrar por la carta 1
    response = client.get("/productos/?id_carta=1")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre"] == "Papas Fritas"

    # Filtrar por la carta 2
    response = client.get("/productos/?id_carta=2")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre"] == "Helado"

def test_modificar_producto(client):
    """
    Test para verificar la modificación de un producto existente.
    """
    # Datos iniciales
    client.post("/carta/", json={"nombre": "Carta de Vinos"})
    response_creacion = client.post("/productos/", json={"nombre": "Vino Tinto", "tipo": "bebida", "precio": 20, "id_carta": 1})
    producto_id = response_creacion.json()["id"]

    # Modificar el precio
    response_modificacion = client.put(f"/productos/{producto_id}", json={"precio": 25.5})
    
    assert response_modificacion.status_code == 200
    data = response_modificacion.json()
    assert data["precio"] == 25.5
    assert data["nombre"] == "Vino Tinto" # El nombre no debe cambiar

    # Verificar que el cambio persiste
    response_get = client.get(f"/productos/{producto_id}")
    assert response_get.json()["precio"] == 25.5

def test_eliminar_producto(client):
    """
    Test para verificar la eliminación lógica de un producto.
    """
    # Crear carta y producto
    client.post("/carta/", json={"nombre": "Carta Test"})
    response_creacion = client.post("/productos/", json={"nombre": "Producto Test", "tipo": "plato", "precio": 10, "id_carta": 1})
    producto_id = response_creacion.json()["id"]

    # Eliminar producto (baja lógica)
    response_delete = client.delete(f"/productos/{producto_id}")
    assert response_delete.status_code == 204

    # Verificar que está dado de baja
    response_get = client.get(f"/productos/{producto_id}")
    assert response_get.json()["baja"] == True

def test_reutilizar_nombre_producto_despues_baja(client):
    """
    Test para verificar que se puede reutilizar el nombre de un producto eliminado lógicamente.
    """
    # Crear carta y producto
    client.post("/carta/", json={"nombre": "Carta Test"})
    client.post("/productos/", json={"nombre": "Producto Original", "tipo": "plato", "precio": 10, "id_carta": 1})

    # Eliminar producto (baja lógica)
    response_delete = client.delete("/productos/1")
    assert response_delete.status_code == 204

    # Crear nuevo producto con el mismo nombre debería funcionar
    response_nuevo = client.post("/productos/", json={"nombre": "Producto Original", "tipo": "bebida", "precio": 15, "id_carta": 1})
    assert response_nuevo.status_code == 201
    data = response_nuevo.json()
    assert data["nombre"] == "Producto Original"
    assert data["tipo"] == "bebida"

def test_eliminar_carta(client):
    """
    Test para verificar la eliminación lógica de una carta.
    """
    # Crear carta sin productos
    response_creacion = client.post("/carta/", json={"nombre": "Carta Test"})
    carta_id = response_creacion.json()["id"]

    # Eliminar carta (baja lógica)
    response_delete = client.delete(f"/carta/{carta_id}")
    assert response_delete.status_code == 204

    # Verificar que está dada de baja
    response_get = client.get(f"/carta/{carta_id}")
    assert response_get.json()["baja"] == True

def test_reutilizar_nombre_carta_despues_baja(client):
    """
    Test para verificar que se puede reutilizar el nombre de una carta eliminada lógicamente.
    """
    # Crear carta
    client.post("/carta/", json={"nombre": "Carta Original"})

    # Eliminar carta (baja lógica)
    response_delete = client.delete("/carta/1")
    assert response_delete.status_code == 204

    # Crear nueva carta con el mismo nombre debería funcionar
    response_nueva = client.post("/carta/", json={"nombre": "Carta Original"})
    assert response_nueva.status_code == 201
    data = response_nueva.json()
    assert data["nombre"] == "Carta Original"
