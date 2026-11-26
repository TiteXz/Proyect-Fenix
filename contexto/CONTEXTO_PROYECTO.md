# Contexto del proyecto

> Fuente de verdad del proyecto. Lo marcado como **[SUPUESTO]** es una decisión por defecto: corrígela aquí
> si no te encaja. Máximo ~150 líneas; el detalle va en docs/. Última integración de decisiones: 2026-11-26.

## Elevator pitch
Juego de acción 3D de fantasía medieval para navegador, en un **mundo abierto hiper optimizado**.
El mundo se llama **Bronsil** y la región jugable, **Valdera** (lore en `docs/GDD.md` §10).
El jugador explora a pie y a caballo un reino de fantasía vivo y luminoso y combina **espada
y magia** contra enemigos de mundo y, en los **dungeons** (instancias de oleadas y jefe), contra
hordas organizadas. La gracia está en leer la dirección de cada golpe y alternar espada y hechizos en pleno combate para aprovechar
las debilidades de cada enemigo, y en que todo corra fluido en un navegador.

## Pilares de diseño
1. **Combate con decisiones:** cada arma y cada hechizo tienen un papel claro (alcance, velocidad,
   daño, control). Ninguno sirve para todo.
2. **Arma + magia combinadas:** los combos y las interacciones elementales premian alternar
   (p. ej. congelar con escarcha y rematar con la espada).
3. **Respuesta inmediata:** golpes con peso (hit-stop, retroceso, sonido, partículas) y controles precisos.
4. **Mundo grande que invita a explorar sin perder el combate:** ≈ 2/3 del mapa de GTA V, con puntos
   de interés repartidos; explorar nunca penaliza la fluidez (ningún frame > 33 ms al cruzar zonas).

## Género y perspectiva
- Acción/RPG ligero en **tercera persona**, cámara detrás del hombro controlada con el ratón. **[SUPUESTO]**
- Un jugador, sin multijugador. **[SUPUESTO]**

## Público y plataforma
- Navegadores de escritorio recientes (Chrome/Edge/Firefox/Safari). Móvil fuera del MVP. **[SUPUESTO]**
- Controles: teclado y ratón; mando (Gamepad API) en el hito de pulido.
  - WASD mover · Ratón cámara · Clic izq. ataque · Clic der. bloquear · Espacio esquivar
  - Dirección de ataque/parada: **stick virtual con el ratón mientras hay un botón de combate mantenido** (la cámara no
    orbita entonces; COMBATE §1.1 M-1 a M-4, decisión del usuario) o stick izquierdo en mando (`docs/GUIA_UI.md` §5.1)
  - Q/E/R lanzar hechizo · Rueda ciclar hechizos · Esc pausa
  - F interactuar (entrar al dungeon, recoger, hablar/comprar) · F mantenida montar/desmontar caballo **[SUPUESTO]** (E queda para hechizos)
  - A caballo: Shift galopa. El prototipo ya valida montar/galopar (`prototipo/README.md`).

## Rendimiento "hiper optimizado" (presupuestos medibles; se verifican en CI/Playwright con `renderer.info`)
| Métrica | Bajo | Medio | Alto | Ultra |
|---|---|---|---|---|
| FPS sostenidos (p5 ≥) | 30 (integrada) | 45 | 60 (GPU media) | 60 (GPU alta) |
| Draw calls por frame | ≤ 150 | ≤ 220 | ≤ 300 | ≤ 400 |
| Triángulos visibles | ≤ 0,75 M | ≤ 1,2 M | ≤ 2 M | ≤ 3 M |
| Memoria GPU (texturas+geom.) | ≤ 400 MB | ≤ 600 MB | ≤ 900 MB | ≤ 1,3 GB |
- **Tamaño total** (preset Alto, texturas 2K; 4K solo en piezas protagonistas): MVP ≤ 1,5 GB; juego completo ≤ 3,5 GB.
  Se descarga por zonas bajo demanda y se cachea; el juego debe funcionar si el navegador purga la caché.
- **Carga inicial < 40 MB** (JS + menú + celda de inicio con LOD bajo); **jugable en ≤ 10 s** con 50 Mbps
  y ≤ 20 s en caché fría con 20 Mbps **[SUPUESTO]**. El resto se descarga en segundo plano.
