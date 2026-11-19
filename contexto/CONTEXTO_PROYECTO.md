# Contexto del proyecto

> Fuente de verdad del proyecto. Lo marcado como **[SUPUESTO]** es una decisión por defecto para
> poder empezar: cámbiala aquí antes de `/iniciar` si no te encaja. Máximo ~150 líneas;
> el detalle va en docs/.

## Elevator pitch
Juego de acción 3D de fantasía medieval para navegador, en un **mundo abierto hiper optimizado**.
El jugador explora a pie y a caballo un reino oscuro y combina **armas cuerpo a cuerpo, a distancia
y magia** contra enemigos de mundo y, en los **dungeons** (instancias de oleadas y jefe), contra
hordas organizadas. La gracia está en cambiar de arma y de hechizo en pleno combate para aprovechar
las debilidades de cada enemigo, y en que todo corra fluido en un navegador.

## Pilares de diseño
1. **Combate con decisiones:** cada arma y cada hechizo tienen un papel claro (alcance, velocidad,
   daño, control). Ninguno sirve para todo.
2. **Arma + magia combinadas:** los combos y las interacciones elementales premian alternar
   (p. ej. congelar con escarcha y romper con la maza).
3. **Respuesta inmediata:** golpes con peso (hit-stop, retroceso, sonido, partículas) y controles precisos.
4. **Mundo que invita a explorar sin perder el combate:** el mundo es acotado pero denso en puntos de
   interés; explorar nunca penaliza la fluidez (sin tirones perceptibles (ningún frame > 33 ms) al cruzar zonas).

## Género y perspectiva
- Acción/RPG ligero en **tercera persona**, cámara detrás del hombro controlada con el ratón. **[SUPUESTO]**
- Un jugador, sin multijugador. **[SUPUESTO]**

## Público y plataforma
- Navegadores de escritorio recientes (Chrome/Edge/Firefox/Safari). Móvil fuera del MVP. **[SUPUESTO]**
- Controles: teclado y ratón; mando (Gamepad API) en el hito de pulido.
  - WASD mover · Ratón cámara · Clic izq. ataque · Clic der. bloquear/apuntar · Espacio esquivar
  - 1-2-3 cambiar arma · Q/E/R lanzar hechizo · Rueda ciclar hechizos · Esc pausa
  - F interactuar (entrar al dungeon, recoger) · F mantenida montar/desmontar caballo **[SUPUESTO]** (E queda para hechizos)
  - A caballo: Shift galopa. El prototipo ya valida montar/galopar (`prototipo/README.md`).

## Rendimiento "hiper optimizado" (presupuestos medibles; se verifican en CI/Playwright con `renderer.info`)
| Métrica | Bajo | Medio | Alto | Ultra |
|---|---|---|---|---|
| FPS sostenidos (p5 ≥) | 30 (integrada) | 45 | 60 (GPU media) | 60 (GPU alta) |
| Draw calls por frame | ≤ 150 | ≤ 220 | ≤ 300 | ≤ 400 |
| Triángulos visibles | ≤ 0,75 M | ≤ 1,2 M | ≤ 2 M | ≤ 3 M |
| Memoria GPU (texturas+geom.) | ≤ 400 MB | ≤ 600 MB | ≤ 900 MB | ≤ 1,3 GB |
- **Carga inicial < 40 MB** (JS + menú + celda de inicio con LOD bajo); **jugable en ≤ 10 s** con 50 Mbps
  y ≤ 20 s en caché fría con 20 Mbps **[SUPUESTO]**. El resto se descarga en segundo plano.
- **Celdas:** 128 × 128 m, ≤ 2 MB comprimidas cada una (glTF Meshopt + KTX2 + datos de colocación).
  Radio de carga 5×5 celdas (visual) y 3×3 (simulación) **[SUPUESTO]**.
- **Hitch al cruzar celdas:** ningún frame > 33 ms y trabajo del hilo principal ≤ 4 ms/frame para
  streaming (el resto en Workers, subida a GPU repartida entre frames).
- **Memoria JS estable** tras 10 min recorriendo el mundo (las celdas se `dispose()`an).
  Límites duros: ≤ 1 luz direccional con sombra (CSM de ≤ 3 cascadas en Alto, 1 en Bajo); ≤ 4 luces dinámicas visibles; ≤ 40 enemigos de mundo activos a la vez.

