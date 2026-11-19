# Progreso del proyecto

Diario de sesiones. Solo se añade al final (lo mantiene `guardian-contexto`).
La siguiente sesión empieza leyendo las 2–3 últimas entradas.

---
## Sesión 2026-11-19 09:50 — Tarea puntual: Cambio de alcance a mundo abierto + dungeons
- Resultado: PASA (validación documental; sin feature asociada ni `verificar.sh`)
- Hecho:
  - Revisado `contexto/CONTEXTO_PROYECTO.md` (150 líneas): sin restos de "arena" fuera del dungeon, mundo abierto ya fuera de la lista de "Fuera del MVP", controles sin duplicados de tecla de hechizo (Q/E/R).
  - Corrección mínima de formato: párrafo de "Límites duros" fusionado en el apartado de rendimiento reflujado en dos líneas (sin cambiar contenido ni cifras).
  - `CLAUDE.md` revisado: no contradice el nuevo alcance (no se editó).
- Supuestos clave: mundo 1–2 km² en 3–4 zonas; celdas 128 m con radio 5×5 visual / 3×3 simulación; presupuestos por preset (draw calls, triángulos, memoria GPU) en tabla; dungeon congela el mundo salvo la celda de entrada; caballo no se monta dentro del dungeon; tecla F para interactuar y montar.
- Dudas abiertas:
  - Tamaño 1–2 km² y presupuestos (FPS, draw calls, triángulos, memoria) sin medir en hardware real.
  - Respawn de enemigos de mundo (no definido).
  - Guardar partida dentro del dungeon (no definido; hoy solo se pierde progreso al abandonar).
  - WebGPU: pendiente de ADR; el stack por defecto sigue siendo WebGLRenderer.
  - Choque de tecla F: interactuar (pulsar) vs montar/desmontar caballo (mantener); "cero tirones" en pilar 4 vs hitch permitido ≤ 33 ms.
- Siguiente recomendada: `/iniciar` o replanificación — disenador-juego (GDD del mundo y dungeons), arquitecto (ADRs de streaming, terreno y dungeons), planificador (`feature_list.json`). Motivo: el backlog actual no cubre el nuevo alcance y `estado/feature_list.json` no existe (solo `feature_list.ejemplo.json`).
- Progreso: n/a (`estado/feature_list.json` ausente; no se pudo calcular n/total)