- **Celdas** 128 m: media ≤ 0,5 MB, máx. 2 MB; mundo ≤ 1 GB acumulado, cacheado en IndexedDB **[SUPUESTO]**.
  Radio 5×5 celdas (visual detallado; el horizonte lo da el LOD de terreno) y 3×3 (simulación).
- **Hitch al cruzar celdas:** ningún frame > 33 ms y trabajo del hilo principal ≤ 4 ms/frame para
  streaming (el resto en Workers, subida a GPU repartida entre frames).
- **Memoria JS estable** tras 10 min recorriendo el mundo (las celdas se `dispose()`an).
  Límites duros: ≤ 1 luz direccional con sombra (CSM de ≤ 3 cascadas en Alto, 1 en Bajo); ≤ 4 luces dinámicas visibles; ≤ 40 enemigos de mundo activos a la vez.

## Sistemas principales
- **Recursos del jugador:** Vida, Aguante (ataques fuertes, esquivar, bloquear) y Maná (hechizos), que se regenera lentamente.
- **Armas (MVP: espada + magia; escudo opcional que se equipa)** (decisión del usuario)
  | Arma | Papel | Rasgos |
  |---|---|---|
  | Espada (sola o con escudo) | Equilibrada | Combo de 3 golpes, bloqueo, contraataque tras parada perfecta (parry). Dos configuraciones, solo espada (EP) / espada + escudo (EE), con animaciones distintas |
  - En reserva para más adelante: martillo y arco. Los enemigos sí pueden usar arcos (goblin arquero).
- **Combate cuerpo a cuerpo direccional** (detalle en `docs/COMBATE.md` §1.1; solo afecta al cuerpo a cuerpo):
  - Los ataques llegan por izquierda, derecha, arriba y abajo; la dirección se marca con el stick (virtual con ratón, o físico en mando) y el jugador ataca igual.
  - Parada perfecta: dirección hacia el golpe + bloqueo (L1 en mando) a tiempo. Con la dirección ya mantenida, solo bloqueo normal.
  - Mínimo una animación por dirección, más remates/ejecuciones y contraataque tras parada.
  - **Invulnerabilidad del jugador:** durante los **remates**, el **contraataque** tras parada perfecta y las **habilidades**
    (Estocada de quiebre y Embestida). Los ataques ligero y fuerte normales **no** son invulnerables.
- **Magias (MVP: 3 escuelas)** **[SUPUESTO]**
  | Hechizo | Elemento | Efecto |
  |---|---|---|
  | Bola de fuego | Fuego | Proyectil con explosión en área y quemadura (daño en el tiempo) |
  | Lanza de escarcha | Hielo | Ralentiza; si se acumula, congela (el siguiente golpe de espada hace daño extra) |
  | Destello sagrado | Luz | Cura al jugador y hace daño extra a no-muertos |
- **Interacciones elementales:** fuego derrite la congelación (gran daño); los esqueletos son débiles a la luz
  y a lo **contundente** (vía Tierra y el escudo: Embestida, golpe de escudo tras parada). Escudos y flechas según la
  configuración: **EE** bloquea de frente flechas (−80 %) y hechizos (−50 %); **EP** no los bloquea, solo desvía flechas
  con la hoja (bloqueo ≤ 150 ms antes, de frente) y esquiva el resto (`docs/COMBATE.md` §1.1; el resto de reglas en §1).
- **Enemigos (MVP)** **[SUPUESTO]**: esqueleto guerrero (cuerpo a cuerpo), goblin arquero (a distancia,
  huye si te acercas), cultista mago (lanza hechizos y crea escudos) y un jefe: caballero no-muerto
  con dos fases. En el mundo aparecen en grupos pequeños (patrullas, campamentos); el jefe solo en el dungeon.
  El chamán goblin queda fuera del MVP (fase 2, COMBATE §2.14).
- **NPCs (MVP):** pocos, en asentamientos, con **rutina ligada al ciclo día/noche**. **Se pueden golpear pero no mueren**:
  reaccionan (se quejan, huyen o se cubren) y el mercader deja de vender un rato. Solo el **mercader de la Aldea del Vado
  y un anciano** «reconocen» al protagonista con una frase suelta (bocadillo) la primera vez que lo ven (GDD §10.11 D-8, D-9).
  Fauna en fase 3.
- **Exploración:** a pie y a caballo (el caballo se invoca/está cerca en el mundo; no se monta dentro del
  dungeon **[SUPUESTO]**). Puntos de interés (campamentos, ruinas, torres, cofres con monedas) para dar
  motivos de recorrido. Sin mapa complejo: brújula/marcador en el HUD y minimapa simple **[SUPUESTO]**.
