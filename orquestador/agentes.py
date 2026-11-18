"""Carga los subagentes desde .claude/agents/*.md (una sola fuente de verdad
para Claude Code y para el SDK)."""
from __future__ import annotations

from pathlib import Path

from claude_agent_sdk import AgentDefinition


def _parsear(md: Path) -> tuple[dict[str, str], str]:
    texto = md.read_text(encoding="utf-8")
    if not texto.startswith("---"):
        raise ValueError(f"{md.name}: falta el frontmatter YAML")
    _, frontmatter, cuerpo = texto.split("---", 2)
    meta: dict[str, str] = {}
    for linea in frontmatter.strip().splitlines():
        if ":" in linea:
            clave, valor = linea.split(":", 1)
            meta[clave.strip()] = valor.strip()
    for obligatorio in ("name", "description"):
        if obligatorio not in meta:
            raise ValueError(f"{md.name}: falta '{obligatorio}' en el frontmatter")
    return meta, cuerpo.strip()


def cargar_agentes(carpeta: Path) -> dict[str, AgentDefinition]:
    agentes: dict[str, AgentDefinition] = {}
    for md in sorted(carpeta.glob("*.md")):
        meta, cuerpo = _parsear(md)
        herramientas = [t.strip() for t in meta.get("tools", "").split(",") if t.strip()]
        agentes[meta["name"]] = AgentDefinition(
            description=meta["description"],
            prompt=cuerpo,
            tools=herramientas or None,  # None = hereda todas
            model=meta.get("model") or None,
            background=False,  # el orquestador espera el resultado de cada especialista
        )
    return agentes


if __name__ == "__main__":
    raiz = Path(__file__).resolve().parent.parent
    for nombre, a in cargar_agentes(raiz / ".claude" / "agents").items():
        print(f"{nombre:26} {a.model or 'inherit':7} {', '.join(a.tools or ['*'])}")
