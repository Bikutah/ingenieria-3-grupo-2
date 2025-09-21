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
# Templates en código (solo Dockerfile y código app)
# =========================
DOCKERFILE = """\
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
"""

MAIN_PY = """\
from fastapi import FastAPI
{imports}

app = FastAPI(title="{app_title}")

@app.get("/health")
def health():
    return {{"status": "ok", "service": "{service_key}"}}

{includes}
"""

CONSTANTS_PY = """\
DEFAULT_LIMIT = 50
"""

EXCEPTIONS_PY = """\
class {Domain}NotFoundError(Exception):
    \"\"\"Se dispara cuando no se encuentra un recurso de {domain}.\"\"\"
    pass
"""

SCHEMAS_PY = """\
from pydantic import BaseModel, Field

class {Domain}Create(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class {Domain}Out(BaseModel):
    id: int
    nombre: str
"""

MODELS_PY = """\
class {Domain}:
    def __init__(self, id: int, nombre: str):
        self.id = id
        self.nombre = nombre
"""

SERVICES_PY = """\
from .models import {Domain}
from .exceptions import {Domain}NotFoundError

_DB = {{}}
_SEQ = 0

def create_{domain}(nombre: str) -> {Domain}:
    global _SEQ
    _SEQ += 1
    inst = {Domain}(_SEQ, nombre)
    _DB[_SEQ] = inst
    return inst

def list_{domain}s(limit: int = 50) -> list[{Domain}]:
    return list(_DB.values())[:limit]

def get_{domain}(id_: int) -> {Domain}:
    if id_ not in _DB:
        raise {Domain}NotFoundError()
    return _DB[id_]
"""

ROUTER_PY = """\
from fastapi import APIRouter, HTTPException, Query
from .schemas import {Domain}Create, {Domain}Out
from .services import create_{domain}, list_{domain}s, get_{domain}
from .exceptions import {Domain}NotFoundError
from .constants import DEFAULT_LIMIT

router = APIRouter()

@router.post("/", response_model={Domain}Out)
def create(payload: {Domain}Create):
    obj = create_{domain}(payload.nombre)
    return {{"id": obj.id, "nombre": obj.nombre}}

@router.get("/", response_model=list[{Domain}Out])
def list_all(limit: int = Query(DEFAULT_LIMIT, ge=1, le=500)):
    objs = list_{domain}s(limit=limit)
    return [{{"id": o.id, "nombre": o.nombre}} for o in objs]

@router.get("/{{id_}}", response_model={Domain}Out)
def get_one(id_: int):
    try:
        o = get_{domain}(id_)
        return {{"id": o.id, "nombre": o.nombre}}
    except {Domain}NotFoundError:
        raise HTTPException(status_code=404, detail="{Domain} no encontrado")
"""

TEST_MAIN = """\
from httpx import AsyncClient
from src.main import app
import pytest

@pytest.mark.anyio
async def test_health_ok():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
"""

TEST_DOMAIN = """\
from httpx import AsyncClient
from src.main import app
import pytest

@pytest.mark.anyio
async def test_{domain}_crud():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post("/{domain}/", json={{"nombre": "ejemplo"}})
        assert r.status_code == 200
        data = r.json()
        r = await ac.get("/{domain}/")
        assert r.status_code == 200
        assert len(r.json()) >= 1
        r = await ac.get(f"/{domain}/{{data['id']}}")
        assert r.status_code == 200
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
"""

# =========================
# Helpers
# =========================
def log(msg: str, verbose: bool):
    if verbose:
        print(msg)

def sanitize_name(name: str) -> str:
    # Normaliza: minúsculas, alfanumérico y guiones
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

def render_template(path: Path, **kwargs) -> str:
    """
    Lee un template y aplica .format(**kwargs).
    Si el template contiene llaves literales { }, escapalas como {{ }}.
    """
    text = read_text(path)
    try:
        return text.format(**kwargs)
    except KeyError as e:
        missing = str(e).strip("'")
        raise KeyError(f"Falta el placeholder {{{missing}}} en {path} o no se proveyó en render_template(...)")

