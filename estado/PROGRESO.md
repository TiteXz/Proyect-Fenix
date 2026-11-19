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

## 2026-11-19 — Tamaño del mundo: ≈ mitad de GTA V
- Petición del usuario: mapa ≈ mitad de GTA V. CONTEXTO_PROYECTO.md: ≈ 24 km² de tierra (cuadrícula ≈ 5,5 × 5,5 km),
  5–6 biomas, 2–3 asentamientos, 40–60 POI; terreno/vegetación procedurales con semilla, POI y dungeon a mano.
- *Floating origin* entra en el alcance; celdas media ≤ 0,5 MB, mundo ≤ 1 GB acumulado con caché en IndexedDB.
- Riesgo: volumen de contenido y presupuesto de descarga. Siguiente: `/iniciar`.
- 2026-11-19 (cont.): biomas fijados por el usuario: bosque, costa, desierto y monte nevado; añadida su variante de paleta.
- 2026-11-19 (cont.): el usuario descarta la fantasía oscura → **fantasía realista luminosa** (refs. de tono [SUPUESTO]:
  Ghost of Tsushima, Dragon's Dogma 2) y **ciclo día/noche dinámico dentro del MVP**. Actualizados CONTEXTO_PROYECTO.md,
  CLAUDE.md y los agentes director-arte y artista-3d. Pendiente: `prototipo/` (maqueta y su README) sigue en tono oscuro.
- 2026-11-19 (cont.): añadida zona de **islas** (archipiélago en el mar del este). Hecha una maqueta de concepto del mundo
  (mapa + 7 vistas) con Three.js, texturas PBR CC0 de Poly Haven e impostores de árboles horneados de modelos CC0;
  solo como referencia visual, no es código del juego.
- 2026-11-19 (cont.): mundo reestructurado a petición del usuario: cuadrícula 6,4 × 6,4 km, franja costera entre tierra y mar,
  transiciones de bioma de ~1 km, montañas escarpadas tipo macizo con lago glaciar y solo 3–4 islas a > 1 km de la costa.
- 2026-11-19 (cont.): maqueta de concepto con red de caminos de tierra (Aldea del Vado, Puerto Gaviota, Caleta, Oasis de Arenal,
  Refugio del lago, dungeon del castillo y salida oeste) y edificios placeholder (bloques de tamaños variados orientados al camino).
