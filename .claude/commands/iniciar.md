---
description: Arranca el proyecto desde una idea (brief → diseño → arquitectura → plan)
argument-hint: "<idea del juego>"
---
Actúa como orquestador siguiendo @contexto/ORQUESTADOR.md, pero esta vez para la FASE DE INICIO.
Ejecuta en orden y para tras cada fase para enseñarme un resumen y preguntarme si sigo:

1. `optimizador-prompt` → rellena contexto/CONTEXTO_PROYECTO.md con esta idea: $ARGUMENTS
2. En paralelo `disenador-juego` (docs/GDD.md) y `director-arte` (docs/GUIA_VISUAL.md); luego `disenador-combate` (docs/COMBATE.md) e `interfaz-ui` (docs/GUIA_UI.md, solo documento).
3. `arquitecto` → docs/ARQUITECTURA.md + ADRs (sin código todavía).
4. `planificador` → estado/feature_list.json (F-001 = scaffolding de juego/ por el arquitecto).
5. `guardian-contexto` → coherencia + "Sesión 0" en estado/PROGRESO.md; después commit.
