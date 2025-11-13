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

# --- Tests para el endpoint de Mozos ---

def test_crear_mozo_exitoso(client):
    """
    Test para verificar la creación exitosa de un mozo.
    """
    mozo_data = {
        "nombre": "Juan",
        "apellido": "Pérez",
        "dni": "12345678",
        "direccion": "Calle Falsa 123",
        "telefono": "123456789"
    }
    response = client.post("/mozo/", json=mozo_data)

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["nombre"] == mozo_data["nombre"]
    assert data["apellido"] == mozo_data["apellido"]
    assert data["dni"] == mozo_data["dni"]
    assert data["direccion"] == mozo_data["direccion"]
    assert data["telefono"] == mozo_data["telefono"]
    assert data["baja"] == False
    assert "id" in data

def test_crear_mozo_con_dni_duplicado(client):
    """
    Test para verificar que no se puede crear un mozo con DNI duplicado.
    """
    # Crear mozo inicial
    client.post("/mozo/", json={
        "nombre": "Juan",
        "apellido": "Pérez",
        "dni": "12345678",
        "direccion": "Calle Falsa 123",
        "telefono": "123456789"
    })

    # Intentar crear otro mozo con el mismo DNI
    response = client.post("/mozo/", json={
        "nombre": "María",
        "apellido": "García",
        "dni": "12345678",  # DNI duplicado
        "direccion": "Otra Calle 456",
        "telefono": "987654321"
    })

    # Ahora con validación previa, debe devolver 409 Conflict
    assert response.status_code == 409
    assert "DNI ya registrado" in response.json()["detail"]

def test_crear_mozo_con_dni_invalido(client):
    """
    Test para verificar validación de DNI inválido.
    """
    mozo_data = {
        "nombre": "Juan",
        "apellido": "Pérez",
        "dni": "1234567890",  # DNI con letras (inválido)
        "direccion": "Calle Falsa 123",
        "telefono": "123456789"
    }
    response = client.post("/mozo/", json=mozo_data)

    assert response.status_code == 422  # Error de validación