## Sistemas principales
- **Recursos del jugador:** Vida, Aguante (ataques fuertes, esquivar, bloquear) y Maná (hechizos), que se regenera lentamente.
- **Armas (MVP: 3)** **[SUPUESTO]**
  | Arma | Papel | Rasgos |
  |---|---|---|
  | Espada y escudo | Equilibrada | Combo de 3 golpes, bloqueo, contraataque tras bloquear a tiempo (parry) |
  | Martillo de guerra a dos manos | Lenta y pesada | Mucho daño, rompe guardias y escudos, ataque cargado en área |
  | Arco | A distancia | Apuntar con clic derecho, carga de tensión, flechas limitadas que se recogen |
- **Magias (MVP: 3 escuelas)** **[SUPUESTO]**
  | Hechizo | Elemento | Efecto |
  |---|---|---|
  | Bola de fuego | Fuego | Proyectil con explosión en área y quemadura (daño en el tiempo) |
  | Lanza de escarcha | Hielo | Ralentiza; si se acumula, congela (el siguiente golpe contundente hace daño extra) |
  | Destello sagrado | Luz | Cura al jugador y hace daño extra a no-muertos |
- **Interacciones elementales:** fuego derrite la congelación (gran daño); los esqueletos son débiles a lo
  contundente (martillo) y a la luz; los enemigos con escudo resisten las flechas de frente.
- **Enemigos (MVP)** **[SUPUESTO]**: esqueleto guerrero (cuerpo a cuerpo), goblin arquero (a distancia,
  huye si te acercas), cultista mago (lanza hechizos y crea escudos) y un jefe: caballero no-muerto
  con dos fases. En el mundo aparecen en grupos pequeños (patrullas, campamentos); el jefe solo en el dungeon.
- **Exploración:** a pie y a caballo (el caballo se invoca/está cerca en el mundo; no se monta dentro del
  dungeon **[SUPUESTO]**). Puntos de interés (campamentos, ruinas, torres, cofres con monedas) para dar
  motivos de recorrido. Sin mapa complejo: brújula/marcador en el HUD y minimapa simple **[SUPUESTO]**.
- **Dungeons:** el sistema de oleadas es **genérico y data-driven** (`juego/src/config/`: lista de oleadas,
  composición, jefe, recompensas, entorno). El MVP incluye uno: "Patio del castillo en ruinas".
  Entrada desde el mundo (portón/puerta interactuable) → pantalla de carga → **instancia separada**; el
  mundo se **congela y descarga** salvo la celda de la entrada, que se restaura al salir **[SUPUESTO]**.
  Salir: victoria (tras el jefe) o abandonar desde pausa (pierde el progreso de oleadas).
- **Progresión:** se desbloquean armas/hechizos y mejoras sencillas (daño, coste de maná) con las
  monedas que sueltan los enemigos. **Tienda de mejoras:** entre oleadas dentro del dungeon (como estaba
  previsto) y un mercader fijo en un asentamiento del mundo **[SUPUESTO]**. Sin inventario complejo en el MVP.

## Alcance
- **Dentro del MVP:**
  - **Mundo abierto acotado** ≈ 1–2 km² en 3–4 zonas/biomas conectados (p. ej. bosque oscuro, páramo,
    ciénaga, colinas con ruinas), con un asentamiento y 8–12 puntos de interés **[SUPUESTO]**.
  - Recorrido a pie y a caballo; enemigos de mundo; streaming por celdas; clima/niebla fijos por zona.
  - **Dungeon "Patio del castillo en ruinas"**: 5 oleadas + jefe, como instancia cargada desde el mundo.
  - 3 armas, 3 hechizos, 4 tipos de enemigo; HUD (vida/aguante/maná, arma y hechizos activos con su
    tiempo de recarga, brújula/minimapa); menú principal, pausa, ajustes, pantalla de victoria/derrota;
    tienda de mejoras; sonido y música; guardado de partida en `localStorage`.
- **Fuera del MVP:** multijugador, mundo mayor que el MVP, ciclo día/noche dinámico completo (solo
  momento del día fijo por zona), clima dinámico, misiones/diálogos complejos (como mucho 1–2 encargos
  simples de "ve y limpia"), inventario y crafteo, más de 1 dungeon (el sistema los permite, el contenido
  no entra), *floating origin* (innecesario si el mundo cabe en precisión f32), guardar partida en la
  nube, editor de personaje, móvil, agua con simulación (solo plano con shader barato), destrucción del terreno.

## Estilo visual y sonoro
- **Fantasía oscura realista. NO low-poly, NO cartoon.** Referencias de tono y calidad visual:
  *The Witcher 3* y *The Blood of Dawnwalker* — mundo medieval sucio y creíble, proporciones humanas
  realistas, materiales PBR detallados (piedra húmeda, cuero gastado, acero con arañazos, tela sucia),
  iluminación cinematográfica, niebla y atmósfera densa.