- **Dungeons:** el sistema de oleadas es **genérico y data-driven** (`juego/src/config/`: lista de oleadas,
  composición, jefe, recompensas, entorno). El MVP incluye uno: "Patio del castillo en ruinas".
  Entrada desde el mundo (portón/puerta interactuable) → pantalla de carga → **instancia separada**; el
  mundo se **congela y descarga** salvo la celda de la entrada, que se restaura al salir **[SUPUESTO]**.
  Salir: victoria (tras el jefe) o abandonar desde pausa (pierde el progreso de oleadas).
  Tras liberar al Guardián el dungeon se **rejuega** con el jefe ya derrotado y **botín reducido**.
- **Progresión y economía:** se desbloquean hechizos y mejoras sencillas (daño, coste de maná) con las monedas que sueltan
  los enemigos. **Tienda de mejoras:** entre oleadas dentro del dungeon y **un único mercader fijo en la Aldea del Vado**
  (GDD §10.11 D-6).
- **Bolso mágico (inventario simple del MVP):** casillas fijas, **sin peso**; empieza con **12** y se amplía comprando
  mejoras al mercader (**+4** cada una, cada vez más caras, tope **[SUPUESTO] 28**). Detalle en GDD §5. Sin crafteo ni gestión compleja.
- **Códice:** un solo menú con dos pestañas (elemental / lore).
- **Lore y final en el MVP:** trama mínima. Escena final sencilla: la **voz del Guardián** liberado (unas líneas con subtítulos)
  mientras la cámara muestra el castillo (GDD §10.9 p. 9). La causa de la Pausa solo se insinúa (se decide en fase 2).
  Tras el final el mundo sigue abierto (estado persistente). Pantalla de **créditos** de assets en el juego (CC-BY obliga a atribuir).

## Alcance
- **Dentro del MVP:**
  - **Mundo abierto ≈ 2/3 de GTA V:** ≈ 33 km² de tierra (GTA V ≈ 48 km²) en una cuadrícula de ≈ 6,4 × 8,4 km
    con costa y lagos; **4 biomas: bosque, costa, desierto y monte nevado** con transiciones amplias (~1 km); una **franja costera** separa
    bosque, montaña y desierto del mar; **monte nevado** con macizos escarpados y un **lago glaciar**; 4–5 **islas** a > 1 km de la costa;
    **desierto ampliado** con **oasis** y una **zona rocosa** de mesetas y cañones con la **Ciudad de la Roca** (maravilla):
    ciudad excavada en un macizo, con varios niveles en terrazas alrededor de un **gran pozo central** que los conecta
    (puentes, rampas y torre central) y entrada por un desfiladero; caminos entre asentamientos; 6–7 asentamientos
    (Aldea del Vado, Puerto Gaviota, Caleta, Oasis de Arenal, Refugio del lago, la Ciudad de la Roca y, si cabe, uno más;
    nombres y papel en `docs/GDD.md` §10.1) y 50–70 puntos de interés **[SUPUESTO]**. Terreno y vegetación base **procedurales
    con semilla** (heightmap + reglas de colocación); asentamientos, POI y dungeon colocados a mano.
  - Recorrido a pie y a caballo; enemigos de mundo; NPCs con rutina; streaming por celdas; clima/niebla fijos por zona.
  - **Dungeon "Patio del castillo en ruinas"**: 5 oleadas + jefe, como instancia cargada desde el mundo.
  - **Ciclo día/noche dinámico** (≈ 24 min reales por día **[SUPUESTO]**): sol/luna como única luz direccional
    con sombra, cielo analítico (scattering) y entorno/IBL actualizado de forma escalonada, no cada frame.
  - Espada (con escudo opcional) + 3 hechizos, 4 tipos de enemigo; HUD (vida/aguante/maná, arma y hechizos activos con su
    tiempo de recarga, brújula/minimapa); menú principal, pausa, ajustes, Códice, créditos, pantalla de victoria/derrota;
    tienda de mejoras y bolso; sonido y música; guardado de partida en `localStorage`.