def test_obtener_lista_de_mozos(client):
    """
    Test para verificar que se puede obtener una lista paginada de mozos.
    """
    # Crear datos de prueba
    client.post("/mozo/", json={
        "nombre": "Juan",
        "apellido": "Pérez",
        "dni": "12345678",
        "direccion": "Calle 1",
        "telefono": "111111111"
    })
    client.post("/mozo/", json={
        "nombre": "María",
        "apellido": "García",
        "dni": "87654321",
        "direccion": "Calle 2",
        "telefono": "222222222"
    })

    # Obtener la lista
    response = client.get("/mozo/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2

def test_filtrar_mozos_por_nombre(client):
    """
    Test para verificar el filtro de mozos por nombre.
    """
    # Crear mozos
    client.post("/mozo/", json={
        "nombre": "Juan",
        "apellido": "Pérez",
        "dni": "12345678",
        "direccion": "Calle 1",
        "telefono": "111111111"
    })
    client.post("/mozo/", json={
        "nombre": "María",
        "apellido": "García",
        "dni": "87654321",
        "direccion": "Calle 2",
        "telefono": "222222222"
    })

    # Filtrar por nombre que contiene "Juan"
    response = client.get("/mozo/?nombre__ilike=Juan")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre"] == "Juan"

def test_filtrar_mozos_por_baja(client):
    """
    Test para verificar el filtro de mozos por estado baja.
    """
    # Crear mozos
    response1 = client.post("/mozo/", json={
        "nombre": "Juan",
        "apellido": "Pérez",
        "dni": "12345678",
        "direccion": "Calle 1",
        "telefono": "111111111"
    })
    mozo_id = response1.json()["id"]

    # Marcar como baja
    client.put(f"/mozo/{mozo_id}", json={"baja": True})

    # Crear otro mozo activo
    client.post("/mozo/", json={
        "nombre": "María",
        "apellido": "García",
        "dni": "87654321",
        "direccion": "Calle 2",
        "telefono": "222222222"
    })

    # Filtrar por baja=false
    response = client.get("/mozo/?baja=false")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre"] == "María"

def test_modificar_mozo(client):
    """
    Test para verificar la modificación de un mozo existente.
    """
    # Datos iniciales
    response_creacion = client.post("/mozo/", json={
        "nombre": "Juan",
        "apellido": "Pérez",
        "dni": "12345678",
        "direccion": "Calle Original",
        "telefono": "111111111"
    })
    mozo_id = response_creacion.json()["id"]

    # Modificar algunos campos
    response_modificacion = client.put(f"/mozo/{mozo_id}", json={
        "direccion": "Calle Modificada",
        "telefono": "999999999"
    })

    assert response_modificacion.status_code == 200
    data = response_modificacion.json()
    assert data["direccion"] == "Calle Modificada"
    assert data["telefono"] == "999999999"
    assert data["nombre"] == "Juan"  # No cambió

    # Verificar que el cambio persiste
    response_get = client.get(f"/mozo/{mozo_id}")
    assert response_get.json()["direccion"] == "Calle Modificada"

def test_modificar_mozo_con_dni_duplicado(client):
    """
    Test para verificar que no se puede modificar un mozo con DNI duplicado.
    """
    # Crear dos mozos
    client.post("/mozo/", json={
        "nombre": "Juan",
        "apellido": "Pérez",
        "dni": "12345678",
        "direccion": "Calle 1",
        "telefono": "111111111"
    })
    response_b = client.post("/mozo/", json={
        "nombre": "María",
        "apellido": "García",
        "dni": "87654321",
        "direccion": "Calle 2",
        "telefono": "222222222"
    })
    mozo_b_id = response_b.json()["id"]

    # Intentar modificar el mozo B con el DNI de A
    response = client.put(f"/mozo/{mozo_b_id}", json={"dni": "12345678"})

    assert response.status_code == 409
    assert "DNI ya registrado" in response.json()["detail"]

def test_obtener_mozo_por_id(client):
    """
    Test para verificar la obtención de un mozo específico.
    """
    # Crear mozo
    response_creacion = client.post("/mozo/", json={
        "nombre": "Juan",
        "apellido": "Pérez",
        "dni": "12345678",
        "direccion": "Calle 1",
        "telefono": "111111111"
    })
    mozo_id = response_creacion.json()["id"]

    # Obtener mozo
    response = client.get(f"/mozo/{mozo_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == mozo_id
    assert data["nombre"] == "Juan"

def test_obtener_mozo_inexistente(client):
    """
    Test para verificar el manejo de IDs inexistentes.
    """
    response = client.get("/mozo/999")
    assert response.status_code == 404

# --- Tests para el endpoint de Clientes ---

def test_crear_cliente_exitoso(client):
    """
    Test para verificar la creación exitosa de un cliente.
    """
    cliente_data = {
        "nombre": "Carlos",
        "apellido": "Rodríguez",
        "dni": "11223344",
        "telefono": "333333333"
    }
    response = client.post("/cliente/", json=cliente_data)

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["nombre"] == cliente_data["nombre"]
    assert data["apellido"] == cliente_data["apellido"]
    assert data["dni"] == cliente_data["dni"]
    assert data["telefono"] == cliente_data["telefono"]
    assert "id" in data

def test_crear_cliente_con_dni_duplicado(client):
    """
    Test para verificar que no se puede crear un cliente con DNI duplicado.
    """
    # Crear cliente inicial
    client.post("/cliente/", json={
        "nombre": "Carlos",
        "apellido": "Rodríguez",
        "dni": "11223344",
        "telefono": "333333333"
    })

    # Intentar crear otro cliente con el mismo DNI
    response = client.post("/cliente/", json={
        "nombre": "Ana",
        "apellido": "Martínez",
        "dni": "11223344",  # DNI duplicado
        "telefono": "444444444"
    })

    # Ahora con validación previa, debe devolver 409 Conflict
    assert response.status_code == 409
    assert "DNI ya registrado" in response.json()["detail"]

def test_crear_cliente_con_dni_invalido(client):
    """
    Test para verificar validación de DNI inválido.
    """
    cliente_data = {
        "nombre": "Carlos",
        "apellido": "Rodríguez",
        "dni": "1122334455",  # DNI demasiado largo
        "telefono": "333333333"
    }
    response = client.post("/cliente/", json=cliente_data)

    assert response.status_code == 422  # Error de validación

def test_obtener_lista_de_clientes(client):
    """
    Test para verificar que se puede obtener una lista paginada de clientes.
    """
    # Crear datos de prueba
    client.post("/cliente/", json={
        "nombre": "Carlos",
        "apellido": "Rodríguez",
        "dni": "11223344",
        "telefono": "333333333"
    })
    client.post("/cliente/", json={
        "nombre": "Ana",
        "apellido": "Martínez",
        "dni": "44332211",
        "telefono": "444444444"
    })

    # Obtener la lista
    response = client.get("/cliente/")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2

def test_filtrar_clientes_por_apellido(client):
    """
    Test para verificar el filtro de clientes por apellido.
    """
    # Crear clientes
    client.post("/cliente/", json={
        "nombre": "Carlos",
        "apellido": "Rodríguez",
        "dni": "11223344",
        "telefono": "333333333"
    })
    client.post("/cliente/", json={
        "nombre": "Ana",
        "apellido": "Martínez",
        "dni": "44332211",
        "telefono": "444444444"
    })

    # Filtrar por apellido que contiene "Rodríguez"
    response = client.get("/cliente/?apellido__ilike=Rodríguez")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["apellido"] == "Rodríguez"

def test_filtrar_clientes_por_baja(client):
    """
    Test para verificar el filtro de clientes por estado baja.
    """
    # Crear clientes
    response1 = client.post("/cliente/", json={
        "nombre": "Carlos",
        "apellido": "Rodríguez",
        "dni": "11223344",
        "telefono": "333333333"
    })
    cliente_id = response1.json()["id"]

    # Marcar como baja
    client.put(f"/cliente/{cliente_id}", json={"baja": True})

    # Crear otro cliente activo
    client.post("/cliente/", json={
        "nombre": "Ana",
        "apellido": "Martínez",
        "dni": "44332211",
        "telefono": "444444444"
    })

    # Filtrar por baja=false
    response = client.get("/cliente/?baja=false")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre"] == "Ana"

def test_modificar_cliente(client):
    """
    Test para verificar la modificación de un cliente existente.
    """
    # Datos iniciales
    response_creacion = client.post("/cliente/", json={
        "nombre": "Carlos",
        "apellido": "Rodríguez",
        "dni": "11223344",
        "telefono": "333333333"
    })
    cliente_id = response_creacion.json()["id"]

    # Modificar algunos campos
    response_modificacion = client.put(f"/cliente/{cliente_id}", json={
        "telefono": "555555555"
    })

    assert response_modificacion.status_code == 200
    data = response_modificacion.json()
    assert data["telefono"] == "555555555"
    assert data["nombre"] == "Carlos"  # No cambió

    # Verificar que el cambio persiste
    response_get = client.get(f"/cliente/{cliente_id}")
    assert response_get.json()["telefono"] == "555555555"

def test_modificar_cliente_con_dni_duplicado(client):
    """
    Test para verificar que no se puede modificar un cliente con DNI duplicado.
    """
    # Crear dos clientes
    client.post("/cliente/", json={
        "nombre": "Carlos",
        "apellido": "Rodríguez",
        "dni": "11223344",
        "telefono": "333333333"
    })
    response_b = client.post("/cliente/", json={
        "nombre": "Ana",
        "apellido": "Martínez",
        "dni": "44332211",
        "telefono": "444444444"
    })
    cliente_b_id = response_b.json()["id"]

    # Intentar modificar el cliente B con el DNI de A
    response = client.put(f"/cliente/{cliente_b_id}", json={"dni": "11223344"})

    assert response.status_code == 409
    assert "DNI ya registrado" in response.json()["detail"]

def test_obtener_cliente_por_id(client):
    """
    Test para verificar la obtención de un cliente específico.
    """
    # Crear cliente
    response_creacion = client.post("/cliente/", json={
        "nombre": "Carlos",
        "apellido": "Rodríguez",
        "dni": "11223344",
        "telefono": "333333333"
    })
    cliente_id = response_creacion.json()["id"]

    # Obtener cliente
    response = client.get(f"/cliente/{cliente_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == cliente_id
    assert data["nombre"] == "Carlos"

def test_obtener_cliente_inexistente(client):
    """
    Test para verificar el manejo de IDs inexistentes.
    """
    response = client.get("/cliente/999")
    assert response.status_code == 404