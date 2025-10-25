# inicializador.py
from __future__ import annotations
import argparse
import os
from pathlib import Path
import sys
import subprocess
from typing import Dict, List, Optional
import shutil

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"

def log(msg: str) -> None:
    print(f"[init] {msg}")

def detect_services() -> list[Path]:
    if not BACKEND_DIR.exists():
        log(f"Directorio no encontrado: {BACKEND_DIR}")
        return []
    return sorted([p for p in BACKEND_DIR.iterdir() if p.is_dir() and p.name.startswith("api-")])

def service_to_db_filename(service_dir: Path) -> str:
    base = service_dir.name.removeprefix("api-")
    return f"bd-{base}.sqlite3"

def read_env_file(env_path: Path) -> Dict[str, str]:
    env: Dict[str, str] = {}
    if not env_path.exists():
        return env
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip().strip('"').strip("'")
        env[k.strip()] = v
    return env

def ensure_env(service_dir: Path, db_url: str, force: bool) -> None:
    env_path = service_dir / ".env"
    if env_path.exists() and not force:
        content = env_path.read_text(encoding="utf-8")
        if "DATABASE_URL=" in content:
            log(f".env ya existe en {service_dir.name} (ok)")
            return
        else:
            with env_path.open("a", encoding="utf-8") as f:
                f.write(("\n" if not content.endswith("\n") else "") + f'DATABASE_URL="{db_url}"\n')
            log(f"Añadí DATABASE_URL a .env en {service_dir.name} -> {db_url}")
            return

    env_path.write_text(f'DATABASE_URL="{db_url}"\n', encoding="utf-8")
    log(f'.env creado/actualizado en {service_dir}\\.env -> DATABASE_URL="{db_url}"')

def touch_sqlite(service_dir: Path, db_filename: str) -> None:
    db_path = service_dir / db_filename
    if not db_path.exists():
        db_path.touch()
        log(f"BD creada (vacía): {db_path}")
    else:
        log(f"BD ya existe (ok): {db_path}")

