import pytest
from fastapi.testclient import TestClient
from datetime import date, time

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

# --- Tests para el endpoint de Reservas ---

def test_crear_reserva_exitoso(client):
    """
    Test para verificar la creación exitosa de una reserva.
    Primero crea un cliente y una mesa para poder asociarla.
    """
    # 1. Crear un cliente primero (simulamos que existe)
    # Nota: En un entorno real, esto vendría de api-mozo-y-cliente
    # Para el test, asumimos que los IDs existen

    # 2. Crear una mesa primero (simulamos que existe)
    # Nota: En un entorno real, esto vendría de api-gestion-mesas
    # Para el test, asumimos que los IDs existen

    # 3. Ahora crear la reserva
    reserva_data = {
        "fecha": "2025-12-25",
        "horario": "20:00:00",
        "cantidad_personas": 4,
        "id_mesa": 1,
        "id_cliente": 1
    }
    response = client.post("/reserva/", json=reserva_data)

    # 4. Verificar el resultado
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["fecha"] == reserva_data["fecha"]
    assert data["horario"] == reserva_data["horario"]
    assert data["cantidad_personas"] == reserva_data["cantidad_personas"]
    assert data["id_mesa"] == reserva_data["id_mesa"]
    assert data["id_cliente"] == reserva_data["id_cliente"]
    assert "id" in data

def test_crear_reserva_con_menu(client):
    """
    Test para verificar la creación exitosa de una reserva con menú.
    """
    # Crear productos primero (simulamos que existen)
    # Nota: En un entorno real, esto vendría de api-gestion-productos

    reserva_data = {
        "fecha": "2025-12-26",
        "horario": "19:30:00",
        "cantidad_personas": 2,
        "id_mesa": 1,
        "id_cliente": 1,
        "menu_reserva": {
            "monto_seña": 50.0,
            "detalles_menu": [
                {
                    "id_producto": 1,
                    "cantidad": 2,
                    "precio": 15.50
                },
                {
                    "id_producto": 2,
                    "cantidad": 1,
                    "precio": 25.00
                }
            ]
        }
    }
    response = client.post("/reserva/", json=reserva_data)

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["menu_reserva"] is not None
    assert len(data["menu_reserva"]["detalles_menu"]) == 2

def test_obtener_lista_de_reservas(client):
    """
    Test para verificar que se puede obtener una lista paginada de reservas.
    """
    # Crear reservas de prueba
    client.post("/reserva/", json={
        "fecha": "2025-12-25",
        "horario": "20:00:00",
        "cantidad_personas": 4,
        "id_mesa": 1,
        "id_cliente": 1
    })
    client.post("/reserva/", json={
        "fecha": "2025-12-26",
        "horario": "19:30:00",
        "cantidad_personas": 2,
        "id_mesa": 2,
        "id_cliente": 2
    })

    # Obtener la lista
    response = client.get("/reserva/")
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["cantidad_personas"] == 4

def test_filtrar_reservas_por_fecha(client):
    """
    Test para verificar el filtro de reservas por fecha.
    """
    # Crear reservas en diferentes fechas
    client.post("/reserva/", json={
        "fecha": "2025-12-25",
        "horario": "20:00:00",
        "cantidad_personas": 4,
        "id_mesa": 1,
        "id_cliente": 1
    })
    client.post("/reserva/", json={
        "fecha": "2025-12-26",
        "horario": "19:30:00",
        "cantidad_personas": 2,
        "id_mesa": 2,
        "id_cliente": 2
    })

    # Filtrar por fecha específica
    response = client.get("/reserva/?fecha=2025-12-25")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["fecha"] == "2025-12-25"

def test_modificar_reserva(client):
    """
    Test para verificar la modificación de una reserva existente.
    """
    # Datos iniciales
    response_creacion = client.post("/reserva/", json={
        "fecha": "2025-12-25",
        "horario": "20:00:00",
        "cantidad_personas": 4,
        "id_mesa": 1,
        "id_cliente": 1
    })
    reserva_id = response_creacion.json()["id"]

    # Modificar la cantidad de personas
    response_modificacion = client.put(f"/reserva/{reserva_id}", json={
        "cantidad_personas": 6
    })

    assert response_modificacion.status_code == 200
    data = response_modificacion.json()
    assert data["cantidad_personas"] == 6
    assert data["fecha"] == "2025-12-25"  # La fecha no debe cambiar

    # Verificar que el cambio persiste
    response_get = client.get(f"/reserva/{reserva_id}")
    assert response_get.json()["cantidad_personas"] == 6

def test_eliminar_reserva(client):
    """
    Test para verificar la eliminación lógica de una reserva.
    """
    # Crear reserva
    response_creacion = client.post("/reserva/", json={
        "fecha": "2025-12-25",
        "horario": "20:00:00",
        "cantidad_personas": 4,
        "id_mesa": 1,
        "id_cliente": 1
    })
    reserva_id = response_creacion.json()["id"]

    # Eliminar la reserva (baja lógica)
    response_delete = client.delete(f"/reserva/{reserva_id}")
    assert response_delete.status_code == 204

    # Verificar que está dada de baja
    response_get = client.get(f"/reserva/{reserva_id}")
    assert response_get.json()["baja"] == True

