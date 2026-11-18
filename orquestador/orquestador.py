#!/usr/bin/env python3
"""Orquestador del equipo de agentes que construye el videojuego web 3D.

Uso:
  python orquestador/orquestador.py iniciar "idea del juego" [--aprobar]
  python orquestador/orquestador.py siguiente
  python orquestador/orquestador.py bucle --max 5
  python orquestador/orquestador.py tarea "añade un menú de pausa con ajustes de volumen"
  python orquestador/orquestador.py replanificar "quiero que haya modo contrarreloj"
  python orquestador/orquestador.py estado
  python orquestador/orquestador.py agentes
"""
from __future__ import annotations

import argparse
import asyncio
import subprocess
import sys
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    HookMatcher,
    ResultMessage,
    TextBlock,
    ToolUseBlock,
    query,
)

sys.path.insert(0, str(Path(__file__).resolve().parent))
import prompts  # noqa: E402
from agentes import cargar_agentes  # noqa: E402
from protecciones import GuardiaFeatures, bloquear_bash_peligroso, resumen_progreso, todo_hecho  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
FEATURES = RAIZ / "estado" / "feature_list.json"

HERRAMIENTAS_ORQUESTADOR = [
    "Read", "Write", "Edit", "Glob", "Grep", "Bash", "Agent", "TodoWrite", "WebSearch", "WebFetch",
]


def opciones(args: argparse.Namespace) -> ClaudeAgentOptions:
    return ClaudeAgentOptions(
        cwd=str(RAIZ),
        # Prompt de Claude Code + procedimiento del orquestador
        system_prompt={"type": "preset", "preset": "claude_code", "append": prompts.sistema_orquestador()},
        # Carga CLAUDE.md y .claude/settings.json del proyecto
        setting_sources=["project"],
        agents=cargar_agentes(RAIZ / ".claude" / "agents"),
        allowed_tools=HERRAMIENTAS_ORQUESTADOR,
        permission_mode="acceptEdits",
        model=args.modelo,
        max_turns=args.max_turnos,
        max_budget_usd=args.presupuesto,
        hooks={"PreToolUse": [HookMatcher(matcher="Bash", hooks=[bloquear_bash_peligroso])]},
    )


async def ejecutar(prompt: str, args: argparse.Namespace, etiqueta: str) -> ResultMessage | None:
    print(f"\n\033[1;36m══ {etiqueta} ══\033[0m")
    resultado: ResultMessage | None = None
    async for msg in query(prompt=prompt, options=opciones(args)):
        if isinstance(msg, AssistantMessage):
            for bloque in msg.content:
                if isinstance(bloque, TextBlock) and bloque.text.strip():
                    print(bloque.text)
                elif isinstance(bloque, ToolUseBlock):
                    if bloque.name in ("Agent", "Task"):
                        quien = bloque.input.get("subagent_type", "?")
                        que = bloque.input.get("description", "")
                        print(f"\033[33m  → delega en {quien}: {que}\033[0m")
                    elif args.verbose:
                        print(f"\033[90m  · {bloque.name}\033[0m")
        elif isinstance(msg, ResultMessage):
            resultado = msg
            coste = f"{msg.total_cost_usd:.2f} USD" if msg.total_cost_usd is not None else "?"
            estado = "ERROR" if msg.is_error else "ok"
            print(f"\033[90m  [{estado}] turnos={msg.num_turns} coste≈{coste}\033[0m")
    return resultado


def _git_init() -> None:
    if not (RAIZ / ".git").exists():
        subprocess.run(["git", "init", "-q"], cwd=RAIZ, check=True)
        subprocess.run(["git", "add", "-A"], cwd=RAIZ, check=True)
        subprocess.run(["git", "commit", "-qm", "chore: plantilla del equipo de agentes"], cwd=RAIZ, check=False)


def _puerta(fichero: str, minimo: int = 200) -> None:
    """Puerta del encadenamiento: la fase anterior tiene que haber dejado su entregable."""
    ruta = RAIZ / fichero
    if not ruta.exists() or len(ruta.read_text(encoding="utf-8")) < minimo:
        sys.exit(f"✗ La fase no produjo {fichero} (o está casi vacío). Revisa la salida y repite.")
    print(f"\033[32m  ✓ {fichero}\033[0m")


def _aprobacion(args: argparse.Namespace, que: str) -> None:
    if args.aprobar:
        r = input(f"\n¿Revisado {que}? Edítalo si quieres y pulsa Enter para seguir (q para salir): ")
        if r.strip().lower() == "q":
            sys.exit(0)


