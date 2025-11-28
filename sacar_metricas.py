import subprocess
import re
from pathlib import Path
from shutil import which

ROOT_DIR = Path(__file__).resolve().parent
METRICS_DIR = ROOT_DIR / "metrics"
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"


def ensure_metrics_dir():
    METRICS_DIR.mkdir(exist_ok=True)


def run_cmd(cmd, output_name, cwd=None):
    """
    Ejecuta un comando de consola, guarda stdout en metrics/<output_name>
    y muestra un resumen por pantalla.
    """
    out_path = METRICS_DIR / output_name

    print(f"➡ Ejecutando: {' '.join(cmd)}")
    print(f"   Guardando salida en: {out_path}")

    result = subprocess.run(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    out_path.write_text(result.stdout, encoding="utf-8")

    if result.returncode == 0:
        print(f"✅ OK: {output_name}")
    else:
        print(f"⚠ Comando terminó con código {result.returncode}")
        print("   (revisá el archivo para más detalles)")

    return result.returncode


# ---------------- PARSEADORES ----------------


def parse_backend_totals(path: Path):
    """
    Parsea el bloque de Total que escribe `radon raw -s`.
    """
    if not path.exists():
        return None

    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()

    inside_total = False
    totals = {}

    for line in lines:
        if not inside_total and "Total" in line:
            inside_total = True
            continue

        if inside_total:
            stripped = line.strip()
            if not stripped or stripped.startswith("- Comment Stats"):
                break

            if ":" not in stripped:
                continue

            name, value_part = stripped.split(":", 1)
            name = name.strip()
            m = re.search(r"(\d+)", value_part)
            if not m:
                continue

            totals[name] = int(m.group(1))

    return totals or None


def parse_frontend_totals(path: Path):
    """
    Parsea la salida por defecto de `sloc`:

        Physical :  2723
          Source :  1935
         Comment :  816
           Empty :  79
           To Do :  7
    """
    if not path.exists():
        return None

    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines()

    labels = ["Physical", "Source", "Comment", "Empty", "To Do"]
    totals = {}

    for line in lines:
        stripped = line.strip()
        for label in labels:
            if stripped.startswith(label):
                m = re.search(r"(\d+)", stripped)
                if m:
                    totals[label] = int(m.group(1))

    return totals or None


# ---------------- FRONTEND: npx PATH REAL ----------------


def get_npx_executable() -> str | None:
    """
    Devuelve ruta completa a npx (npx o npx.cmd en Windows),
    o None si no se encuentra.
    """
    for candidate in ("npx", "npx.cmd"):
        path = which(candidate)
        if path:
            return path
    return None


# ---------------- MÉTRICAS BACKEND ----------------


def backend_metrics():
    print("== MÉTRICAS BACKEND ==")

    run_cmd(["radon", "raw", "-s", "backend"], "backend_raw.txt", cwd=ROOT_DIR)
    run_cmd(["radon", "cc", "-s", "-a", "backend"], "backend_cc.txt", cwd=ROOT_DIR)
    run_cmd(["radon", "mi", "-s", "backend"], "backend_mi.txt", cwd=ROOT_DIR)

    backend_raw_path = METRICS_DIR / "backend_raw.txt"
    backend_totals = parse_backend_totals(backend_raw_path)

    if backend_totals:
        print("\nResumen backend (desde bloque 'Total' de radon):")
        for k, v in backend_totals.items():
            print(f"  {k}: {v}")
    else:
        print("\n⚠ BACKEND: no se pudieron leer los totales de backend_raw.txt")

    print()
    return backend_totals


# ---------------- MÉTRICAS FRONTEND ----------------


def frontend_metrics():
    print("== MÉTRICAS FRONTEND ==")
    print("   (Usando `npx sloc src`)")

    npx_exec = get_npx_executable()
    if not npx_exec:
        print("❌ No se encontró 'npx' (ni npx.cmd). Asegurate de tener Node.js instalado.")
        return None

    print(f"✔ npx detectado en: {npx_exec}\n")

    # OJO: acá usamos la ruta completa a npx para que Windows no falle
    run_cmd(
        [npx_exec, "sloc", "src"],
        "frontend_sloc.txt",
        cwd=FRONTEND_DIR,
    )

    frontend_sloc_path = METRICS_DIR / "frontend_sloc.txt"
    frontend_totals = parse_frontend_totals(frontend_sloc_path)

    if frontend_totals:
        print("Resumen frontend (desde sloc):")
        for k, v in frontend_totals.items():
            print(f"  {k}: {v}")
    else:
        print("⚠ FRONTEND: no se pudieron leer los totales de frontend_sloc.txt")

    print()
    return frontend_totals


# ---------------- RESUMEN COMBINADO ----------------


def write_overall_totals(backend_totals, frontend_totals):
    out_path = METRICS_DIR / "totales_back_front.txt"
    lines = []

    lines.append("== RESUMEN DE TOTALES BACKEND / FRONTEND ==\n\n")

    # Backend
    lines.append("BACKEND:\n")
    if backend_totals:
        for k, v in backend_totals.items():
            lines.append(f"  {k}: {v}\n")
    else:
        lines.append("  No se pudieron leer los totales de backend_raw.txt\n")

    lines.append("\n")

    # Frontend
    lines.append("FRONTEND:\n")
    if frontend_totals:
        for k, v in frontend_totals.items():
            lines.append(f"  {k}: {v}\n")
    else:
        lines.append("  No se pudieron leer los totales de frontend_sloc.txt\n")

    lines.append("\n")

    # Combinado
    lines.append("COMBINADO:\n")
    if backend_totals and frontend_totals:
        total_lineas = backend_totals.get("LOC", 0) + frontend_totals.get("Physical", 0)
        total_codigo = backend_totals.get("SLOC", 0) + frontend_totals.get("Source", 0)
        total_comentarios = backend_totals.get("Comments", 0) + frontend_totals.get("Comment", 0)
        total_blanco = backend_totals.get("Blank", 0) + frontend_totals.get("Empty", 0)

        lines.append(f"  Total líneas (back LOC + front Physical): {total_lineas}\n")
        lines.append(f"  Líneas de código (back SLOC + front Source): {total_codigo}\n")
        lines.append(f"  Comentarios (back Comments + front Comment): {total_comentarios}\n")
        lines.append(f"  Líneas en blanco (back Blank + front Empty): {total_blanco}\n")
    else:
        lines.append("  No fue posible calcular totales combinados.\n")

    # ------------------------------
    # 🔥 M A C H E T E   E X P L I C A T I V O 🔥
    # ------------------------------
    lines.append("\n\n== EXPLICACIÓN DE CADA MÉTRICA ==\n")

    lines.append("\n--- BACKEND (radon) ---\n")
    lines.append("LOC: Total de líneas físicas del backend (incluye código, comentarios y vacías).\n")
    lines.append("LLOC: Líneas lógicas de código (cuenta instrucciones reales, no líneas físicas).\n")
    lines.append("SLOC: Líneas de código ejecutable (sin comentarios ni líneas vacías).\n")
    lines.append("Comments: Total de líneas que contienen comentarios.\n")
    lines.append("Blank: Líneas totalmente vacías.\n")
    lines.append("Single comments: Comentarios de una sola línea (# comentario).\n")
    lines.append("Multi: Comentarios multilínea o docstrings.\n")

    lines.append("\n--- FRONTEND (sloc) ---\n")
    lines.append("Physical: Total de líneas físicas (incluye código, comentarios, vacías).\n")
    lines.append("Source: Líneas reales de código JS/TS/React.\n")
    lines.append("Comment: Líneas que contienen comentarios (// o /* */).\n")
    lines.append("Empty: Líneas vacías.\n")
    lines.append("To Do: Comentarios marcados como TODO.\n")

    lines.append("\n--- COMBINADO ---\n")
    lines.append("Total líneas: Tamaño total del proyecto (backend + frontend).\n")
    lines.append("Líneas de código: Código ejecutable real del proyecto.\n")
    lines.append("Comentarios: Documentación interna escrita por el equipo.\n")
    lines.append("Líneas en blanco: Miden estilo, formateo y legibilidad del proyecto.\n")

    out_path.write_text("".join(lines), encoding="utf-8")
    print(f"📄 Resumen combinado + machete guardado en: {out_path}")

def main():
    ensure_metrics_dir()
    backend_totals = backend_metrics()
    frontend_totals = frontend_metrics()
    write_overall_totals(backend_totals, frontend_totals)
    print("\n✅ Listo. Revisá la carpeta 'metrics/' para ver todos los reportes.")


if __name__ == "__main__":
    main()