def test_reactivar_reserva(client):
    """
    Test para verificar la reactivación de una reserva.
    """
    # Crear y eliminar reserva
    response_creacion = client.post("/reserva/", json={
        "fecha": "2025-12-25",
        "horario": "20:00:00",
        "cantidad_personas": 4,
        "id_mesa": 1,
        "id_cliente": 1
    })
    reserva_id = response_creacion.json()["id"]

    client.delete(f"/reserva/{reserva_id}")

    # Reactivar la reserva
    response_reactivar = client.patch(f"/reserva/{reserva_id}/reactivar")
    assert response_reactivar.status_code == 200
    data = response_reactivar.json()
    assert data["baja"] == False

def test_agregar_menu_reserva(client):
    """
    Test para verificar la adición de menú a una reserva existente.
    """
    # Crear reserva sin menú
    response_creacion = client.post("/reserva/", json={
        "fecha": "2025-12-25",
        "horario": "20:00:00",
        "cantidad_personas": 4,
        "id_mesa": 1,
        "id_cliente": 1
    })
    reserva_id = response_creacion.json()["id"]

    # Agregar menú a la reserva
    menu_data = {
        "monto_seña": 75.0,
        "detalles_menu": [
            {
                "id_producto": 1,
                "cantidad": 3,
                "precio": 12.50
            }
        ]
    }
    response_menu = client.post(f"/reserva/{reserva_id}/menu-reservas", json=menu_data)
    assert response_menu.status_code == 200
    data = response_menu.json()
    assert data["monto_seña"] == 75.0
    assert len(data["detalles_menu"]) == 1

def test_obtener_menu_reserva(client):
    """
    Test para verificar la obtención del menú de una reserva.
    """
    # Crear reserva con menú
    reserva_data = {
        "fecha": "2025-12-25",
        "horario": "20:00:00",
        "cantidad_personas": 4,
        "id_mesa": 1,
        "id_cliente": 1,
        "menu_reserva": {
            "monto_seña": 50.0,
            "detalles_menu": [
                {
                    "id_producto": 1,
                    "cantidad": 2,
                    "precio": 15.50
                }
            ]
        }
    }
    response_creacion = client.post("/reserva/", json=reserva_data)
    reserva_id = response_creacion.json()["id"]

    # Obtener el menú
    response_menu = client.get(f"/reserva/{reserva_id}/menu-reservas")
    assert response_menu.status_code == 200
    data = response_menu.json()
    assert len(data) >= 1  # Debería tener al menos un menú

def test_actualizar_detalle_menu(client):
    """
    Test para verificar la actualización de un detalle del menú.
    """
    # Crear reserva con menú
    reserva_data = {
        "fecha": "2025-12-25",
        "horario": "20:00:00",
        "cantidad_personas": 4,
        "id_mesa": 1,
        "id_cliente": 1,
        "menu_reserva": {
            "monto_seña": 50.0,
            "detalles_menu": [
                {
                    "id_producto": 1,
                    "cantidad": 2,
                    "precio": 15.50
                }
            ]
        }
    }
    response_creacion = client.post("/reserva/", json=reserva_data)
    reserva_id = response_creacion.json()["id"]

    # Obtener IDs del menú y detalle
    response_menu = client.get(f"/reserva/{reserva_id}/menu-reservas")
    menu_id = response_menu.json()[0]["id"]
    detalle_id = response_menu.json()[0]["detalles_menu"][0]["id"]

    # Actualizar cantidad del detalle
    response_update = client.put(
        f"/reserva/{reserva_id}/menu-reservas/{menu_id}/detalles/{detalle_id}",
        params={"cantidad": 5}
    )
    assert response_update.status_code == 200
    data = response_update.json()
    assert data["cantidad"] == 5

def test_eliminar_detalle_menu(client):
    """
    Test para verificar la eliminación de un detalle del menú.
    """
    # Crear reserva con menú
    reserva_data = {
        "fecha": "2025-12-25",
        "horario": "20:00:00",
        "cantidad_personas": 4,
        "id_mesa": 1,
        "id_cliente": 1,
        "menu_reserva": {
            "monto_seña": 50.0,
            "detalles_menu": [
                {
                    "id_producto": 1,
                    "cantidad": 2,
                    "precio": 15.50
                }
            ]
        }
    }
    response_creacion = client.post("/reserva/", json=reserva_data)
    reserva_id = response_creacion.json()["id"]

    # Obtener IDs del menú y detalle
    response_menu = client.get(f"/reserva/{reserva_id}/menu-reservas")
    menu_id = response_menu.json()[0]["id"]
    detalle_id = response_menu.json()[0]["detalles_menu"][0]["id"]

    # Eliminar el detalle
    response_delete = client.delete(f"/reserva/{reserva_id}/menu-reservas/{menu_id}/detalles/{detalle_id}")
    assert response_delete.status_code == 204