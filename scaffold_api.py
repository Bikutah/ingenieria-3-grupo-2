#!/usr/bin/env python3
"""
Scaffold de APIs FastAPI (estilo fastapi-base-ds) con Docker Compose.
- Solo usa standard library.
- Crea backend/api-<name> con src/<domain>/...
- Agrega servicio al docker/docker-compose.yml con puerto libre.
- Cada API queda configurada con su SQLite propio: ./bd-<name>.sqlite3
- Lee templates de docker/templates/.env.template y docker/templates/requirements.txt
"""
from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
DOCKER_DIR = ROOT / "docker"
TEMPLATES_DIR = DOCKER_DIR / "templates"
COMPOSE_FILE = DOCKER_DIR / "docker-compose.yml"

# =========================
# Templates en código
# =========================
GITIGNORE_CONTENT = """\
# Byte-compiled / optimized / DLL files
__pycache__/
*.pyc
*.pyo
*.pyd

# C extensions
*.so

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Environments
.env
.venv
env/
venv/
ENV/
env.bak
venv.bak

# SQLite databases
*.sqlite3

# IDEs and editors
.idea/
.vscode/

# Pytest
.pytest_cache/
"""

CONFIG_PY = """\
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
"""

DATABASE_PY = """\
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from .config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}, # Necesario para SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency para inyectar la sesión de la BD en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"""

DOCKERFILE = """\
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--reload", "--host", "0.0.0.0","--port", "8000"]
"""

# >>>> AQUI: main con add_pagination
MAIN_PY = """\
from fastapi import FastAPI
from .database import engine
{model_imports}
{imports}

# Crea las tablas en la base de datos (si no existen)
{create_tables}

from fastapi_pagination import add_pagination

app = FastAPI(title="{app_title}")

@app.get("/health")
def health():
    return {{"status": "ok", "service": "{service_key}"}}

{includes}

# activa paginación (page/size en Swagger)
add_pagination(app)
"""

SCHEMAS_PY = """\
from pydantic import BaseModel, Field, ConfigDict

class {Domain}Base(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class {Domain}Create({Domain}Base):
    pass

class {Domain}Out({Domain}Base):
    id: int
    model_config = ConfigDict(from_attributes=True) # Permite que Pydantic lea desde objetos ORM
"""

# >>>> AQUI: modelo con created_at opcional (útil para ordenar/filtrar). Si no lo querés, podés quitarlo.
MODELS_PY = """\
from sqlalchemy import Column, Integer, String, DateTime, func
from ..database import Base

class {Domain}(Base):
    __tablename__ = "{domain_py}s" # Nombre de la tabla

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
"""

# >>>> AQUI: filtros fastapi-filter por dominio
FILTERS_PY = """\
from fastapi_filter.contrib.sqlalchemy import Filter
from .models import {Domain}

class {Domain}Filter(Filter):
    # ejemplos típicos (extensible según tu modelo):
    id : int | None = None              # ?id=1
    id__neq: int | None = None              # ?id__neq=1
    nombre__ilike: str | None = None       # ?nombre__ilike=juan
    created_at__gte: str | None = None     # ?created_at__gte=2025-01-01
    created_at__lte: str | None = None     # ?created_at__lte=2025-12-31

    # orden: ?order_by=-created_at&order_by=nombre
    order_by: list[str] | None = None

    class Constants(Filter.Constants):
        model = {Domain}
"""

# >>>> AQUI: router con GET nativo (FilterDepends) + paginación
ROUTER_PY = """\
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from . import models, schemas
from .filters import {Domain}Filter

from fastapi_filter import FilterDepends
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate

router = APIRouter()

@router.post("/", response_model=schemas.{Domain}Out)
def create(payload: schemas.{Domain}Create, db: Session = Depends(get_db)):
    db_obj = models.{Domain}(nombre=payload.nombre)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/", response_model=Page[schemas.{Domain}Out])
def list_all(
    filtro: {Domain}Filter = FilterDepends({Domain}Filter),
    db: Session = Depends(get_db),
):
    query = filtro.filter(select(models.{Domain}))
    query = filtro.sort(query)
    return paginate(db, query)

@router.get("/{{id_}}", response_model=schemas.{Domain}Out)
def get_one(id_: int, db: Session = Depends(get_db)):
    obj = db.get(models.{Domain}, id_)
    if obj is None:
        raise HTTPException(status_code=404, detail="{Domain} no encontrado")
    return obj
"""

