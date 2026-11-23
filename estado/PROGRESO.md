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
- 2026-11-19 (cont.): mundo ampliado a 6,4 × 8,4 km (≈ 33 km² de tierra, ≈ 2/3 de GTA V) hacia el sur: desierto mayor con oasis
  (estanque + vegetación), zona rocosa de mesetas/cañones y la Ciudad de la Roca (4 niveles en terrazas alrededor de un pozo
  central, puentes, rampas, torre central y desfiladero de entrada). Edificios aún placeholder. CONTEXTO actualizado.
- 2026-11-19 (cont.): añadidos a CONTEXTO la hoja de ruta tras el MVP (fase 2 magia modular/armas/armaduras, fase 3 NPCs/casas/
  castillo/animales/vegetación, fase 4 barcos/pesca/mar) y los presupuestos de tamaño total (MVP ≤ 1,5 GB, completo ≤ 3,5 GB).
- 2026-11-19 (cont.): `disenador-combate` crea `docs/COMBATE.md` (§1 combate MVP pendiente; §2 sistema de magia de la fase 2:
  runas, 7 elementos, 21 fusiones = reacciones, combinaciones generadas, 8 legendarias, arcanos Espacio/Tiempo, buffs/debuffs,
  invisibilidad, teletransporte/planeo/impulso, inestabilidad, grimorio + mutación, inscripciones, 22 reglas comprobables
  M-01..M-22 y 10 preguntas abiertas). Pendiente ADR: runas en JSON vs .ts, precarga forzada de celdas, escala de tiempo por entidad.
- 2026-11-19 (cont.): COMBATE.md actualizado: runas de control con hueco propio; sin bloqueos por nivel (dificultad vs dominio
  → coste y fallo de ejecución); XP 75–80 % exploración / resto uso con rendimientos decrecientes; afinidad por elemento;
  Rebobinar/Estasis válidos con jefes; piedras de paso fuera de dungeons; Velo y planeo a caballo; inscripciones → inventario/crafteo.

## 2026-11-20 — Sistema de magia por runas en la maqueta (`prototipo/`)
- Commits 2f42a8f, 1cee601, a3a1a01 (docs), da4b64d, bf4d064 y 8f04488 (fix): `prototipo/magia/` (VFX.md, DISENO.md, magia.js), `prototipo/vfx/vfx.js` (hechizos con runas) y `prototipo/maqueta.src.html`.
- Pruebas `prototipo/pruebas/magia.js` MQ-01..MQ-15 en verde (según el usuario). Arreglos posteriores: números de daño sin solape, RNG con semilla, menos asignaciones en el bucle.
- Límites pendientes en `prototipo/magia/DISENO.md` §10: draw calls de VFX por encima de la meta, sin heat haze ni soft particles, sin Cellisca/Tempestad, grimorio sin localStorage.
- Es maqueta, no juego: no hay código en `juego/src`.

## 2026-11-21 — Commit c6197b5: mundo Bronsil / Valdera, combate y lore
- Commit c6197b5 del usuario. Recoge: mundo Bronsil / región Valdera, MVP solo espada con escudo opcional (martillo y arco en reserva, COMBATE §1.2), combate direccional con parada perfecta (COMBATE §1.1), lore en `docs/GDD.md` §10, nueva `docs/GUIA_UI.md` y nueva `docs/GUIA_VISUAL.md`.

## 2026-11-23 — Sincronización de contexto y guías (commits 38d2cfd, 4aae6dd, a647bdc)
- `contexto/CONTEXTO_PROYECTO.md`: asentamientos con nombre, interacciones EP/EE por configuración y sección «Preguntas abiertas».
- `docs/GUIA_UI.md`: dos configuraciones de espada (solo espada / espada + escudo); cruceta ▲ alterna la configuración fuera de combate; escudo equipable desde Armas.
- `docs/GUIA_VISUAL.md`: escudo del jugador, sets de animación EP/EE y telegrafiado de dirección.
- Marcados como aplicados en `docs/GDD.md` §10.10 (nombres de asentamientos) y `docs/COMBATE.md` §1.3 (CONTEXTO, GUIA_UI, requisitos de GUIA_VISUAL); el resto sigue abierto.
- Añadidos a `docs/COMBATE.md` §1.3: ratón (gesto M-1 vs stick virtual de GUIA_UI §5.1) y dos contradicciones de CONTEXTO con otros docs (cambio de arma en combate; WASD para dirección). No se reescribieron docs ajenos.
- Estado: aún no hay `docs/ARQUITECTURA.md`, ADRs (`estado/decisiones/` sin ADR de juego), `estado/feature_list.json` ni `juego/src`. Siguiente paso: `/iniciar` (arquitecto + planificador).

## Sesión 2026-11-23 08:33 — Cierre documental (sin feature)
- Resultado: PASA (tarea documental; sin feature del backlog)
- Hecho: entradas de diario añadidas; §10.10 de GDD y §1.3 de COMBATE marcados como aplicados donde procede; pendiente ratón (M-1 vs stick virtual) y dos contradicciones anotadas en COMBATE §1.3; sin commit.
- Decisiones: no se reescriben docs de otros roles; las contradicciones quedan como pendiente. Sin ADR nuevo.
- Problemas abiertos / deuda: lore del MVP, post-final y rejugabilidad del dungeon, mercaderes (D-6), Códice vs lore, chamán goblin, bolso mágico (GDD §5); escudo y sets de animación por ejecutar (`artista-3d`); prototipo sigue con martillo/arco (no se toca).
- Siguiente recomendada: `/iniciar` (arquitecto + planificador) — no existe `feature_list.json` ni arquitectura; sin backlog no se puede elegir feature.
- Progreso: n/a (`estado/feature_list.json` ausente; 0 features verificadas)
- 2026-11-23 (cont.): buenas prácticas de render actualizadas a petición del usuario: `WebGPURenderer` con respaldo
  WebGL 2, TSL, postproceso de nodos (TRAA, GTAO, bloom, volumétrica), `CSMShadowNode`, impostores octaédricos,
  `BatchedMesh` y streaming con límites. Cambiados `contexto/BUENAS_PRACTICAS_JUEGOS_WEB_3D.md`, el stack de
  `CONTEXTO_PROYECTO.md` y los agentes programador-motor y optimizador-rendimiento. Pendiente: ADR del arquitecto; la
  maqueta (r147, GLSL) no se migra.
