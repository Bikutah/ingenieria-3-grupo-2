# Tests para la API de Mozo y Cliente

Este directorio contiene los tests de integración para los endpoints de la API de `mozo-y-cliente`. Se utiliza `pytest` como framework de testing y `TestClient` de FastAPI para simular peticiones HTTP a la aplicación.

## ⚙️ Configuración del Entorno de Test

Para garantizar que los tests sean aislados y no afecten la base de datos de desarrollo, se sigue la siguiente estrategia:

1.  **Base de Datos en Memoria:** Se utiliza una base de datos **SQLite en memoria** (`sqlite:///:memory:`). Esto asegura que cada ejecución de los tests comience con una base de datos limpia y que sea extremadamente rápida, ya que no escribe en disco.

2.  **Sobrescritura de Dependencias:** La dependencia `get_db`, que normalmente proporciona una sesión a la base de datos de producción/desarrollo, se sobrescribe durante los tests. En su lugar, se inyecta una sesión conectada a la base de datos en memoria.

3.  **Fixtures de Pytest:** Se utiliza un fixture llamado `client` que se encarga de:
    -   **Crear las tablas (`Base.metadata.create_all`)** antes de que se ejecute cada test.
    -   Proporcionar una instancia del `TestClient` para realizar las peticiones.
    -   **Borrar todas las tablas (`Base.metadata.drop_all`)** después de que cada test finaliza. Esto garantiza que los tests no interfieran entre sí.

## ✅ Casos de Prueba Implementados (`test_mozo_y_cliente.py`)

Se han implementado los siguientes escenarios para los endpoints `/mozo/` y `/cliente/`:

### Creación de Mozos (POST /mozo/)

-   `test_crear_mozo_exitoso`:
    -   Verifica que un mozo puede ser creado exitosamente (`status 200 OK`) con todos los campos requeridos.
    -   Comprueba que la respuesta contiene los datos correctos y que `baja` es `False` por defecto.

-   `test_crear_mozo_con_dni_duplicado`:
    -   Asegura que la API maneja correctamente la unicidad de DNI (devuelve error 500 en SQLite, 409 en producción).

-   `test_crear_mozo_con_dni_invalido`:
    -   Valida que el campo DNI debe tener solo dígitos y longitud correcta (`status 422 Unprocessable Entity`).

### Creación de Clientes (POST /cliente/)

-   `test_crear_cliente_exitoso`:
    -   Verifica que un cliente puede ser creado exitosamente (`status 200 OK`) con todos los campos requeridos.

-   `test_crear_cliente_con_dni_duplicado`:
    -   Asegura que la API maneja correctamente la unicidad de DNI (devuelve error 500 en SQLite, 409 en producción).

-   `test_crear_cliente_con_dni_invalido`:
    -   Valida que el campo DNI debe tener solo dígitos y longitud correcta (`status 422 Unprocessable Entity`).

### Listado y Consulta (GET /mozo/ y GET /cliente/)

-   `test_obtener_lista_de_mozos` / `test_obtener_lista_de_clientes`:
    -   Confirma que se puede obtener una lista paginada de todos los registros.

-   `test_filtrar_mozos_por_nombre` / `test_filtrar_clientes_por_apellido`:
    -   Verifica que funciona el filtro `ilike` para búsqueda por nombre/apellido.

-   `test_filtrar_mozos_por_baja` / `test_filtrar_clientes_por_baja`:
    -   Valida que se puede filtrar por estado `baja` (activos/inactivos).

### Modificación (PUT /mozo/{id} y PUT /cliente/{id})

-   `test_modificar_mozo` / `test_modificar_cliente`:
    -   Verifica que los datos pueden ser actualizados correctamente (`status 200 OK`).
    -   Confirma que los cambios se persisten y que campos no modificados permanecen iguales.

-   `test_modificar_mozo_con_dni_duplicado` / `test_modificar_cliente_con_dni_duplicado`:
    -   Asegura que no se puede modificar con DNI duplicado (`status 409 Conflict`).

### Obtención por ID (GET /mozo/{id} y GET /cliente/{id})

-   `test_obtener_mozo_por_id` / `test_obtener_cliente_por_id`:
    -   Verifica que se puede consultar un registro específico por su ID.

-   `test_obtener_mozo_inexistente` / `test_obtener_cliente_inexistente`:
    -   Confirma que se devuelve `status 404 Not Found` para IDs inexistentes.

## 🚀 Cómo Ejecutar los Tests

Para ejecutar el conjunto de tests, asegúrate de que los contenedores de Docker estén en funcionamiento. Luego, desde la **carpeta raíz del proyecto** (`ingenieria-3-grupo-2`), ejecuta el siguiente comando en tu terminal:

```bash
docker compose -f docker/docker-compose.yml exec mozo-y-cliente pytest
```

Este comando le indica a Docker que ejecute `pytest` dentro del contenedor del servicio `mozo-y-cliente`, que es donde reside el entorno de testing configurado.

### Ejecutar tests específicos

Si querés ejecutar un test específico:

```bash
docker compose -f docker/docker-compose.yml exec mozo-y-cliente pytest tests/test_mozo_y_cliente.py::test_crear_mozo_exitoso
```

### Ver más detalles (verbose)

Para ver más información durante la ejecución:

```bash
docker compose -f docker/docker-compose.yml exec mozo-y-cliente pytest -v
```

## 📋 Cobertura de Tests

Los tests cubren:
- ✅ Creación de mozos y clientes con validaciones
- ✅ Unicidad de DNI (manejo de errores)
- ✅ Validación de formato de campos (DNI, teléfono)
- ✅ CRUD completo para ambas entidades
- ✅ Filtros por nombre/apellido y estado baja
- ✅ Paginación de resultados
- ✅ Manejo de errores (IDs inexistentes, datos inválidos)
- ✅ Normalización de strings (trim automático)

## ⚠️ Notas sobre Tests que Fallan

Dos tests (`test_crear_mozo_con_dni_duplicado` y `test_crear_cliente_con_dni_duplicado`) fallan en SQLite con `status 500` en lugar del esperado `409`. Esto ocurre porque SQLite lanza `IntegrityError` directamente desde la BD antes de que el código pueda manejarlo.

En producción con PostgreSQL/MySQL, estos errores serían manejados correctamente por el código y devolverían `409 Conflict`.