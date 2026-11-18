# Buenas prácticas de programación de videojuegos web 3D

## Arquitectura
- **Bucle de juego = input → update → render.** Simulación con paso fijo (acumulador, p. ej. 1/60 s)
  y render con interpolación: el juego se comporta igual a 30, 60 o 144 FPS.
- **Separar lógica y render.** La lógica no importa `three`. Los sistemas leen/escriben datos; una
  capa de sincronización copia transformaciones a los `Object3D`.
- **ECS (Entity-Component-System) o composición** antes que herencia profunda: añadir/quitar
  componentes cambia el comportamiento sin jerarquías frágiles. Para un proyecto pequeño/mediano basta
  un ECS ligero (miniplex) o uno propio de ~150 líneas.
- **Máquina de estados de juego** explícita: `Cargando → Menú → Jugando ⇄ Pausa → FinPartida`.
- **Bus de eventos** tipado para desacoplar gameplay de UI y audio (la UI escucha `score:changed`, no
  lee variables internas).
- **Configuración como datos** (`juego/src/config/*.ts` o JSON): velocidades, daños, curvas de
  dificultad. El diseñador ajusta sin tocar sistemas.

## Estructura sugerida de `juego/src`
```
core/        bucle, tiempo, eventos, estados, RNG con semilla, pools
ecs/         mundo, componentes, consultas
systems/     movimiento, física, IA, combate, spawn, cámara…
render/      renderer, escena, luces, postproceso, sincronización ECS→Three
assets/      cargadores glTF/KTX2, caché, manifiesto
input/       teclado, ratón, mando, táctil → acciones abstractas
audio/       Web Audio, bancos de sonido, mezcla
ui/          HUD y menús (DOM), estilos
scenes/      niveles / escenas
config/      parámetros de juego
debug/       stats, lil-gui, window.__GAME__
```

## Rendimiento (medir antes de optimizar)
- Presupuesto orientativo (estilo realista, preset Alto): < 300 draw calls, ~1,5–2 M triángulos visibles,
  texturas 2K (4K solo en piezas protagonistas). El preset Bajo debe rondar la mitad.
- Presets de calidad (sombras, SSAO, resolución, LOD, densidad de partículas) en lugar de un único nivel.
- `InstancedMesh` / `BatchedMesh` para muchos objetos iguales; fusionar geometría estática.
- Texturas KTX2 (Basis) y geometría Meshopt/Draco; LOD para objetos lejanos.
- Sombras con moderación: una luz direccional con sombra, `shadow.mapSize` ajustado, sombras horneadas
  cuando se pueda. Limitar `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- Nada de `new Vector3()`, closures ni arrays nuevos dentro del bucle; reutilizar y usar pools.
- `dispose()` de geometrías, materiales, texturas y render targets al cambiar de escena.
- Herramientas: `renderer.info`, stats.js/stats-gl, la pestaña Performance del navegador, Spector.js.

## Calidad y testeo (clave para que un agente pueda verificar)
- Lógica pura testeable con Vitest (sin DOM ni WebGL).
- **Modo test** (`?test=1`): semilla fija, bucle pausado, `window.__GAME__.step(n)` avanza n ticks,
  `window.__GAME__.state()` devuelve un snapshot serializable.
- Playwright e2e: carga la página, comprueba que el canvas existe, sin errores en consola, simula
  input, avanza ticks y compara el estado. Capturas de pantalla para cambios visuales.
- Presupuesto de rendimiento en CI: fallar si el bundle supera el límite.

## UX / UI
- HUD en DOM, legible, escalable; menús navegables con teclado y mando.
- Pausa al perder el foco (`visibilitychange`). Ajustes: volumen, sensibilidad, calidad gráfica.
- Accesibilidad: remapeo de teclas, contraste, no depender solo del color, opción de reducir sacudidas de cámara.
- El audio solo puede arrancar tras un gesto del usuario (política de autoplay).

## Fuentes
- https://dev.to/i_babkov/threejs-architecture-ecs-3fg2
- https://gitnation.com/contents/game-development-patterns-and-architectures-in-javascript
- https://abratabia.com/threejs/performance.php
- https://discoverthreejs.com/tips-and-tricks/
- https://threejs.org/manual/
