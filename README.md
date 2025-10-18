# ingenieria-3-grupo-2

---

## ⚙️ Tecnologías utilizadas

### Backend → FastAPI + SQLite
- **FastAPI**: framework moderno para construir APIs en Python, muy rápido y con tipado fuerte gracias a **Pydantic**.  
  - Genera automáticamente la documentación interactiva de la API con **Swagger UI** (`/docs`) y **ReDoc** (`/redoc`).  
  - Integra validación de datos, manejo de errores y asincronía de forma nativa.  
  - Ideal para microservicios porque es ligero y fácil de escalar con **Docker**.

- **SQLite**: base de datos relacional liviana que guarda la información en un solo archivo (`bd-<api>.sqlite3`).  
  - No requiere servidor adicional, lo que simplifica el desarrollo y las pruebas.  
  - Permite mantener la independencia de cada microservicio (cada API tiene su propia base).  
  - Aunque no está pensada para altísima concurrencia, es más que suficiente para prototipos y entornos de desarrollo.

➡️ Con esta combinación, cada API es autocontenida: tiene su código, su base de datos local y se levanta en un contenedor independiente.

---

### Frontend → React + TypeScript
- **React**: biblioteca de JavaScript enfocada en construir interfaces de usuario con componentes reutilizables.  
  - Permite estructurar la UI en piezas pequeñas (botones, formularios, vistas completas) fáciles de mantener.  
  - Tiene un ecosistema muy grande de librerías (por ejemplo: React Router para navegación, Zustand/Redux para estado).

- **TypeScript**: superconjunto de JavaScript que agrega tipado estático.  
  - Mejora la **seguridad** y el **autocompletado** en el editor.  
  - Facilita detectar errores antes de ejecutar el código.  
  - Se integra perfectamente con React a través de archivos `.tsx`.

➡️ El frontend consume las APIs creadas en FastAPI y presenta la información en una interfaz moderna y dinámica, con la robustez que aporta TypeScript.

---

🔧 Inicializador del entorno (inicializador.py)

Este script prepara todas las APIs dentro de backend/ cuyo nombre comience con api-:

Crea o actualiza el archivo .env por servicio con
DATABASE_URL="sqlite:///./bd-<api>.sqlite3".

Crea el archivo SQLite si no existe (p. ej. bd-mozo-y-cliente.sqlite3).

Genera las tablas automáticamente (via Base.metadata.create_all(engine)), importando todos los paquetes bajo src.* para registrar modelos.

(Opcional) Si detecta Alembic, puede correr alembic upgrade head.

(Opcional) Ejecuta Docker: docker compose build --no-cache y docker compose up -d.

Recomendado: correrlo siempre desde la raíz del repo.

Uso básico
# Inicializa todas las APIs (env + sqlite + tablas)
python inicializador.py

Variantes útiles
# Forzar sobrescribir .env existentes
python inicializador.py --force

# Limitar a ciertas APIs
python inicializador.py --services api-mozo-y-cliente api-menu

# No crear el archivo .sqlite (solo .env + tablas)
python inicializador.py --no-touch-db

# Omitir creación de tablas
python inicializador.py --no-create-all

# Usar Alembic si hay migraciones (con fallback a create_all si falla)
python inicializador.py --alembic

Integración con Docker (opcional)
# Inicializa todo y luego hace build (sin caché) + levanta en segundo plano
python inicializador.py --docker


Opciones Docker:

# Usar un compose específico
python inicializador.py --docker --compose-file docker/docker-compose.yml

# Build con caché y levantar en primer plano
python inicializador.py --docker --cache --foreground

# Limitar a servicios del compose y nombrar el proyecto
python inicializador.py --docker --compose-services frontend mozo-y-cliente --compose-project-name ing3

# Habilitar profiles
python inicializador.py --docker --profiles dev debug

---

## 🚧 Arquetipo de APIs (FastAPI + Docker)

