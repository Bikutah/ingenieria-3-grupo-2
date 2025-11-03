# Tests para la API de Gestión de Productos

Este directorio contiene los tests de integración para los endpoints de la API de `gestion-productos`. Se utiliza `pytest` como framework de testing y `TestClient` de FastAPI para simular peticiones HTTP a la aplicación.

## ⚙️ Configuración del Entorno de Test

Para garantizar que los tests sean aislados y no afecten la base de datos de desarrollo, se sigue la siguiente estrategia:

1.  **Base de Datos en Memoria:** Se utiliza una base de datos **SQLite en memoria** (`sqlite:///:memory:`). Esto asegura que cada ejecución de los tests comience con una base de datos limpia y que sea extremadamente rápida, ya que no escribe en disco.

2.  **Sobrescritura de Dependencias:** La dependencia `get_db`, que normalmente proporciona una sesión a la base de datos de producción/desarrollo, se sobrescribe durante los tests. En su lugar, se inyecta una sesión conectada a la base de datos en memoria.

3.  **Fixtures de Pytest:** Se utiliza un fixture llamado `client` que se encarga de:
    -   **Crear las tablas (`Base.metadata.create_all`)** antes de que se ejecute cada test.
    -   Proporcionar una instancia del `TestClient` para realizar las peticiones.
    -   **Borrar todas las tablas (`Base.metadata.drop_all`)** después de que cada test finaliza. Esto garantiza que los tests no interfieran entre sí.

## ✅ Casos de Prueba Implementados (`test_productos.py`)

Se han implementado los siguientes escenarios para el endpoint `/productos/`:

### Creación de Productos (POST /productos/)

-   `test_crear_producto_exitoso`:
    -   Verifica que un producto puede ser creado exitosamente (`status 201 Created`) cuando se proporcionan datos válidos y un `id_carta` existente.
    -   Comprueba que la respuesta contiene los mismos datos que se enviaron.

-   `test_crear_producto_con_carta_inexistente`:
    -   Asegura que la API devuelve un error `404 Not Found` si se intenta crear un producto asociado a un `id_carta` que no existe.

-   `test_crear_producto_con_nombre_duplicado`:
    -   Valida que la API devuelve un error `409 Conflict` si se intenta crear un producto con un nombre que ya está en uso.

### Listado y Filtrado de Productos (GET /productos/)

-   `test_obtener_lista_de_productos`:
    -   Confirma que se puede obtener una lista paginada de todos los productos.

-   `test_filtrar_productos_por_carta`:
    -   Prueba que el filtro `?id_carta=` funciona correctamente, devolviendo solo los productos que pertenecen a la carta especificada.

### Modificación de Productos (PUT /productos/{id})

-   `test_modificar_producto`:
    -   Verifica que los datos de un producto existente pueden ser actualizados correctamente (`status 200 OK`).
    -   Comprueba que los cambios se guardan y se reflejan en consultas posteriores.

## 🚀 Cómo Ejecutar los Tests

Para ejecutar el conjunto de tests, asegúrate de que los contenedores de Docker estén en funcionamiento. Luego, desde la **carpeta raíz del proyecto** (`ingenieria-3-grupo-2`), ejecuta el siguiente comando en tu terminal:

```bash
docker compose -f docker/docker-compose.yml exec gestion-productos pytest
```

Este comando le indica a Docker que ejecute `pytest` dentro del contenedor del servicio `gestion-productos`, que es donde reside el entorno de testing configurado.
