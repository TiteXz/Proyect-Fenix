# Contexto del proyecto

> Fuente de verdad del proyecto. Lo marcado como **[SUPUESTO]** es una decisión por defecto para
> poder empezar: cámbiala aquí antes de `/iniciar` si no te encaja. Máximo ~150 líneas;
> el detalle va en docs/.

## Elevator pitch
Juego de acción 3D de fantasía medieval para navegador. El jugador combina **armas cuerpo a cuerpo,
a distancia y magia** para superar oleadas de enemigos y jefes en un reino oscuro. La gracia está en
cambiar de arma y de hechizo en mitad del combate para aprovechar las debilidades de cada enemigo.

## Pilares de diseño
1. **Combate con decisiones:** cada arma y cada hechizo tienen un papel claro (alcance, velocidad,
   daño, control). Ninguno sirve para todo.
2. **Arma + magia combinadas:** los combos y las interacciones elementales premian alternar
   (p. ej. congelar con escarcha y romper con la maza).
3. **Respuesta inmediata:** golpes con peso (hit-stop, retroceso, sonido, partículas) y controles precisos.

## Género y perspectiva
- Acción/RPG ligero en **tercera persona**, cámara detrás del hombro controlada con el ratón. **[SUPUESTO]**
- Un jugador. Sin multijugador. **[SUPUESTO]**

## Público y plataforma
- Navegadores de escritorio recientes (Chrome/Edge/Firefox/Safari). Móvil fuera del MVP. **[SUPUESTO]**
- Controles: teclado y ratón; mando (Gamepad API) en el hito de pulido.
  - WASD mover · Ratón cámara · Clic izq. ataque · Clic der. bloquear/apuntar · Espacio esquivar
  - 1-2-3 cambiar arma · Q/E/R lanzar hechizo · Rueda ciclar hechizos · Esc pausa
- Rendimiento objetivo: 60 FPS en un portátil con gráfica integrada; carga inicial < 15 MB.

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
  con dos fases.
- **Progresión:** se desbloquean armas/hechizos y mejoras sencillas (daño, coste de maná) entre oleadas
  con las monedas que sueltan los enemigos. Sin inventario complejo en el MVP.

## Alcance
- **Dentro del MVP:** 1 zona (patio de un castillo en ruinas) con 5 oleadas + jefe; 3 armas, 3 hechizos,
  4 tipos de enemigo; HUD (vida/aguante/maná, arma y hechizos activos con su tiempo de recarga);
  menú principal, pausa, ajustes, pantalla de victoria/derrota; tienda de mejoras entre oleadas;
  sonido y música.
- **Fuera del MVP:** multijugador, mundo abierto, misiones/diálogos, inventario y crafteo, guardar
  partida en la nube, editor de personaje, móvil.

## Estilo visual y sonoro
- **Low-poly estilizado** con paleta oscura y acentos de color por elemento (fuego naranja, hielo cian,
  luz dorado). Iluminación nocturna con antorchas. **[SUPUESTO]**
- Los hechizos deben verse a simple vista: partículas, luz y destellos legibles sin saturar la pantalla.
- Música orquestal/folk medieval; efectos de golpe con peso.

## Stack (por defecto; el arquitecto puede cambiarlo con un ADR)
- Vite + TypeScript estricto + Three.js (WebGLRenderer)
- Física y colisiones: Rapier (`@dimforge/rapier3d-compat`) para el personaje, proyectiles y hitboxes
- ECS ligero (miniplex o propio); animaciones con `AnimationMixer` (glTF) y máquina de estados de animación
- UI: DOM/HTML+CSS sobre el canvas
- Assets: glTF/GLB (Meshopt) y texturas KTX2. Placeholders procedurales hasta tener modelos CC0
  (p. ej. packs low-poly de Kenney o Quaternius)
- Tests: Vitest (fórmulas de daño, elementos, recursos) + Playwright (e2e en navegador)

## Restricciones
- Licencias: solo assets propios o CC0/compatibles, con su origen en `juego/public/assets/CREDITOS.md`.
- Sin backend: progreso y ajustes en `localStorage`.
- Todos los números de combate (daño, costes, tiempos de recarga, resistencias) van en `juego/src/config/`.

## Glosario
- **Parry:** bloqueo en el momento justo (ventana ≈ 0,2 s) que aturde al enemigo.
- **Congelado:** estado tras acumular escarcha; el enemigo no actúa y recibe más daño contundente.
- **Oleada:** grupo de enemigos que aparece en la arena; al limpiarla se abre la tienda.
- **Aguante (stamina):** recurso de acciones físicas; se recupera rápido si no atacas.