def create_tables_with_create_all(service_dir: Path, extra_env: Dict[str, str]) -> bool:
    python = sys.executable
    code = r"""
import pkgutil, importlib
try:
    import src  # asegura import base
except Exception as e:
    raise SystemExit(f"[init-sub] No pude importar 'src': {e}")
try:
    from src.database import Base, engine
except Exception as e:
    raise SystemExit(f"[init-sub] No pude importar Base/engine desde src.database: {e}")

for m in list(pkgutil.walk_packages(src.__path__, prefix="src.")):
    try:
        importlib.import_module(m.name)
    except Exception as e:
        print(f"[init-sub] Aviso: no pude importar {m.name}: {e}")

try:
    Base.metadata.create_all(engine)
    print("[init-sub] create_all ejecutado OK")
except Exception as e:
    raise SystemExit(f"[init-sub] Error en create_all: {e}")
"""
    env = os.environ.copy()
    env.update(extra_env or {})
    try:
        res = subprocess.run(
            [python, "-c", code],
            cwd=str(service_dir),
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        if res.stdout:
            for line in res.stdout.splitlines():
                log(f"{service_dir.name} | {line}")
        if res.stderr:
            for line in res.stderr.splitlines():
                log(f"{service_dir.name} | STDERR: {line}")
        ok = res.returncode == 0
        if ok:
            log(f"Tablas creadas/verificadas con create_all() en {service_dir.name} ✅")
        else:
            log(f"Fallo create_all() en {service_dir.name} (rc={res.returncode})")
        return ok
    except Exception as e:
        log(f"Error lanzando subproceso create_all en {service_dir.name}: {e}")
        return False

def run_alembic_upgrade(service_dir: Path, extra_env: Dict[str, str]) -> bool:
    if not (service_dir / "alembic.ini").exists():
        log(f"{service_dir.name}: sin alembic.ini, omito Alembic")
        return False
    env = os.environ.copy()
    env.update(extra_env or {})
    try:
        res = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=str(service_dir),
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        if res.stdout:
            for line in res.stdout.splitlines():
                log(f"{service_dir.name} | {line}")
        if res.stderr:
            for line in res.stderr.splitlines():
                log(f"{service_dir.name} | STDERR: {line}")
        ok = res.returncode == 0
        if ok:
            log(f"Alembic upgrade head OK en {service_dir.name} ✅")
        else:
            log(f"Alembic falló en {service_dir.name} (rc={res.returncode})")
        return ok
    except FileNotFoundError:
        log(f"{service_dir.name}: 'alembic' no está instalado en el entorno actual")
        return False
    except Exception as e:
        log(f"{service_dir.name}: error corriendo Alembic: {e}")
        return False

# ────────────────────────────────────────────────────────────────────────────────
# DOCKER
# ────────────────────────────────────────────────────────────────────────────────
def docker_cmd_base() -> Optional[List[str]]:
    """
    Devuelve ['docker', 'compose'] si existe, si no, ['docker-compose'].
    None si no hay Docker.
    """
    if shutil.which("docker"):
        # probar 'docker compose'
        try:
            res = subprocess.run(["docker", "compose", "version"], capture_output=True, text=True)
            if res.returncode == 0:
                return ["docker", "compose"]
        except Exception:
            pass
    if shutil.which("docker-compose"):
        return ["docker-compose"]
    return None

def find_compose_file(explicit: Optional[str]) -> Path:
    if explicit:
        p = (ROOT / explicit).resolve()
        if p.exists():
            return p
        raise FileNotFoundError(f"No se encuentra el compose en: {p}")
    # heurística común en tu repo
    candidates = [
        ROOT / "docker" / "docker-compose.yml",
        ROOT / "docker-compose.yml",
        ROOT / "compose.yml",
    ]
    for c in candidates:
        if c.exists():
            return c
    raise FileNotFoundError("No se encontró ningún docker-compose.yml (probé docker/docker-compose.yml, ./docker-compose.yml y ./compose.yml).")

def run_docker_build_and_up(
    compose_file: Path,
    services: Optional[List[str]] = None,
    no_cache: bool = True,
    detached: bool = True,
    project_name: Optional[str] = None,
    profiles: Optional[List[str]] = None,
) -> bool:
    cmd_base = docker_cmd_base()
    if not cmd_base:
        log("Docker no está instalado o no se encuentra en PATH.")
        return False

    env = os.environ.copy()
    build_cmd = cmd_base + ["-f", str(compose_file)]
    up_cmd = cmd_base + ["-f", str(compose_file)]

    if project_name:
        build_cmd += ["-p", project_name]
        up_cmd += ["-p", project_name]

    if profiles:
        # docker compose --profile a --profile b ...
        for p in profiles:
            build_cmd += ["--profile", p]
            up_cmd += ["--profile", p]

    # BUILD
    build_cmd += ["build"]
    if no_cache:
        build_cmd.append("--no-cache")
    if services:
        build_cmd += services

    log(f"Ejecutando: {' '.join(build_cmd)}")
    res_b = subprocess.run(build_cmd, cwd=str(ROOT), env=env, text=True)
    if res_b.returncode != 0:
        log("Fallo en build de Docker.")
        return False

    # UP
    up_cmd += ["up"]
    if detached:
        up_cmd.append("-d")
    if services:
        up_cmd += services

    log(f"Ejecutando: {' '.join(up_cmd)}")
    res_u = subprocess.run(up_cmd, cwd=str(ROOT), env=env, text=True)
    if res_u.returncode != 0:
        log("Fallo en docker compose up.")
        return False

    log("Docker build & up completados ✅")
    return True

# ────────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Inicializa .env/SQLite/tablas por API y (opcional) corre Docker build --no-cache + up -d."
    )
    parser.add_argument("--services", nargs="*", help="Ej: api-mozo-y-cliente api-menu")
    parser.add_argument("--force", action="store_true", help="Sobrescribe .env existente")
    parser.add_argument("--no-touch-db", action="store_true", help="No crea el archivo .sqlite si no existe")
    parser.add_argument("--no-create-all", action="store_true", help="No llama a Base.metadata.create_all(engine)")
    parser.add_argument("--alembic", action="store_true", help="Usar Alembic si hay migraciones (intenta 'alembic upgrade head')")
    # Docker flags
    parser.add_argument("--docker", action="store_true", help="Al finalizar, ejecutar docker compose build + up")
    parser.add_argument("--compose-file", help="Ruta al compose (por defecto detecta docker/docker-compose.yml, ./docker-compose.yml, ./compose.yml)")
    parser.add_argument("--compose-project-name", help="Valor para -p/--project-name de Docker")
    parser.add_argument("--compose-services", nargs="*", help="Limitar build/up a ciertos servicios del compose")
    parser.add_argument("--no-cache", action="store_true", help="Usar --no-cache en build (por defecto: True)")
    parser.add_argument("--cache", action="store_true", help="Si lo pasás, NO usa --no-cache (toma prioridad sobre --no-cache)")
    parser.add_argument("--detached", action="store_true", help="Levantar con -d (por defecto: True)")
    parser.add_argument("--foreground", action="store_true", help="Levantar en primer plano (toma prioridad sobre --detached)")
    parser.add_argument("--profiles", nargs="*", help="Perfiles de Docker Compose a habilitar (--profile)")
    args = parser.parse_args()

    if not BACKEND_DIR.exists():
        log(f"No se encontró {BACKEND_DIR}. Ejecuta este script desde la raíz del repo.")
        sys.exit(1)

    # Paso 1-3: preparar APIs
    services = detect_services()
    if args.services:
        wanted = set(args.services)
        services = [s for s in services if s.name in wanted]
        if not services:
            log("No se encontraron servicios que coincidan con --services.")
            sys.exit(1)

    if not services:
        log("No hay servicios api-* en backend/. Nada para hacer.")
    else:
        log(f"Servicios objetivo: {[s.name for s in services]}")
        for svc in services:
            log(f"Preparando {svc.name}…")
            db_filename = service_to_db_filename(svc)
            db_url = f"sqlite:///./{db_filename}"

            try:
                ensure_env(svc, db_url, args.force)
            except Exception as e:
                log(f"ERROR escribiendo .env en {svc.name}: {e}")
                continue

            if not args.no_touch_db:
                try:
                    touch_sqlite(svc, db_filename)
                except Exception as e:
                    log(f"Aviso: no pude crear/tocar la BD en {svc.name}: {e}")

            if args.no_create_all:
                log(f"{svc.name}: omitido create_all() por flag --no-create-all")
                continue

            env_vars = read_env_file(svc / ".env")
            if "DATABASE_URL" not in env_vars:
                env_vars["DATABASE_URL"] = db_url

            if args.alembic:
                if run_alembic_upgrade(svc, env_vars):
                    continue
                log(f"{svc.name}: Alembic no disponible o falló. Intento create_all() como respaldo…")

            create_tables_with_create_all(svc, env_vars)

    # Paso 4: Docker (opcional)
    if args.docker:
        try:
            compose_file = find_compose_file(args.compose_file)
        except FileNotFoundError as e:
            log(str(e))
            sys.exit(1)

        no_cache_effective = True
        if args.cache:
            no_cache_effective = False
        elif args.no_cache:
            no_cache_effective = True

        detached_effective = True
        if args.foreground:
            detached_effective = False
        elif args.detached:
            detached_effective = True

        ok = run_docker_build_and_up(
            compose_file=compose_file,
            services=args.compose_services,
            no_cache=no_cache_effective,
            detached=detached_effective,
            project_name=args.compose_project_name,
            profiles=args.profiles,
        )
        if not ok:
            sys.exit(1)

    log("Listo ✅")

if __name__ == "__main__":
    main()
