# Tests para la API de Reportes

Este directorio contiene los tests de integración para los endpoints de la API de `reporte`. Se utiliza `pytest` como framework de testing y `TestClient` de FastAPI para simular peticiones HTTP a la aplicación.

## ⚙️ Configuración del Entorno de Test

Para garantizar que los tests sean aislados y no dependan de servicios externos, se sigue la siguiente estrategia:

1.  **Mocking de Llamadas HTTP:** Se utiliza `unittest.mock` para simular las respuestas de las APIs externas (facturación, comandas, productos, mozos). Esto asegura que los tests sean rápidos, predecibles y no requieran que los otros servicios estén ejecutándose.

2.  **TestClient de FastAPI:** Se utiliza `TestClient` para realizar peticiones HTTP simuladas a la aplicación de reportes.

3.  **Fixtures de Pytest:** Se utiliza un fixture llamado `client` que proporciona una instancia del `TestClient` para realizar las peticiones.

## Casos de Prueba Implementados (`test_reporte.py`)

Se han implementado los siguientes escenarios para los endpoints de reportes:

### Reporte de Ganancias Mensuales (GET /reporte/ganancias-mensuales/)

-   `test_reporte_ganancias_mensuales`:
    -   Verifica que se calcula correctamente la suma de montos de facturas pagadas por mes en un año determinado.
    -   Comprueba que solo cuenta facturas con estado "pagada" y filtra por año.
    -   Valida la estructura de respuesta con ganancias por mes.

### Reporte de Top Productos Vendidos (GET /reporte/top-productos-vendidos/)

-   `test_reporte_top_productos_vendidos`:
    -   Confirma que se obtiene el ranking de los 5 productos más vendidos.
    -   Verifica que solo cuenta comandas con estado "pagada" o "facturada".
    -   Valida que se obtienen los nombres y tipos de productos desde la API de productos.
    -   Comprueba el cálculo correcto de cantidades totales.

### Reporte de Días Concurridos (GET /reporte/dias-concurridos/)

-   `test_reporte_dias_concurridos`:
    -   Prueba que se analiza correctamente la concurrencia por día de la semana en un rango de fechas.
    -   Verifica el mapeo correcto de números de día de la semana a nombres en español.
    -   Valida que se filtra por rango de fechas y se cuenta correctamente.

### Reporte del Mozo del Mes (GET /reporte/mozo-del-mes/)

-   `test_reporte_mozo_del_mes`:
    -   Verifica que se encuentra al mozo con mayor cantidad de comandas en un mes y año específicos.
    -   Comprueba que se obtienen los detalles del mozo desde la API de mozos.
    -   Valida la respuesta con ID, nombre completo y cantidad de comandas.

-   `test_reporte_mozo_del_mes_sin_comandas`:
    -   Asegura que se maneja correctamente el caso cuando no hay comandas en el período especificado.
    -   Verifica que devuelve error 404 con mensaje apropiado.

## Cómo Ejecutar los Tests

Para ejecutar el conjunto de tests, asegúrate de que los contenedores de Docker estén en funcionamiento. Luego, desde la **carpeta raíz del proyecto** (`ingenieria-3-grupo-2`), ejecuta el siguiente comando en tu terminal:

```bash
docker compose -f docker/docker-compose.yml exec reporte pytest
```

Este comando le indica a Docker que ejecute `pytest` dentro del contenedor del servicio `reporte`, que es donde reside el entorno de testing configurado.

### Ejecutar tests específicos

Si querés ejecutar un test específico:

```bash
docker compose -f docker/docker-compose.yml exec reporte pytest tests/test_reporte.py::test_reporte_ganancias_mensuales
```

### Ver más detalles (verbose)

Para ver más información durante la ejecución:

```bash
docker compose -f docker/docker-compose.yml exec reporte pytest -v
```

## 📋 Cobertura de Tests

Los tests cubren:
- ✅ Cálculo de ganancias mensuales con filtrado por estado y año
- ✅ Ranking de productos más vendidos con concurrencia de llamadas
- ✅ Análisis de concurrencia por día de la semana
- ✅ Determinación del mozo del mes con obtención de detalles
- ✅ Manejo de casos de error (sin datos)
- ✅ Mocking completo de APIs externas
- ✅ Validación de estructuras de respuesta