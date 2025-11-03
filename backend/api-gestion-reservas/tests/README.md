# Tests para la API de Gestión de Reservas

Este directorio contiene los tests de integración para los endpoints de la API de `gestion-reservas`. Se utiliza `pytest` como framework de testing y `TestClient` de FastAPI para simular peticiones HTTP a la aplicación.

## ⚙️ Configuración del Entorno de Test

Para garantizar que los tests sean aislados y no afecten la base de datos de desarrollo, se sigue la siguiente estrategia:

1.  **Base de Datos en Memoria:** Se utiliza una base de datos **SQLite en memoria** (`sqlite:///:memory:`). Esto asegura que cada ejecución de los tests comience con una base de datos limpia y que sea extremadamente rápida, ya que no escribe en disco.

2.  **Sobrescritura de Dependencias:** La dependencia `get_db`, que normalmente proporciona una sesión a la base de datos de producción/desarrollo, se sobrescribe durante los tests. En su lugar, se inyecta una sesión conectada a la base de datos en memoria.

3.  **Fixtures de Pytest:** Se utiliza un fixture llamado `client` que se encarga de:
    -   **Crear las tablas (`Base.metadata.create_all`)** antes de que se ejecute cada test.
    -   Proporcionar una instancia del `TestClient` para realizar las peticiones.
    -   **Borrar todas las tablas (`Base.metadata.drop_all`)** después de que cada test finaliza. Esto garantiza que los tests no interfieran entre sí.

## ✅ Casos de Prueba Implementados (`test_reservas.py`)

Se han implementado los siguientes escenarios para los endpoints `/reservas/`:

### Creación de Reservas (POST /reservas/)

-   `test_crear_reserva_exitoso`:
    -   Verifica que una reserva puede ser creada exitosamente (`status 201 Created`) cuando se proporcionan datos válidos.
    -   Comprueba que la respuesta contiene los mismos datos que se enviaron.

-   `test_crear_reserva_con_menu`:
    -   Verifica que una reserva puede ser creada con un menú de reserva incluido, incluyendo detalles del menú con productos y cantidades.

### Listado y Filtrado de Reservas (GET /reservas/)

-   `test_obtener_lista_de_reservas`:
    -   Confirma que se puede obtener una lista paginada de todas las reservas.

-   `test_filtrar_reservas_por_fecha`:
    -   Prueba que el filtro `?fecha=` funciona correctamente, devolviendo solo las reservas de la fecha especificada.

### Modificación de Reservas (PUT /reservas/{id})

-   `test_modificar_reserva`:
    -   Verifica que los datos de una reserva existente pueden ser actualizados correctamente (`status 200 OK`).
    -   Comprueba que los cambios se guardan y se reflejan en consultas posteriores.

### Eliminación y Reactivación de Reservas

-   `test_eliminar_reserva`:
    -   Verifica que una reserva puede ser eliminada lógicamente (marcada como baja) usando DELETE (`status 204 No Content`).

-   `test_reactivar_reserva`:
    -   Verifica que una reserva eliminada lógicamente puede ser reactivada usando PATCH (`status 200 OK`).

### Gestión de Menús de Reserva

-   `test_agregar_menu_reserva`:
    -   Verifica que se puede agregar un menú de reserva a una reserva existente, incluyendo detalles del menú.

-   `test_obtener_menu_reserva`:
    -   Confirma que se puede obtener el menú de reserva de una reserva específica.

-   `test_actualizar_detalle_menu`:
    -   Verifica que se puede actualizar la cantidad de un detalle específico del menú de reserva.

-   `test_eliminar_detalle_menu`:
    -   Verifica que se puede eliminar un detalle específico del menú de reserva.

## 🚀 Cómo Ejecutar los Tests

Para ejecutar el conjunto de tests, asegúrate de que los contenedores de Docker estén en funcionamiento. Luego, desde la **carpeta raíz del proyecto** (`ingenieria-3-grupo-2`), ejecuta el siguiente comando en tu terminal:

```bash
docker-compose -f docker/docker-compose.yml exec gestion-reservas pytest
```

Este comando le indica a Docker que ejecute `pytest` dentro del contenedor del servicio `gestion-reservas`, que es donde reside el entorno de testing configurado.

## 📝 Notas Importantes

- Los tests asumen que existen mesas (ID 1, 2) y clientes (ID 1, 2) en el sistema. En un entorno de integración completo, estos recursos vendrían de las APIs `gestion-mesas` y `mozo-y-cliente` respectivamente.
- Los tests también asumen que existen productos (ID 1, 2) para los menús de reserva. En un entorno real, estos vendrían de la API `gestion-productos`.
- Las validaciones de negocio (como disponibilidad de mesa, capacidad, etc.) están implementadas en el validador `ReservaValidator` y son probadas implícitamente en estos tests.