def read_compose() -> str:
    return COMPOSE_FILE.read_text(encoding="utf-8")

def write_compose(text: str):
    COMPOSE_FILE.write_text(text if text.endswith("\n") else text + "\n", encoding="utf-8")

def extract_used_ports(compose_text: str) -> set[int]:
    # Captura - "8001:8000", - '8001:8000', o - 8001:8000
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
    # Evitar duplicado
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

def create_domain(src_dir: Path, tests_dir: Path, domain: str, verbose: bool):
    Domain = domain.capitalize()
    domain_dir = src_dir / domain
    domain_dir.mkdir(parents=True, exist_ok=True)
    write_file(domain_dir / "__init__.py", "", verbose)
    write_file(domain_dir / "constants.py", CONSTANTS_PY, verbose)
    write_file(domain_dir / "exceptions.py", EXCEPTIONS_PY.format(Domain=Domain, domain=domain), verbose)
    write_file(domain_dir / "schemas.py", SCHEMAS_PY.format(Domain=Domain), verbose)
    write_file(domain_dir / "models.py", MODELS_PY.format(Domain=Domain), verbose)
    write_file(domain_dir / "services.py", SERVICES_PY.format(Domain=Domain, domain=domain), verbose)
    write_file(domain_dir / "router.py", ROUTER_PY.format(Domain=Domain, domain=domain), verbose)
    # test
    write_file(tests_dir / f"test_{domain}.py", TEST_DOMAIN.format(domain=domain), verbose)

def create_api(name: str, domains: List[str], port: int | None, no_compose: bool, force: bool, verbose: bool):
    ensure_base(verbose)
    name = sanitize_name(name)
    domains = [sanitize_name(d) for d in domains] if domains else [name]

    api_dir_name = f"api-{name}"
    api_dir = BACKEND_DIR / api_dir_name
    src_dir = api_dir / "src"
    tests_dir = api_dir / "tests"

    if api_dir.exists():
        if not force:
            raise FileExistsError(f"Ya existe {api_dir}. Usa --force para reutilizar/sobrescribir archivos.")
    api_dir.mkdir(parents=True, exist_ok=True)
    src_dir.mkdir(parents=True, exist_ok=True)
    tests_dir.mkdir(parents=True, exist_ok=True)

    # ---- Templates desde docker/templates ----
    # requirements.txt (sin placeholders)
    reqs_content = read_text(TEMPLATES_DIR / "requirements.txt")
    write_file(api_dir / "requirements.txt", reqs_content, verbose)

    # .env.template (con placeholders {app_title}, {service_key})
    env_content = render_template(TEMPLATES_DIR / ".env.template",
                                  app_title=f"API {name}",
                                  service_key=name)
    write_file(api_dir / ".env.template", env_content, verbose)

    # ---- Resto de archivos base ----
    write_file(api_dir / "Dockerfile", DOCKERFILE, verbose)
    write_file(api_dir / ".dockerignore", "__pycache__\n*.pyc\n.env\n", verbose)
    write_file(src_dir / "__init__.py", "", verbose)
    write_file(tests_dir / "__init__.py", "", verbose)
    write_file(tests_dir / "test_main.py", TEST_MAIN, verbose)

    # Crear base SQLite específica
    db_file = api_dir / f"bd-{name}.sqlite3"
    if not db_file.exists():
        db_file.touch()
        log(f"Base SQLite creada: {db_file}", verbose)

    # Domains
    for d in domains:
        create_domain(src_dir, tests_dir, d, verbose)

    # main.py (importa e incluye todos los routers)
    imports = "\n".join([f"from .{d}.router import router as {d}_router" for d in domains])
    includes = "\n".join([f'app.include_router({d}_router, prefix="/{d}", tags=["{d}"])' for d in domains])
    write_file(src_dir / "main.py", MAIN_PY.format(app_title=f"API {name}", service_key=name, imports=imports, includes=includes), verbose)

    print(f"✅ API creada en: {api_dir}")

    if no_compose:
        print("ℹ️ No se modificó docker-compose.yml (--no-compose)")
        return

    # Compose
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