- **Fuera del MVP:** multijugador, mundo mayor de 33 km², clima dinámico completo (lluvia/tormentas
  más allá de lo fijo por bioma), misiones/diálogos complejos (como mucho 1–2 encargos simples de "ve y limpia"),
  inventario complejo por peso y crafteo (el bolso simple sí entra), más de 1 dungeon (el sistema los permite, el contenido
  no entra), nube, editor de personaje, móvil, agua con simulación (solo plano con shader barato), destrucción del terreno.
- **Hoja de ruta tras el MVP** (cada fase se replanifica con `planificador` antes de empezar) **[SUPUESTO]**:
  - **Fase 2:** **sistema de magia por runas** (detalle en `docs/COMBATE.md`): 7 elementos (+Aire), 21 fusiones, combinaciones
    generadas, legendarias y arcanos (Espacio, Tiempo); hechizos de ataque, buffs/debuffs, encantar armas/armaduras,
    invisibilidad, teletransporte, planeo e impulsos (sin vuelo libre); inestabilidad; grimorio + mutación sin perder el
    original; sin bloqueos por nivel (el nivel, que sube sobre todo explorando, cambia coste y fallo); más armas;
    armaduras modulares; crafteo básico (materiales para inscripciones); trama completa y causa de la Pausa; chamán goblin.
  - **Fase 3:** NPCs modulares, casas por kit de piezas, castillo y Ciudad de la Roca con arte final; animales; vegetación mejorada.
  - **Fase 4:** barcos y navegación, pesca, mar mejorado (olas, espuma, reflejos).
  - Contenido **por piezas reutilizables** (atlas compartidos, kits modulares) y magia por componentes para contener el peso.

## Estilo visual y sonoro
- **Fantasía realista luminosa (NO fantasía oscura). NO low-poly, NO cartoon.** Referencias de tono y
  calidad: *Ghost of Tsushima* y *Dragon's Dogma 2* **[SUPUESTO]** — naturaleza viva y colorida, cielos amplios, sensación de aventura
  heroica; proporciones humanas realistas, materiales PBR detallados. Son referencias de **sensación**, no de contenido: todo es original.
- Paleta natural y saturada con acentos por elemento (fuego naranja, hielo cian, luz dorada). Por bioma:
  bosque (verdes intensos, luz filtrada), costa (turquesa, arena clara), desierto (dorados y ocres cálidos),
  monte nevado (blancos limpios, cielos azules), islas (aguas turquesa, calas y arboleda mediterránea). Los dungeons sí pueden ser más sombríos por contraste.
- Iluminación: día dominante con sol cálido y cielo físico; atardeceres dorados; noches claras de luna
  azulada con antorchas. Bruma atmosférica ligera de distancia (oculta el cambio de LOD), sin niebla densa.
- Postproceso: tonemapping AgX/ACES, bloom contenido, SSAO, gradación de color, viñeta muy ligera;
  profundidad de campo solo en menús/cinemáticas.
- El "look" sale sobre todo de **iluminación, materiales y postproceso**, no del número de polígonos. Presets Bajo/Medio/Alto/Ultra.
- Los hechizos deben verse a simple vista: partículas, luz y destellos legibles sin saturar la pantalla.
- Música orquestal/folk medieval; golpes con peso.

## Stack (por defecto; el arquitecto puede cambiarlo con un ADR)
- Vite + TypeScript estricto + Three.js con **`WebGPURenderer` y respaldo automático a WebGL 2** (decisión del usuario,
  2026-11-23; el arquitecto lo formaliza en un ADR). Shaders y materiales propios en **TSL** (sin GLSL a mano)
- Postproceso: pipeline de nodos de Three.js (TRAA, GTAO, bloom, niebla volumétrica por preset); sombras en cascada
  (`CSMShadowNode`) limitadas. Detalle en `contexto/BUENAS_PRACTICAS_JUEGOS_WEB_3D.md`
- Física y colisiones: Rapier (`@dimforge/rapier3d-compat`) para personaje, proyectiles y hitboxes
- ECS ligero (miniplex o propio); animaciones con `AnimationMixer` (glTF) y máquina de estados de animación
- UI: DOM/HTML+CSS sobre el canvas
- Assets: glTF/GLB (Meshopt) con LOD y texturas KTX2 en sets PBR. Fuentes y licencias: `.claude/agents/artista-3d.md`.
  Los packs low-poly solo valen como placeholder temporal de gameplay, nunca como arte final.
