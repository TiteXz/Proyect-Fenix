# Contexto del proyecto

> Fuente de verdad del proyecto. Lo marcado como **[SUPUESTO]** es una decisión por defecto para
> poder empezar: cámbiala aquí antes de `/iniciar` si no te encaja. Máximo ~150 líneas;
> el detalle va en docs/.

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
  - Dirección de ataque/parada: ratón en teclado (WASD solo mueve) o stick izquierdo en mando (detalle en `docs/COMBATE.md` §1.1 y `docs/GUIA_UI.md` §5.1)
  - Q/E/R lanzar hechizo · Rueda ciclar hechizos · Esc pausa
  - F interactuar (entrar al dungeon, recoger) · F mantenida montar/desmontar caballo **[SUPUESTO]** (E queda para hechizos)
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
  | Espada (sola o con escudo) | Equilibrada | Combo de 3 golpes, bloqueo, contraataque tras parada perfecta (parry). Dos configuraciones, solo espada / espada + escudo, con animaciones distintas según cuál lleves |
  - En reserva para más adelante: martillo y arco. Los enemigos sí pueden usar arcos (goblin arquero).
- **Combate cuerpo a cuerpo direccional** (detalle en `docs/COMBATE.md` §1.1; solo afecta al cuerpo a cuerpo):
  - Los ataques llegan por izquierda, derecha, arriba y abajo; la dirección se marca con el stick izquierdo y el jugador ataca igual.
  - Parada perfecta: stick hacia el golpe + L1 a tiempo. Con el stick ya mantenido, solo bloqueo normal.
  - Mínimo una animación por dirección, más remates/ejecuciones y contraataque tras parada.
- **Magias (MVP: 3 escuelas)** **[SUPUESTO]**
  | Hechizo | Elemento | Efecto |
  |---|---|---|
  | Bola de fuego | Fuego | Proyectil con explosión en área y quemadura (daño en el tiempo) |
  | Lanza de escarcha | Hielo | Ralentiza; si se acumula, congela (el siguiente golpe de espada hace daño extra) |
  | Destello sagrado | Luz | Cura al jugador y hace daño extra a no-muertos |
- **Interacciones elementales:** fuego derrite la congelación (gran daño); los esqueletos son débiles a la luz
  y a lo **contundente** (vía Tierra y el escudo: Embestida, golpe de escudo tras parada). Escudos y flechas según la
  configuración: **EE** bloquea de frente flechas (−80 %) y hechizos (−50 %); **EP** no los bloquea, solo desvía flechas
  con la hoja (L1 ≤ 150 ms antes, de frente) y esquiva el resto (`docs/COMBATE.md` §1.1; el resto de reglas en §1).
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
  - **Mundo abierto ≈ 2/3 de GTA V:** ≈ 33 km² de tierra (GTA V ≈ 48 km²) en una cuadrícula de ≈ 6,4 × 8,4 km
    con costa y lagos; **4 biomas: bosque, costa, desierto y monte nevado** con transiciones amplias (~1 km); una **franja costera** separa
    bosque, montaña y desierto del mar; **monte nevado** con macizos escarpados y un **lago glaciar**; 4–5 **islas** a > 1 km de la costa;
    **desierto ampliado** con **oasis** y una **zona rocosa** de mesetas y cañones con la **Ciudad de la Roca** (maravilla):
    ciudad excavada en un macizo, con varios niveles en terrazas alrededor de un **gran pozo central** que los conecta
    (puentes, rampas y torre central) y entrada por un desfiladero; caminos entre asentamientos; 6–7 asentamientos
    (Aldea del Vado, Puerto Gaviota, Caleta, Oasis de Arenal, Refugio del lago, la Ciudad de la Roca y, si cabe, uno más;
    nombres y papel en `docs/GDD.md` §10.1) y 50–70 puntos de interés **[SUPUESTO]**. Terreno y vegetación base **procedurales
    con semilla** (heightmap + reglas de colocación); asentamientos, POI y dungeon colocados a mano.
  - Recorrido a pie y a caballo; enemigos de mundo; streaming por celdas; clima/niebla fijos por zona.
  - **Dungeon "Patio del castillo en ruinas"**: 5 oleadas + jefe, como instancia cargada desde el mundo.
  - **Ciclo día/noche dinámico** (≈ 24 min reales por día **[SUPUESTO]**): sol/luna como única luz direccional
    con sombra, cielo analítico (scattering) y entorno/IBL actualizado de forma escalonada, no cada frame.
  - Espada (con escudo opcional) + 3 hechizos, 4 tipos de enemigo; HUD (vida/aguante/maná, arma y hechizos activos con su
    tiempo de recarga, brújula/minimapa); menú principal, pausa, ajustes, pantalla de victoria/derrota;
    tienda de mejoras; sonido y música; guardado de partida en `localStorage`.
