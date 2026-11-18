"""Prompts del harness. El procedimiento del orquestador vive en
contexto/ORQUESTADOR.md para compartirlo con Claude Code (/siguiente)."""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def sistema_orquestador() -> str:
    return (RAIZ / "contexto" / "ORQUESTADOR.md").read_text(encoding="utf-8")


# --- Fases de `iniciar` (encadenamiento con puertas) -----------------------

FASE_BRIEF = """Usa el subagente `optimizador-prompt` para convertir esta idea en el contexto del proyecto
(rellena contexto/CONTEXTO_PROYECTO.md). Idea del usuario:

<idea>
{idea}
</idea>

Cuando termine, muéstrame los SUPUESTOS que ha tomado."""

FASE_DISENO = """Lanza EN PARALELO (son independientes) estos subagentes, cada uno leyendo
contexto/CONTEXTO_PROYECTO.md:
- `disenador-juego` → crea docs/GDD.md completo para el MVP.
- `director-arte` → crea docs/GUIA_VISUAL.md (incluye los efectos visuales de cada hechizo y elemento).
Cuando el GDD esté escrito, usa `disenador-combate` para crear docs/COMBATE.md y la tabla de balance.
Después, con el GDD y la guía visual ya escritos, usa `interfaz-ui` para crear docs/GUIA_UI.md
(solo documento, sin código todavía). Resume contradicciones si las hay."""

FASE_ARQUITECTURA = """Usa el subagente `arquitecto` para escribir docs/ARQUITECTURA.md y los ADRs
iniciales en estado/decisiones/, a partir de contexto/CONTEXTO_PROYECTO.md, docs/GDD.md,
docs/COMBATE.md, docs/GUIA_VISUAL.md y docs/GUIA_UI.md. Todavía NO crees código."""

FASE_PLAN = """Usa el subagente `planificador` para crear estado/feature_list.json con el esquema de su
definición. La feature F-001 debe ser el scaffolding de juego/ (agente: arquitecto) y el hito M0 debe
dejar: bucle de paso fijo, escena vacía renderizando, modo ?test=1 con window.__GAME__, test unitario y
e2e de humo, y scripts/verificar.sh funcionando."""

FASE_REVISION = """Usa `guardian-contexto` para revisar coherencia entre CONTEXTO_PROYECTO, GDD,
GUIA_VISUAL, GUIA_UI, ARQUITECTURA y feature_list.json, y crear la primera entrada en estado/PROGRESO.md
("Sesión 0 — planificación"). Después haz `git add -A && git commit -m "docs: planificación inicial"`."""

# --- Sesiones de construcción ------------------------------------------------

SESION = """Ejecuta UNA sesión de trabajo siguiendo tu procedimiento (contexto/ORQUESTADOR.md):
oriéntate, elige UNA feature, delega, verifica, cierra con commit y entrada en PROGRESO.md.
{extra}"""

TAREA = """Tarea puntual del usuario (no forma parte del backlog salvo que lo indique):

<tarea>
{tarea}
</tarea>

1. Usa `optimizador-prompt` para convertirla en un brief preciso.
2. Delega en los especialistas adecuados, verifica con `scripts/verificar.sh`.
3. Commit descriptivo y entrada breve en estado/PROGRESO.md vía `guardian-contexto`.
No modifiques estado/feature_list.json."""

REPLANIFICAR = """El usuario quiere cambiar el plan:

<cambio>
{cambio}
</cambio>

1. Si afecta a mecánicas, usa `disenador-juego` para actualizar docs/GDD.md.
2. Si afecta a la técnica, usa `arquitecto` (ADR nuevo).
3. Usa `planificador` para replanificar estado/feature_list.json siguiendo sus reglas de replanificación.
   Si existe estado/features_propuestas.json, valora incorporarlas y luego vacíalo.
4. Commit "plan: …" y entrada en PROGRESO.md vía `guardian-contexto`."""