COMPOSE_SERVICE_TEMPLATE = """\
  {service_key}:
    build:
      context: ../backend/{api_dir}
      dockerfile: Dockerfile
    ports:
      - "{host_port}:8000"
    volumes:
      - ../backend/{api_dir}:/app
    restart: always
    env_file:
      - ../backend/{api_dir}/.env
"""

# =========================
# Helpers
# =========================
def log(msg: str, verbose: bool):
    if verbose:
        print(msg)

def sanitize_name(name: str) -> str:
    n = name.strip().lower()
    n = re.sub(r"[^a-z0-9-]+", "-", n)
    n = re.sub(r"-+", "-", n).strip("-")
    if not n:
        raise ValueError("El nombre queda vacío después de sanearlo.")
    return n

def ensure_base(verbose: bool):
    BACKEND_DIR.mkdir(exist_ok=True)
    DOCKER_DIR.mkdir(exist_ok=True)
    TEMPLATES_DIR.mkdir(exist_ok=True)
    if not COMPOSE_FILE.exists():
        COMPOSE_FILE.write_text("services:\n", encoding="utf-8")
        log("Creado docker/docker-compose.yml mínimo.", verbose)

def read_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"No se encontró el template requerido: {path}")
    return path.read_text(encoding="utf-8")

# --- FUNCIÓN RESTAURADA ---
def read_compose() -> str:
    return COMPOSE_FILE.read_text(encoding="utf-8")

def write_compose(text: str):
    COMPOSE_FILE.write_text(text if text.endswith("\n") else text + "\n", encoding="utf-8")

def extract_used_ports(compose_text: str) -> set[int]:
    ports = set()
    for m in re.finditer(r'-\s*["\']?(\d{4,5})\s*:\s*8000["\']?', compose_text):
        try:
            ports.add(int(m.group(1)))
        except ValueError:
            pass
    return ports

def next_free_port(compose_text: str, start: int = 8001, end: int = 8110) -> int:
    used = extract_used_ports(compose_text)
    for p in range(start, end + 1):
        if p not in used:
            return p
    raise RuntimeError(f"No hay puertos libres entre {start}-{end}.")

def add_service_to_compose(service_key: str, api_dir: str, host_port: int, verbose: bool):
    text = read_compose()
    if not re.search(r"(?m)^\s*services\s*:\s*$", text):
        text = "services:\n" + text
    if re.search(rf"(?m)^\s*{re.escape(service_key)}\s*:\s*$", text):
        raise RuntimeError(f"El servicio '{service_key}' ya existe en docker-compose.yml")
    block = COMPOSE_SERVICE_TEMPLATE.format(service_key=service_key, api_dir=api_dir, host_port=host_port)
    text = text if text.endswith("\n") else text + "\n"
    text += block
    write_compose(text)
    log(f"Servicio '{service_key}' agregado al compose en puerto {host_port}:8000", verbose)

def write_file(path: Path, content: str, verbose: bool):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    log(f"Escrito: {path}", verbose)

# =========================
# Lógica de creación principal
# =========================
def create_domain(src_dir: Path, domain_py: str, verbose: bool):
    Domain = "".join(word.capitalize() for word in domain_py.split('_'))
    domain_dir = src_dir / domain_py
    domain_dir.mkdir(parents=True, exist_ok=True)
    
    write_file(domain_dir / "__init__.py", "", verbose)
    write_file(domain_dir / "schemas.py", SCHEMAS_PY.format(Domain=Domain), verbose)
    write_file(domain_dir / "models.py", MODELS_PY.format(Domain=Domain, domain_py=domain_py), verbose)
    write_file(domain_dir / "filters.py", FILTERS_PY.format(Domain=Domain), verbose)
    write_file(domain_dir / "router.py", ROUTER_PY.format(Domain=Domain), verbose)