Este repo incluye un **scaffolder** (`scaffold_api.py`) que genera APIs de prueba con estructura base (routers por dominio, tests mínimos, Dockerfile) y las **agrega automáticamente al `docker-compose`** con un puerto libre.  
Cada API creada queda con **su propia base SQLite** (archivo `bd-<api>.sqlite3` dentro de la carpeta del servicio).

---

## 📁 Estructura del proyecto

```

.
├── backend/                 # Aquí viven las APIs generadas (api-<nombre>)
├── docker/
│   └── templates/
│       └── requirements.txt # Template de requirements para cada API
├── frontend/                # (placeholder para tu FE)
├── README.md
├── scaffold\_api.py          # Script para generar arquetipos de APIs
└── tests/                   # (tests globales si necesitás)

````

> ⚠️ El script también puede usar un template de `.env.template`.  
> Si querés personalizar variables por defecto, agregá:  
> `docker/templates/.env.template` con, por ejemplo:
> ```env
> APP_NAME="{app_title}"
> APP_ENV="development"
> DATABASE_URL="sqlite:///./bd-{service_key}.sqlite3"
> ```

---

## 🛠️ Requisitos

- Python 3.10+  
- Docker + Docker Compose

---

## 🧰 Generar una nueva API

Desde la **carpeta raíz** del repo:

```bash
python scaffold_api.py --name nombre
````

Esto crea:

```
backend/
  api-nombre/
    Dockerfile
    requirements.txt
    .env.template
    bd-nombre.sqlite3
    src/
      main.py
      nombre/
        router.py
        schemas.py
        services.py
        models.py
        constants.py
        exceptions.py
    tests/
      test_main.py
      test_nombre.py
```

Además, agrega el servicio al `docker-compose.yml` con un puerto libre (ej.: `8001`, `8002`, …).

### Variantes útiles

* Con dominio específico:

  ```bash
  python scaffold_api.py --name personas --domain usuarios
  ```
* Con múltiples dominios:

  ```bash
  python scaffold_api.py --name inventario --domains productos,marcas,categorias
  ```
* Fijar puerto:

  ```bash
  python scaffold_api.py --name pagos --port 8010
  ```
* Sin tocar el compose:

  ```bash
  python scaffold_api.py --name auditoria --no-compose
  ```
* Sobrescribir carpeta existente:

  ```bash
  python scaffold_api.py --name personas --force
  ```

---

## 🐳 Levantar con Docker

1. Desde la carpeta **docker**:

```bash
cd docker
docker compose up --build
```

2. O desde la raíz del repo:

```bash
docker compose -f docker/docker-compose.yml up --build
```

### Endpoints por defecto

* `GET /health` → estado `ok`
* `GET /docs` → Swagger UI
* Rutas del dominio (ej.: `/{dominio}/`, `/{dominio}/{id_}`)

Ejemplo: si generaste `api-personas` en puerto `8001` →
[http://localhost:8001/health](http://localhost:8001/health)
[http://localhost:8001/docs](http://localhost:8001/docs)
[http://localhost:8001/personas/](http://localhost:8001/personas/)

---

## 🧪 Tests

Cada API incluye tests mínimos con `pytest` + `httpx`:

```bash
pytest -q
```

---

## 🔍 Logs y debugging

* Ver logs:

  ```bash
  docker logs -f <container>
  ```
* Los errores 500 muestran stacktrace en consola Uvicorn.

---

## 🧹 Problemas comunes

* **Conflicto de contenedores**:

  ```bash
  docker rm -f <servicio>
  ```
* **Puerto ocupado**: ajustá en `docker-compose.yml` o usá `--port`.
* **Templates faltantes**: asegurate de tener:

  ```
  docker/templates/requirements.txt
  docker/templates/.env.template   # si lo usás
  ```

---

## 📌 Notas de diseño

* Cada API usa su **propia SQLite** (`bd-<api>.sqlite3`).
* La estructura de dominio incluye `router.py`, `services.py`, `schemas.py`, `models.py`, etc.
* El `docker-compose` se va extendiendo con cada nueva API y asigna puertos automáticamente.