- **Fuera del MVP:** multijugador, mundo mayor de ≈ 33 km², clima dinámico completo (lluvia/tormentas
  más allá de lo fijo por bioma), misiones/diálogos complejos (como mucho 1–2 encargos
  simples de "ve y limpia"), inventario y crafteo, más de 1 dungeon (el sistema los permite, el contenido
  no entra), guardar partida en la
  nube, editor de personaje, móvil, agua con simulación (solo plano con shader barato), destrucción del terreno.
- **Hoja de ruta tras el MVP** (cada fase se replanifica con `planificador` antes de empezar) **[SUPUESTO]**:
  - **Fase 2:** **sistema de magia por runas** (detalle en `docs/COMBATE.md`): 7 elementos (+Aire), 21 fusiones, combinaciones
    generadas, legendarias y arcanos (Espacio, Tiempo); hechizos de ataque, buffs/debuffs, encantar armas/armaduras,
    invisibilidad, teletransporte, planeo e impulsos (sin vuelo libre); inestabilidad; grimorio + mutación sin perder el
    original; sin bloqueos por nivel (el nivel, que sube sobre todo explorando, cambia coste y fallo); más armas;
    armaduras modulares; inventario y crafteo básico (materiales para inscripciones).
  - **Fase 3:** NPCs modulares, casas por kit de piezas, castillo y Ciudad de la Roca con arte final; animales; vegetación mejorada.
  - **Fase 4:** barcos y navegación, pesca, mar mejorado (olas, espuma, reflejos).
  - Contenido **por piezas reutilizables** (atlas compartidos, kits modulares) y magia por componentes para contener el peso.

## Estilo visual y sonoro
- **Fantasía realista luminosa (NO fantasía oscura). NO low-poly, NO cartoon.** Referencias de tono y
  calidad: *Ghost of Tsushima* y *Dragon's Dogma 2* **[SUPUESTO]** — naturaleza viva y colorida, cielos amplios, sensación de aventura
  heroica; proporciones humanas realistas, materiales PBR detallados (piedra, madera, cuero, acero, tela).
- Son referencias de **sensación**, no de contenido: no se copia nada de esos juegos; todo es original.
- Paleta natural y saturada con acentos por elemento (fuego naranja, hielo cian, luz dorada). Por bioma:
  bosque (verdes intensos, luz filtrada), costa (turquesa, arena clara), desierto (dorados y ocres cálidos),
  monte nevado (blancos limpios, cielos azules), islas (aguas turquesa, calas y arboleda mediterránea). Los dungeons sí pueden ser más sombríos por contraste.
- Iluminación: día dominante con sol cálido y cielo físico; atardeceres dorados; noches claras de luna
  azulada con antorchas. Bruma atmosférica ligera de distancia (oculta el cambio de LOD), sin niebla densa.
- Postproceso: tonemapping AgX/ACES, bloom contenido, SSAO, gradación de color, viñeta muy ligera;
  profundidad de campo solo en menús/cinemáticas.
- Realismo dentro de los límites del navegador: el "look" sale sobre todo de **iluminación, materiales
  y postproceso**, no del número de polígonos. Presets de calidad Bajo/Medio/Alto/Ultra.
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
- Assets: glTF/GLB (Meshopt) con LOD y texturas KTX2 en sets PBR (color, normal, rugosidad/metal, AO).
  Fuentes y licencias: ver `.claude/agents/artista-3d.md`. Los packs low-poly solo valen como
  placeholder temporal de gameplay, nunca como arte final.
- Tests: Vitest (fórmulas de daño, elementos, recursos, streaming) + Playwright (e2e en navegador)
- **Técnicas de mundo abierto** (el arquitecto debe formalizarlas en ADRs antes de implementar):
  - **Streaming por celdas** con carga/descarga asíncrona, cola priorizada por distancia y `dispose()` completo.
  - **Floating origin** (recentrar a > 1 km) y **generación procedural con semilla** en Workers: las celdas
    viajan como datos ligeros (alturas, máscaras, POI), no como mallas.
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

