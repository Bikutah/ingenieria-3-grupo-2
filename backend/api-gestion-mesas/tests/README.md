# Tests para la API de Gestión de Mesas

Este directorio contiene los tests de integración para los endpoints de la API de `gestion-mesas`. Se utiliza `pytest` como framework de testing y `TestClient` de FastAPI para simular peticiones HTTP a la aplicación.

## ⚙️ Configuración del Entorno de Test

Para garantizar que los tests sean aislados y no afecten la base de datos de desarrollo, se sigue la siguiente estrategia:

1.  **Base de Datos en Memoria:** Se utiliza una base de datos **SQLite en memoria** (`sqlite:///:memory:`). Esto asegura que cada ejecución de los tests comience con una base de datos limpia y que sea extremadamente rápida, ya que no escribe en disco.

2.  **Sobrescritura de Dependencias:** La dependencia `get_db`, que normalmente proporciona una sesión a la base de datos de producción/desarrollo, se sobrescribe durante los tests. En su lugar, se inyecta una sesión conectada a la base de datos en memoria.

3.  **Fixtures de Pytest:** Se utiliza un fixture llamado `client` que se encarga de:
    -   **Crear las tablas (`Base.metadata.create_all`)** antes de que se ejecute cada test.
    -   Proporcionar una instancia del `TestClient` para realizar las peticiones.
    -   **Borrar todas las tablas (`Base.metadata.drop_all`)** después de que cada test finaliza. Esto garantiza que los tests no interfieran entre sí.

## ✅ Casos de Prueba Implementados

Se han implementado los siguientes escenarios para los endpoints `/mesas/` y `/sectores/`:

### Tests para Sectores y Mesas (`test_mesas.py`)

#### Creación de Sectores (POST /sectores/)

-   `test_crear_sector_exitoso`:
    -   Verifica que un sector puede ser creado exitosamente (`status 200 OK`) cuando se proporcionan datos válidos.
    -   Comprueba que la respuesta contiene los mismos datos que se enviaron.

-   `test_crear_sector_con_numero_duplicado`:
    -   Valida que la API devuelve un error `409 Conflict` si se intenta crear un sector con un número que ya está en uso.

#### Listado y Filtrado de Sectores (GET /sectores/)

-   `test_obtener_lista_de_sectores`:
    -   Confirma que se puede obtener una lista paginada de todos los sectores.

-   `test_filtrar_sectores_por_nombre`:
    -   Prueba que el filtro `?nombre__ilike=` funciona correctamente, devolviendo sectores que contienen el texto especificado en el nombre.

#### Modificación de Sectores (PUT /sectores/{id})

-   `test_modificar_sector`:
    -   Verifica que los datos de un sector existente pueden ser actualizados correctamente (`status 200 OK`).
    -   Comprueba que los cambios se guardan y se reflejan en consultas posteriores.

-   `test_modificar_sector_con_numero_duplicado`:
    -   Asegura que la API devuelve un error `409 Conflict` si se intenta modificar un sector con un número que ya está en uso por otro sector.

#### Creación de Mesas (POST /mesas/)

-   `test_crear_mesa_exitoso`:
    -   Verifica que una mesa puede ser creada exitosamente (`status 200 OK`) cuando se proporcionan datos válidos y un `id_sector` existente.
    -   Comprueba que la respuesta contiene los mismos datos que se enviaron.

-   `test_crear_mesa_con_sector_inexistente`:
    -   Asegura que la API devuelve un error `404 Not Found` si se intenta crear una mesa asociada a un `id_sector` que no existe.

-   `test_crear_mesa_con_numero_duplicado_en_sector`:
    -   Valida que la API devuelve un error `409 Conflict` si se intenta crear una mesa con un número que ya está en uso en el mismo sector.

#### Listado y Filtrado de Mesas (GET /mesas/)

-   `test_obtener_lista_de_mesas`:
    -   Confirma que se puede obtener una lista paginada de todas las mesas.

-   `test_filtrar_mesas_por_sector`:
    -   Prueba que el filtro `?id_sector=` funciona correctamente, devolviendo solo las mesas que pertenecen al sector especificado.

#### Modificación de Mesas (PUT /mesas/{id})

-   `test_modificar_mesa`:
    -   Verifica que los datos de una mesa existente pueden ser actualizados correctamente (`status 200 OK`).
    -   Comprueba que los cambios se guardan y se reflejan en consultas posteriores.

### Tests para Sectores (`test_sectores.py`)

#### Creación de Sectores (POST /sectores/)

-   `test_crear_sector_exitoso`:
    -   Verifica que un sector puede ser creado exitosamente (`status 201 Created`) cuando se proporcionan datos válidos.
    -   Comprueba que la respuesta contiene los mismos datos que se enviaron.

-   `test_crear_sector_con_numero_duplicado`:
    -   Valida que la API devuelve un error `409 Conflict` si se intenta crear un sector con un número que ya está en uso.

#### Listado y Filtrado de Sectores (GET /sectores/)

-   `test_obtener_lista_de_sectores`:
    -   Confirma que se puede obtener una lista paginada de todos los sectores.

-   `test_filtrar_sectores_por_nombre`:
    -   Prueba que el filtro `?nombre__icontains=` funciona correctamente, devolviendo sectores que contienen el texto especificado en el nombre.

#### Modificación de Sectores (PUT /sectores/{id})

-   `test_modificar_sector`:
    -   Verifica que los datos de un sector existente pueden ser actualizados correctamente (`status 200 OK`).
    -   Comprueba que los cambios se guardan y se reflejan en consultas posteriores.

-   `test_modificar_sector_con_numero_duplicado`:
    -   Asegura que la API devuelve un error `409 Conflict` si se intenta modificar un sector con un número que ya está en uso por otro sector.

## 🚀 Cómo Ejecutar los Tests

Para ejecutar el conjunto de tests, asegúrate de que los contenedores de Docker estén en funcionamiento. Luego, desde la **carpeta raíz del proyecto** (`ingenieria-3-grupo-2`), ejecuta el siguiente comando en tu terminal:

```bash
docker-compose -f docker/docker-compose.yml exec gestion-mesas pytest
```

Este comando le indica a Docker que ejecute `pytest` dentro del contenedor del servicio `gestion-mesas`, que es donde reside el entorno de testing configurado.