- Son referencias de **sensación**, no de contenido: no se copia nada de esos juegos; todo es original.
- Paleta desaturada y fría (grises piedra, verde musgo, marrón cuero) con acentos por elemento:
  fuego naranja, hielo cian, luz dorada.
- Iluminación: noche con luna fría + antorchas cálidas, entorno HDRI, sombras suaves, niebla
  volumétrica aproximada (la niebla de distancia también oculta el cambio de LOD), polvo y ceniza.
- Postproceso: tonemapping AgX/ACES, bloom contenido, SSAO, gradación de color, viñeta ligera;
  profundidad de campo solo en menús/cinemáticas.
- Realismo dentro de los límites del navegador: el "look" sale sobre todo de **iluminación, materiales
  y postproceso**, no del número de polígonos. Presets de calidad Bajo/Medio/Alto/Ultra.
- Los hechizos deben verse a simple vista: partículas, luz y destellos legibles sin saturar la pantalla.
- Música orquestal/folk medieval; golpes con peso.

## Stack (por defecto; el arquitecto puede cambiarlo con un ADR)
- Vite + TypeScript estricto + Three.js (WebGLRenderer; el arquitecto puede valorar WebGPURenderer con un ADR)
- Postproceso: `postprocessing` (pmndrs) o el EffectComposer de Three.js; sombras en cascada (CSM) limitadas
- Física y colisiones: Rapier (`@dimforge/rapier3d-compat`) para personaje, proyectiles y hitboxes
- ECS ligero (miniplex o propio); animaciones con `AnimationMixer` (glTF) y máquina de estados de animación
- UI: DOM/HTML+CSS sobre el canvas
- Assets: glTF/GLB (Meshopt) con LOD y texturas KTX2 en sets PBR (color, normal, rugosidad/metal, AO).
  Fuentes y licencias: ver `.claude/agents/artista-3d.md`. Los packs low-poly solo valen como
  placeholder temporal de gameplay, nunca como arte final.
- Tests: Vitest (fórmulas de daño, elementos, recursos, streaming) + Playwright (e2e en navegador)
- **Técnicas de mundo abierto** (el arquitecto debe formalizarlas en ADRs antes de implementar):
  - **Streaming por celdas** con carga/descarga asíncrona, cola priorizada por distancia y `dispose()` completo.
  - **Terreno** por heightmap con LOD (clipmaps o quadtree) y *splatting* de materiales PBR (4 capas máx.).
  - **Vegetación y rocas** con `InstancedMesh`/`BatchedMesh`; **impostores** (billboards) para lejanía; LOD de modelos.
  - **Culling:** frustum + distancia + oclusión simple solo si compensa (p. ej. interiores/colinas).
  - **Simulación local:** física Rapier e IA solo en celdas cercanas; enemigos lejanos dormidos
    (estado mínimo, sin física ni animación); **navmesh por celda**.
  - **Workers:** decodificación de glTF/KTX2, generación de mallas/colisiones y navmesh fuera del hilo principal.
  - **Persistencia:** estado del mundo (celdas despejadas, cofres, posición, caballo) en `localStorage`.
  - **Dungeons:** escena aparte con su propio ciclo de vida; el cargador de oleadas lee datos, no código.

## Restricciones
- Licencias: solo assets propios o CC0/compatibles, con su origen en `juego/public/assets/CREDITOS.md`.
- Sin backend: progreso, estado del mundo y ajustes en `localStorage`.
- Todos los números de combate (daño, costes, tiempos de recarga, resistencias) y de dungeons/oleadas
  van en `juego/src/config/`; los presupuestos de rendimiento, en un único fichero de config verificable.

## Glosario
- **Parry:** bloqueo en el momento justo (ventana ≈ 0,2 s) que aturde al enemigo.
- **Congelado:** estado tras acumular escarcha; el enemigo no actúa y recibe más daño contundente.
- **Celda:** bloque cuadrado del mundo (128 m) que se carga, simula y descarga como unidad.
- **Streaming:** carga/descarga progresiva y asíncrona de celdas según la posición del jugador.
- **Dungeon:** zona instanciada, separada del mundo, con oleadas y jefe definidos por datos.
- **Oleada:** grupo de enemigos que aparece dentro de un dungeon; al limpiarla se abre la tienda.
- **Impostor:** sprite/billboard que sustituye a un modelo 3D lejano para ahorrar triángulos.
- **LOD:** nivel de detalle; versión más simple de un modelo o terreno según la distancia.
- **Aguante:** recurso de acciones físicas; se recupera rápido si no atacas.