## Decisiones del usuario (2026-11-25) sobre las antiguas preguntas abiertas
- **Lore en el MVP:** solo 1–2 NPCs que «reconocen» al protagonista con una frase, y una escena final sencilla. El resto de la trama pasa a fase 2/3.
- **Post-final:** el mundo sigue abierto tras liberar al Guardián (estado persistente); el dungeon se **rejuega** con el jefe ya derrotado y **botín reducido**.
- **Mercaderes:** **uno fijo, en la Aldea del Vado** (GDD §10.11 D-6).
- **Códice vs. lore:** un solo menú, el **Códice**, con dos pestañas (elemental / lore).
- **Chamán goblin:** fuera del MVP (fase 2, COMBATE §2.14); ficha pendiente.
- **Bolso mágico:** inventario de **casillas fijas, sin peso** [número de casillas SUPUESTO; detalle en GDD §5].
- **Fauna y NPCs:** se mantienen los supuestos de GDD §10.11 (fauna en fase 3; NPCs quietos y no atacables).
- **Ratón en combate:** stick virtual con botón mantenido (COMBATE §1.1 M-1 a M-4).
- **Créditos de assets:** todo asset que entre en `juego/public/assets/` lleva su entrada en `CREDITOS.md` (lo comprueba
  `scripts/verificar.sh`), y el MVP incluye una **pantalla de créditos** en el juego (CC-BY obliga a atribuir).
- **Proceso:** se termina la planificación (`/iniciar`: GDD §1–9, arquitectura, ADR, backlog) antes de escribir código del juego.

## Decisiones del usuario (2026-11-26)
- **Bolso mágico:** empieza con **12 casillas** y se **amplía comprando mejoras al mercader** (+4 casillas cada una, cada vez
  más caras, tope [SUPUESTO] 28). Sustituye al «número de casillas SUPUESTO» anterior.
- **Escena final:** la cuenta la **voz del Guardián** liberado (unas líneas con subtítulos) mientras la cámara muestra el castillo (GDD §10.9 p. 9).
- **Reconocimiento (D-8):** lo hacen el **mercader de la Aldea del Vado y un anciano**, con una frase suelta (bocadillo de
  texto) la primera vez que ven al protagonista.
- **Vida de los NPCs (D-9):** tienen **rutina con el ciclo día/noche** y **se pueden golpear**, pero **no mueren**: reaccionan
  (se quejan, huyen o se cubren) y el mercader deja de vender durante un rato. Sustituye al supuesto «quietos, no atacables».
- **Causa de la Pausa (GDD §10.9 p. 1):** no se explica en el MVP; solo se insinúa. Se decide en fase 2.
- **Invulnerabilidad al atacar (COMBATE §1.1, remates):** el jugador es invulnerable durante los **remates**, el
  **contraataque** tras parada perfecta **y las habilidades** (Estocada de quiebre y Embestida). Los ataques ligero y
  fuerte normales **no** son invulnerables.
- Falta volcarlas en GDD §5 y §10.9/§10.11 y en COMBATE §1.1 (`disenador-juego`, `disenador-combate`) durante `/iniciar`.

## Glosario
- **Parry (parada perfecta):** stick hacia el golpe + L1 a tiempo (ventana ≈ 0,2 s); aturde al enemigo. **Bloqueo normal:** con el stick ya mantenido.
- **Congelado:** estado tras acumular escarcha; el enemigo no actúa y recibe más daño contundente.
- **Celda:** bloque cuadrado del mundo (128 m) que se carga, simula y descarga como unidad.
- **Streaming:** carga/descarga progresiva y asíncrona de celdas según la posición del jugador.
- **Dungeon:** zona instanciada, separada del mundo, con oleadas y jefe definidos por datos.
- **Oleada:** grupo de enemigos que aparece dentro de un dungeon; al limpiarla se abre la tienda.
- **Impostor:** sprite/billboard que sustituye a un modelo 3D lejano para ahorrar triángulos.
- **LOD:** nivel de detalle; versión más simple de un modelo o terreno según la distancia.
- **Aguante:** recurso de acciones físicas; se recupera rápido si no atacas.
