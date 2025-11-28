# Tests para la API de Gestión de Comanda

Este directorio contiene los tests de integración para los endpoints de la API de `gestion-comanda`. Se utiliza `pytest` como framework de testing y `TestClient` de FastAPI para simular peticiones HTTP a la aplicación.

## ⚙️ Configuración del Entorno de Test

Para garantizar que los tests sean aislados y no afecten la base de datos de desarrollo, se sigue la siguiente estrategia:

1.  **Base de Datos en Memoria:** Se utiliza una base de datos **SQLite en memoria** (`sqlite:///:memory:`). Esto asegura que cada ejecución de los tests comience con una base de datos limpia y que sea extremadamente rápida, ya que no escribe en disco.

2.  **Sobrescritura de Dependencias:** La dependencia `get_db`, que normalmente proporciona una sesión a la base de datos de producción/desarrollo, se sobrescribe durante los tests. En su lugar, se inyecta una sesión conectada a la base de datos en memoria.

3.  **Fixtures de Pytest:** Se utiliza un fixture llamado `client` que se encarga de:
    -   **Crear las tablas (`Base.metadata.create_all`)** antes de que se ejecute cada test.
    -   Proporcionar una instancia del `TestClient` para realizar las peticiones.
    -   **Borrar todas las tablas (`Base.metadata.drop_all`)** después de que cada test finaliza. Esto garantiza que los tests no interfieran entre sí.

## ✅ Casos de Prueba Implementados (`test_comanda.py`)

Se han implementado los siguientes escenarios para el endpoint `/comanda/`:

### Creación de Comandas (POST /comanda/)

-   `test_crear_comanda_exitoso`:
    -   Verifica que una comanda puede ser creada exitosamente (`status 201 Created`) con múltiples detalles.
    -   Comprueba que la respuesta contiene los datos correctos y que los detalles están asociados.

-   `test_crear_comanda_sin_detalles`:
    -   Asegura que la API devuelve un error `422 Unprocessable Entity` si se intenta crear una comanda sin detalles (lista vacía).
    -   Valida la restricción `min_items=1` en los schemas.

-   `test_crear_comanda_con_precio_decimal`:
    -   Valida que el campo `precio_unitario` acepta valores decimales (Float) correctamente.

### Listado y Consulta de Comandas (GET /comanda/)

-   `test_obtener_lista_de_comandas`:
    -   Confirma que se puede obtener una lista paginada de todas las comandas.

-   `test_obtener_comanda_por_id`:
    -   Verifica que se puede consultar una comanda específica por su ID.

### Gestión de Detalles (GET/POST/PUT /comanda/{id}/detalles)

-   `test_obtener_detalles_de_comanda`:
    -   Prueba que se pueden obtener todos los detalles de una comanda específica.

-   `test_agregar_detalle_a_comanda`:
    -   Verifica que se puede agregar un nuevo detalle a una comanda existente (`status 201 Created`).
    -   Comprueba que el total de detalles aumenta correctamente.

-   `test_modificar_detalle_de_comanda`:
    -   Valida que se puede modificar un detalle existente (cantidad y precio).
    -   Confirma que los cambios se persisten correctamente.

### Modificación de Comandas (PUT /comanda/{id})

-   `test_modificar_comanda`:
    -   Verifica que los datos de una comanda existente (mesa, mozo) pueden ser actualizados correctamente (`status 200 OK`).

### Eliminación de Comandas (DELETE /comanda/{id})

-   `test_eliminar_comanda_soft_delete`:
    -   Asegura que el DELETE marca `baja=True` (soft delete) sin eliminar físicamente el registro.
    -   Verifica que la comanda sigue siendo consultable después del soft delete.

## 🚀 Cómo Ejecutar los Tests

Para ejecutar el conjunto de tests, asegúrate de que los contenedores de Docker estén en funcionamiento. Luego, desde la **carpeta raíz del proyecto** (`ingenieria-3-grupo-2`), ejecuta el siguiente comando en tu terminal:

```bash
docker compose -f docker/docker-compose.yml exec gestion-comanda pytest
```

Este comando le indica a Docker que ejecute `pytest` dentro del contenedor del servicio `gestion-comanda`, que es donde reside el entorno de testing configurado.

### Ejecutar tests específicos

Si querés ejecutar un test específico:

```bash
docker compose -f docker/docker-compose.yml exec gestion-comanda pytest tests/test_comanda.py::test_crear_comanda_exitoso
```

### Ver más detalles (verbose)

Para ver más información durante la ejecución:

```bash
docker compose -f docker/docker-compose.yml exec gestion-comanda pytest -v
```

## 📋 Cobertura de Tests

Los tests cubren:
- ✅ Creación de comandas con múltiples detalles
- ✅ Validación de restricciones (min_items=1)
- ✅ Manejo de precios decimales (Float)
- ✅ CRUD completo de comandas
- ✅ CRUD completo de detalles de comanda
- ✅ Soft delete (baja=True)
- ✅ Paginación de resultados
- ✅ Relaciones entre comanda y detalles