def create_api(name: str, domains: List[str], port: int | None, no_compose: bool, force: bool, verbose: bool):
    ensure_base(verbose)
    name = sanitize_name(name)
    
    domain_names_url = [sanitize_name(d) for d in domains] if domains else [name]
    domain_pairs = [(d_url, d_url.replace('-', '_')) for d_url in domain_names_url]

    api_dir_name = f"api-{name}"
    api_dir = BACKEND_DIR / api_dir_name
    src_dir = api_dir / "src"

    if api_dir.exists() and not force:
        raise FileExistsError(f"Ya existe {api_dir}. Usa --force para reutilizar/sobrescribir archivos.")
    
    api_dir.mkdir(parents=True, exist_ok=True)
    src_dir.mkdir(parents=True, exist_ok=True)

    write_file(api_dir / ".gitignore", GITIGNORE_CONTENT, verbose)
    
    reqs_content = read_text(TEMPLATES_DIR / "requirements.txt")
    write_file(api_dir / "requirements.txt", reqs_content, verbose)
    
    db_name = f"bd-{name}.sqlite3"
    write_file(api_dir / ".env", f'DATABASE_URL="sqlite:///./{db_name}"\n', verbose)
    db_file = api_dir / db_name
    if not db_file.exists():
        db_file.touch()
        log(f"Base SQLite creada: {db_file}", verbose)

    write_file(src_dir / "config.py", CONFIG_PY, verbose)
    write_file(src_dir / "database.py", DATABASE_PY, verbose)

    write_file(api_dir / "Dockerfile", DOCKERFILE, verbose)
    write_file(api_dir / ".dockerignore", "__pycache__\n*.pyc\n.env\n", verbose)
    write_file(src_dir / "__init__.py", "", verbose)

    for _, domain_py in domain_pairs:
        create_domain(src_dir, domain_py, verbose)

    model_imports = "\n".join([f"from .{d_py} import models as {d_py}_models" for _, d_py in domain_pairs])
    create_tables = "\n".join([f"{d_py}_models.Base.metadata.create_all(bind=engine)" for _, d_py in domain_pairs])
    imports = "\n".join([f"from .{d_py}.router import router as {d_py}_router" for _, d_py in domain_pairs])
    includes = "\n".join([f'app.include_router({d_py}_router, prefix="/{d_url}", tags=["{d_url}"])' for d_url, d_py in domain_pairs])
    
    main_content = MAIN_PY.format(
        app_title=f"API {name}", 
        service_key=name,
        model_imports=model_imports,
        create_tables=create_tables,
        imports=imports, 
        includes=includes
    )
    write_file(src_dir / "main.py", main_content, verbose)

    print(f"✅ API creada en: {api_dir}")

    if no_compose:
        print("ℹ️ No se modificó docker-compose.yml (--no-compose)")
        return

    compose_text = read_compose()
    chosen_port = port if port else next_free_port(compose_text)
    add_service_to_compose(name, api_dir_name, chosen_port, verbose)
    print(f"🔧 Servicio agregado: '{name}' → http://localhost:{chosen_port}")
    print("👉 Levantá con:  cd docker && docker compose up --build")

# =========================
# CLI
# =========================
def parse_args():
    p = argparse.ArgumentParser(description="Scaffold de API FastAPI con Docker (estilo fastapi-base-ds).")
    p.add_argument("--name", required=True, help="Nombre lógico de la API (se usa como api-<name> y servicio).")
    p.add_argument("--domain", help="Dominio único (por defecto igual a --name). Ignorado si usas --domains.")
    p.add_argument("--domains", help="Varios dominios separados por coma. Ej: usuarios,roles,productos")
    p.add_argument("--port", type=int, help="Puerto host (si se omite, se asigna uno libre).")
    p.add_argument("--no-compose", action="store_true", help="No modificar docker/docker-compose.yml")
    p.add_argument("--force", action="store_true", help="Reutiliza carpeta si existe (sobrescribe archivos del arquetipo).")
    p.add_argument("--verbose", action="store_true", help="Salida detallada.")
    return p.parse_args()

def main():
    args = parse_args()
    try:
        if args.domains:
            domains = [d.strip() for d in args.domains.split(",") if d.strip()]
        else:
            domains = [args.domain.strip()] if args.domain else []
        create_api(
            name=args.name,
            domains=domains,
            port=args.port,
            no_compose=args.no_compose,
            force=args.force,
            verbose=args.verbose,
        )
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        if args.verbose:
            import traceback; traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