- Tests: Vitest (fórmulas de daño, elementos, recursos, streaming) + Playwright (e2e en navegador)
- **Técnicas de mundo abierto** (el arquitecto debe formalizarlas en ADRs antes de implementar):
  - **Streaming por celdas** asíncrono, cola priorizada por distancia y `dispose()` completo.
  - **Floating origin** (recentrar a > 1 km) y **generación procedural con semilla** en Workers: las celdas
    viajan como datos ligeros (alturas, máscaras, POI), no como mallas.
  - **Terreno** por heightmap con LOD (clipmaps o quadtree) y *splatting* PBR (4 capas máx.).
  - **Vegetación y rocas** con `InstancedMesh`/`BatchedMesh`; **impostores** para lejanía; LOD de modelos.
  - **Culling:** frustum + distancia + oclusión simple solo si compensa.
  - **Simulación local:** física e IA solo en celdas cercanas; enemigos y NPCs lejanos dormidos
    (estado mínimo; la rutina de NPCs se calcula por hora del día al despertar); **navmesh por celda**.
  - **Workers:** decodificación de glTF/KTX2, generación de mallas/colisiones y navmesh.
  - **Persistencia (`localStorage`):** celdas despejadas, cofres, posición, caballo, monedas, bolso y su ampliación, mejoras,
    dungeon completado, hora del día, ajustes.
  - **Dungeons:** escena aparte con su propio ciclo de vida; el cargador de oleadas lee datos, no código.

## Restricciones
- Licencias: solo assets propios o CC0/compatibles; todo asset en `juego/public/assets/` lleva su entrada en
  `CREDITOS.md` (lo comprueba `scripts/verificar.sh`).
- Sin backend: progreso, estado del mundo y ajustes en `localStorage`.
- Todos los números de combate, economía (precios, bolso) y dungeons/oleadas van en `juego/src/config/`; los presupuestos de rendimiento, en un único fichero de config verificable.
- **Proceso:** se termina la planificación (`/iniciar`: GDD §1–9, arquitectura, ADR, backlog) antes de escribir código del juego.

## Pendiente de volcar (decisiones 2026-11-25/26)
- GDD §5 y §10.9/§10.11 (bolso, NPCs D-8/D-9, final) y COMBATE §1.1 (invulnerabilidad, stick con ratón) deben reflejar este
  documento durante `/iniciar` (`disenador-juego`, `disenador-combate`). Ante conflicto, manda este fichero.

## Preguntas abiertas (supuesto propuesto; corrígelo si no te encaja)
1. Precio/escalado de las ampliaciones del bolso y de las mejoras: lo fija GDD §5 con curva simple **[SUPUESTO]** (se rellena en config).
2. ¿Qué ocurre al morir? **[SUPUESTO]** reaparecer en el último punto de descanso del mundo (o inicio de oleada en dungeon), sin perder monedas; se cierra en GDD §3.
3. ¿Se puede guardar a mano? **[SUPUESTO]** autoguardado en puntos de descanso/asentamientos y al salir; sin guardado manual.
4. ¿La tienda de oleadas vende también ampliaciones de bolso? **[SUPUESTO]** no: solo el mercader del mundo.
5. ¿Cuánto dura el «deja de vender» del mercader golpeado? **[SUPUESTO]** 60 s de tiempo de juego; configurable.
6. Frase de reconocimiento: ¿se repite? **[SUPUESTO]** solo la primera vez (se guarda en la partida).
7. Efecto del Guardián tras liberarlo en mecánicas: **[SUPUESTO]** solo narrativo (sin habilidad nueva) en el MVP.

## Glosario
- **Parry (parada perfecta):** dirección hacia el golpe + bloqueo a tiempo (ventana ≈ 0,2–0,25 s según EE/EP); aturde al enemigo. **Bloqueo normal:** con la dirección ya mantenida.
- **Congelado:** estado tras acumular escarcha; el enemigo no actúa y recibe más daño contundente.
- **Celda:** bloque cuadrado del mundo (128 m) que se carga, simula y descarga como unidad.
- **Streaming:** carga/descarga progresiva y asíncrona de celdas según la posición del jugador.
- **Dungeon:** zona instanciada, separada del mundo, con oleadas y jefe definidos por datos.
- **Oleada:** grupo de enemigos dentro de un dungeon; al limpiarla se abre la tienda.
- **Impostor:** sprite/billboard que sustituye a un modelo 3D lejano. **LOD:** versión más simple según la distancia.
- **Aguante:** recurso de acciones físicas; se recupera rápido si no atacas.
