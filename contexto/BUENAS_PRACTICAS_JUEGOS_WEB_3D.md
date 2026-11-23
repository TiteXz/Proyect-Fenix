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

## Render (Three.js, estado 2026)
- **`WebGPURenderer` (`three/webgpu`) con respaldo automático a WebGL 2.** WebGPU ya está en Chrome/Edge, Firefox
  (Windows y Mac Apple Silicon) y Safari 26; el respaldo cubre el resto. Inicializar con `await renderer.init()`
  (o `setAnimationLoop`) y probar el camino WebGL 2 desde el día 1 con `forceWebGL: true`.
- **Shaders y materiales en TSL** (nodos que compilan a WGSL y a GLSL). Con este renderer no funcionan
  `ShaderMaterial`, `RawShaderMaterial` ni `onBeforeCompile`: nada de GLSL a mano.
- **Postproceso con el pipeline de nodos** (`PostProcessing` + `pass()`, MRT y fusión automática de pasadas):
  TRAA, GTAO, SSR, bloom, DOF… desde `three/addons/tsl/display/`. `EffectComposer` y la librería `postprocessing`
  no sirven con `WebGPURenderer`.
- **Compute solo con comprobación:** en WebGL 2 el compute se emula con limitaciones (sin storage textures ni
  atómicos). Toda función que dependa de compute (partículas masivas, hierba, culling GPU) necesita una versión
  más modesta para el respaldo, elegida por capacidad del dispositivo, no por navegador.
- Fijar la versión exacta de three.js y revisar las notas de versión al actualizar: la API de nodos aún cambia.

## Calidad visual (fantasía realista luminosa)
- **Cielo y atmósfera físicos** (Rayleigh/Mie, perspectiva aérea) que alimentan el IBL; el entorno se recalcula de
  forma escalonada (no cada frame) siguiendo el ciclo día/noche.
- **Sol con sombras en cascada** (`CSMShadowNode`; ≤ 3 cascadas en Alto). Sombras virtuales/paginadas solo como
  opción de Ultra y tras medir.
- **TRAA** como antialiasing por defecto (estable con vegetación y GTAO); FXAA/SMAA en Bajo.
- **GTAO**, bloom HDR y niebla/luz volumétrica a resolución reducida, escalados por preset.
- PBR con texturas KTX2, salida HDR y tonemapping ACES o AgX; exposición coherente entre día y noche.
- Cada efecto tiene coste medido y un preset mínimo en el que se activa.

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
- **Presupuestos por preset** (Bajo/Medio/Alto/Ultra: FPS, draw calls, triángulos, memoria GPU, MB de descarga) en
  un único fichero de config que comprueban los tests (`renderer.info`). La tabla vigente está en `CONTEXTO_PROYECTO.md`.
- Presets de calidad (sombras, AO, resolución, LOD, densidad de partículas y vegetación). WebGL 2 es la base del preset Bajo.
- **Pocas llamadas de dibujo:** `BatchedMesh` para geometrías distintas con el mismo material; `InstancedMesh`
  para copias; fusionar geometría estática. Atlas/arrays de texturas para compartir material.
- **Impostores octaédricos** (atlas KTX2) para árboles y rocas lejanos; sustituir solo cuando el impostor no ocupe
  en pantalla más que su resolución horneada. LOD generados con meshoptimizer.
- **Terreno:** heightmap con LOD (quadtree o clipmaps) y splatting de ≤ 4 capas PBR en KTX2. Nunca PNG/JPG sin
  comprimir en el terreno (dispara la VRAM y puede perder el contexto).
- **Streaming por celdas:** cola priorizada por distancia, límite de cargas simultáneas, transcodificación KTX2 en
  Workers (núcleos − 2, entre 2 y 8), subida a GPU repartida entre frames y `dispose()` al descargar.
- Workers para generación procedural, navmesh, colisiones y decodificación; el hilo principal solo integra.
- Geometría Meshopt (o Draco) y texturas KTX2 (Basis); las que ya usan Zstandard apenas ganan con más compresión.
- Sombras con moderación: una direccional con sombra; `setPixelRatio(Math.min(devicePixelRatio, 2))` y escala de
  resolución dinámica si cae el FPS.
- Nada de `new Vector3()`, closures ni arrays nuevos dentro del bucle; reutilizar y usar pools.
- `dispose()` de geometrías, materiales, texturas y render targets al cambiar de escena o descargar celda.
- Herramientas: `renderer.info`, stats-gl, la pestaña Performance del navegador, Spector.js (WebGL) y el
  inspector de WebGPU.

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
- https://threejs.org/manual/en/webgpurenderer
- https://threejs.org/manual/en/webgpu-postprocessing.html
- https://threejs.org/docs/pages/CSMShadowNode.html
- https://web.dev/blog/webgpu-supported-major-browsers
- https://www.utsubo.com/blog/webgpu-threejs-migration-guide
- https://discourse.threejs.org/t/a-forest-of-octahedral-impostors/85735