async def cmd_iniciar(args: argparse.Namespace) -> None:
    _git_init()
    await ejecutar(prompts.FASE_BRIEF.format(idea=args.idea), args, "1/5 Brief (optimizador-prompt)")
    _puerta("contexto/CONTEXTO_PROYECTO.md", 800)
    _aprobacion(args, "contexto/CONTEXTO_PROYECTO.md")

    await ejecutar(prompts.FASE_DISENO, args, "2/5 Diseño (juego, arte, UI)")
    for f in ("docs/GDD.md", "docs/COMBATE.md", "docs/GUIA_VISUAL.md", "docs/GUIA_UI.md"):
        _puerta(f)
    _aprobacion(args, "docs/GDD.md, GUIA_VISUAL.md y GUIA_UI.md")

    await ejecutar(prompts.FASE_ARQUITECTURA, args, "3/5 Arquitectura")
    _puerta("docs/ARQUITECTURA.md")
    _aprobacion(args, "docs/ARQUITECTURA.md")

    await ejecutar(prompts.FASE_PLAN, args, "4/5 Plan (feature_list.json)")
    _puerta("estado/feature_list.json")

    await ejecutar(prompts.FASE_REVISION, args, "5/5 Coherencia y commit")
    print("\n" + resumen_progreso(FEATURES))
    print("\nSiguiente paso: python orquestador/orquestador.py bucle --max 3")


async def cmd_siguiente(args: argparse.Namespace, extra: str = "") -> bool:
    if not FEATURES.exists():
        sys.exit("No hay estado/feature_list.json. Ejecuta primero 'iniciar'.")
    guardia = GuardiaFeatures(FEATURES)
    guardia.snapshot()
    antes = resumen_progreso(FEATURES)
    resultado = await ejecutar(prompts.SESION.format(extra=extra), args, "Sesión de construcción")
    for aviso in guardia.verificar_y_reparar():
        print(f"\033[31m  ⚠ {aviso}\033[0m")
    despues = resumen_progreso(FEATURES)
    print("\n" + despues)
    return resultado is not None and not resultado.is_error and antes != despues


async def cmd_bucle(args: argparse.Namespace) -> None:
    sin_avance = 0
    for i in range(1, args.max + 1):
        if todo_hecho(FEATURES):
            print("✓ Backlog completado.")
            return
        print(f"\n\033[1m### Sesión {i}/{args.max}\033[0m")
        avanzo = await cmd_siguiente(args)
        sin_avance = 0 if avanzo else sin_avance + 1
        if sin_avance >= 2:
            print("✗ Dos sesiones seguidas sin progreso. Paro para que revises estado/PROGRESO.md.")
            return


async def cmd_tarea(args: argparse.Namespace) -> None:
    guardia = GuardiaFeatures(FEATURES)
    guardia.snapshot()
    await ejecutar(prompts.TAREA.format(tarea=args.texto), args, "Tarea puntual")
    for aviso in guardia.verificar_y_reparar():
        print(f"\033[31m  ⚠ {aviso}\033[0m")


async def cmd_replanificar(args: argparse.Namespace) -> None:
    # Aquí NO se aplica la guardia: replanificar es el único momento en que el backlog puede cambiar.
    await ejecutar(prompts.REPLANIFICAR.format(cambio=args.texto), args, "Replanificación")
    print("\n" + resumen_progreso(FEATURES))


def main() -> None:
    p = argparse.ArgumentParser(description="Orquestador de agentes para el videojuego web 3D")
    p.add_argument("--modelo", default="opus", help="modelo del orquestador (opus|sonnet|…)")
    p.add_argument("--max-turnos", type=int, default=120)
    p.add_argument("--presupuesto", type=float, default=None, help="tope en USD por llamada")
    p.add_argument("-v", "--verbose", action="store_true", help="muestra todas las herramientas usadas")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("iniciar", help="idea → contexto → diseño → arquitectura → plan")
    s.add_argument("idea")
    s.add_argument("--aprobar", action="store_true", help="pausa para revisión humana entre fases")
    sub.add_parser("siguiente", help="una sesión: una feature")
    s = sub.add_parser("bucle", help="varias sesiones seguidas")
    s.add_argument("--max", type=int, default=3)
    s = sub.add_parser("tarea", help="tarea puntual fuera del backlog")
    s.add_argument("texto")
    s = sub.add_parser("replanificar", help="cambiar el diseño o el plan")
    s.add_argument("texto")
    sub.add_parser("estado", help="progreso (sin llamar al modelo)")
    sub.add_parser("agentes", help="lista los subagentes cargados")

    args = p.parse_args()
    if args.cmd == "estado":
        print(resumen_progreso(FEATURES))
    elif args.cmd == "agentes":
        for nombre, a in cargar_agentes(RAIZ / ".claude" / "agents").items():
            print(f"{nombre:26} {a.model or 'inherit':7} {', '.join(a.tools or ['*'])}")
    else:
        comandos = {
            "iniciar": cmd_iniciar, "siguiente": cmd_siguiente, "bucle": cmd_bucle,
            "tarea": cmd_tarea, "replanificar": cmd_replanificar,
        }
        asyncio.run(comandos[args.cmd](args))


if __name__ == "__main__":
    main()
