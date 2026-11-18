"""Barreras de seguridad del harness:
1. Hook PreToolUse que bloquea comandos Bash destructivos.
2. GuardiaFeatures: garantiza que en una sesión normal solo cambian
   `passes`, `intentos` y `notas` de estado/feature_list.json.
"""
from __future__ import annotations

import copy
import json
import re
from pathlib import Path
from typing import Any

PATRONES_PELIGROSOS = [
    r"\brm\s+-[a-z]*r[a-z]*f?\s+(/|~|\$HOME|\.\.)(\s|$)",
    r"\bgit\s+push\b.*--force",
    r"\bgit\s+reset\s+--hard\b",
    r"\bgit\s+clean\s+-[a-z]*f",
    r"\bsudo\b",
    r"curl[^|]*\|\s*(ba|z)?sh",
    r"wget[^|]*\|\s*(ba|z)?sh",
    r"\bnpm\s+publish\b",
    r"\bmkfs\b|\bdd\s+if=",
    # el backlog solo se edita con Edit/Write (auditable), nunca con sed -i, tee o redirecciones
    r"(sed\s+-i|\btee\b|>{1,2})[^;&|]*feature_list\.json",
]


async def bloquear_bash_peligroso(input_data: dict[str, Any], tool_use_id: str | None, context: Any) -> dict:
    comando = (input_data.get("tool_input") or {}).get("command", "")
    for patron in PATRONES_PELIGROSOS:
        if re.search(patron, comando):
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": (
                        f"Bloqueado por la política del proyecto (patrón {patron!r}). "
                        "Busca una alternativa segura o pide confirmación al humano."
                    ),
                }
            }
    return {}


CAMPOS_MUTABLES = {"passes", "intentos", "notas"}


class GuardiaFeatures:
    """Snapshot antes de la sesión y reparación después."""

    def __init__(self, ruta: Path):
        self.ruta = ruta
        self.antes: dict | None = None

    def _leer(self) -> dict | None:
        if not self.ruta.exists():
            return None
        try:
            return json.loads(self.ruta.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return None

    def snapshot(self) -> None:
        self.antes = self._leer()

    def verificar_y_reparar(self) -> list[str]:
        """Devuelve la lista de avisos. Restaura cualquier cambio no permitido."""
        if self.antes is None:
            return []
        despues = self._leer()
        avisos: list[str] = []
        if despues is None:
            avisos.append("feature_list.json quedó ilegible: restaurado al estado anterior.")
            self._escribir(self.antes)
            return avisos

        por_id = {f["id"]: f for f in despues.get("features", [])}
        reparado = copy.deepcopy(self.antes)
        marcadas = 0
        for f in reparado.get("features", []):
            nuevo = por_id.pop(f["id"], None)
            if nuevo is None:
                avisos.append(f"{f['id']} fue borrada: restaurada.")
                continue
            for clave in set(f) | set(nuevo):
                if clave in CAMPOS_MUTABLES:
                    f[clave] = nuevo.get(clave, f.get(clave))
                elif f.get(clave) != nuevo.get(clave):
                    avisos.append(f"{f['id']}.{clave} se modificó: revertido.")
            if f.get("passes") and not self._estaba_pasada(f["id"]):
                marcadas += 1

        if por_id:
            propuestas = self.ruta.parent / "features_propuestas.json"
            existentes = json.loads(propuestas.read_text()) if propuestas.exists() else []
            existentes.extend(por_id.values())
            propuestas.write_text(json.dumps(existentes, ensure_ascii=False, indent=2), encoding="utf-8")
            avisos.append(
                f"{len(por_id)} feature(s) nuevas movidas a {propuestas.name} para revisión humana "
                "(usa 'replanificar' para incorporarlas)."
            )
        if marcadas > 1:
            avisos.append(f"Se marcaron {marcadas} features como pasadas en una sola sesión: revísalo.")

        if reparado != despues:
            self._escribir(reparado)
        return avisos

    def _estaba_pasada(self, fid: str) -> bool:
        return any(f["id"] == fid and f.get("passes") for f in (self.antes or {}).get("features", []))

    def _escribir(self, datos: dict) -> None:
        self.ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def resumen_progreso(ruta: Path) -> str:
    if not ruta.exists():
        return "No hay feature_list.json todavía. Ejecuta 'iniciar'."
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    feats = datos.get("features", [])
    hechas = {f["id"] for f in feats if f.get("passes")}
    lineas = [f"{datos.get('proyecto', '?')} — {len(hechas)}/{len(feats)} features pasadas"]
    for h in datos.get("hitos", []):
        del_hito = [f for f in feats if f.get("hito") == h["id"]]
        ok = sum(1 for f in del_hito if f.get("passes"))
        barra = "█" * round(10 * ok / len(del_hito)) if del_hito else ""
        lineas.append(f"  {h['id']} {h.get('nombre', ''):28} {ok:3}/{len(del_hito):<3} {barra}")
    pendientes = sorted(
        (f for f in feats if not f.get("passes") and all(d in hechas for d in f.get("depende_de", []))),
        key=lambda f: f.get("prioridad", 999),
    )
    if pendientes:
        s = pendientes[0]
        lineas.append(f"Siguiente: {s['id']} — {s['titulo']} ({s.get('agente', '?')}, intentos={s.get('intentos', 0)})")
    elif feats:
        lineas.append("¡Todas las features pasan!")
    return "\n".join(lineas)


def todo_hecho(ruta: Path) -> bool:
    if not ruta.exists():
        return False
    feats = json.loads(ruta.read_text(encoding="utf-8")).get("features", [])
    return bool(feats) and all(f.get("passes") or "OBSOLETA" in f.get("notas", "") for f in feats)
