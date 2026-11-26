# Combate — Proyecto Fénix

Documento del rol `disenador-combate`. Todo número marcado **[SUPUESTO]** es una propuesta inicial
para ajustar con simulación y pruebas de juego. Los valores definitivos vivirán como datos tipados en
`juego/src/config/combat/*.ts` y `juego/src/config/runas/` (nunca dentro de los sistemas).

---

## 1. Combate del MVP

Resumen de lo ya fijado en `contexto/CONTEXTO_PROYECTO.md`:
- **Recursos:** Vida, Aguante (ataque fuerte, esquiva, bloqueo; se recupera rápido sin atacar) y Maná (hechizos, regeneración lenta).
- **Arma (decisión del usuario, «por ahora»):** el jugador lleva **espada + magia**; el **escudo es opcional** y se
  equipa. Hay **dos configuraciones**, «solo espada» (EP) y «espada + escudo» (EE), con animaciones y valores propios
  (§1.1). Combo de 3, parada perfecta (≈ 0,2 s con escudo; más generosa sin él). El martillo a dos manos y el arco
  quedan en reserva (§1.2).
- **3 hechizos:** Bola de fuego (explosión + quemadura), Lanza de escarcha (ralentiza, acumula hasta congelar), Destello sagrado (cura y daño extra a no-muertos).
- **Interacciones:** fuego sobre congelado = gran daño; esqueletos débiles a contundente y luz; escudos resisten flechas de frente.
  Ajuste por el cambio de armas (**validado por el usuario**; los números finos se ajustan en playtest):
  - *Esqueletos débiles a contundente:* sin martillo, el contundente llega por **Tierra** (hechizos de Tierra y sus
    fusiones; con Tierra en el arma los golpes de espada cuentan como contundentes, §2.4) y por el **escudo**
    (Embestida y contraataque de EE). Multiplicadores del esqueleto (validados): contundente ×1,5, sagrado ×1,5,
    cortante ×0,8, perforante ×0,5. Así la espada sola rinde menos contra esqueletos, y la respuesta es combinar
    magia (Luz, Tierra) o llevar escudo, sin que ninguna configuración gane en todo.
  - *Escudos resisten flechas de frente:* aplica a quien lleve escudo. **Jugador EE:** bloquea flechas y proyectiles
    de frente (±60°). **Esqueleto guerrero** (lleva escudo): proyectiles físicos de frente ×0,5 (hechizos de Tierra y
    Aire, esquirlas); los elementales entran completos. Por la espalda o los flancos, sin reducción.
  - *Flechas del goblin arquero:* con **EE** se bloquean de frente (§1.1). Con **EP** no hay bloqueo de proyectiles: se
    esquivan o se **desvían con la hoja** (desvío frontal **sin dirección** y con ventana corta; ver §1.1). Así se
    respeta la decisión de que lo direccional es solo cuerpo a cuerpo (desvío validado por el usuario).
- **Enemigos:** esqueleto guerrero, goblin arquero, cultista mago y jefe caballero no-muerto (2 fases).
- Números del MVP (recursos, fórmula, espada, defensa, hechizos, interacciones, enemigos, balance y curva por oleada):
  §1.4–§1.12 (rellenado en /iniciar, 2026-11-26). Lo que no decidió el usuario es [SUPUESTO].

### 1.1 Combate cuerpo a cuerpo direccional (decisión del usuario)

**Ámbito.** Solo cuerpo a cuerpo (espada en sus dos configuraciones; esqueleto guerrero y jefe caballero no-muerto).
Flechas y hechizos **no** tienen dirección: con escudo se bloquean de frente; con la espada sola se esquivan o se
desvían con un desvío frontal sin dirección (ver «Defensa contra proyectiles»).
Referencia de sensación del usuario: el combate direccional de *The Blood of Dawnwalker* (stick izquierdo + L1). Solo
tono: no se copia nada de ese juego.

**Ajustes a lo ya escrito (anotados):**
- «Parry ≈ 0,2 s» (arriba y en `contexto/CONTEXTO_PROYECTO.md`) pasa a ser la **parada perfecta direccional**: 200 ms con
  espada y escudo (250 ms con la espada sola), y además exige dirección correcta y «recién movida». La maqueta
  (`prototipo/maqueta.html`, parada si `blockT < 0,25` en cualquier dirección) no es el juego y no se cambia; el juego
  usa estos valores.
- «L1 mantener = bloquear» de la maqueta y de `docs/GUIA_UI.md` §5.1 se mantiene, pero el bloqueo pasa a tener dirección.
  Con EP se bloquea con la hoja de la espada; con EE, con el escudo.
- El disparador «Al parar» (2.3) se activa solo con **parada perfecta** cuerpo a cuerpo (en las dos configuraciones), no
  con bloqueo normal ni con el desvío de flechas de EP. «Bloquear cura 2 vida» (Luz en armadura, 2.4) vale para
  bloqueo normal y parada perfecta en las dos configuraciones.

#### Configuraciones: solo espada (EP) y espada + escudo (EE) (decisión del usuario: dos configuraciones con animaciones distintas; tabla validada por el usuario; números a ajustar en playtest)
**Cambio (decisión del usuario):** en cualquier momento **fuera de combate** (sin enemigos en alerta), desde el
libro-menú (pestaña Armas del bolso, equipar o quitar el escudo) o con el atajo **cruceta ▲**; no hace falta estar en
un campamento. Con enemigos en alerta se rechaza. Duración del gesto de colgar/descolgar el escudo: 0,6 s [SUPUESTO]. El cambio sustituye **a la vez** el set de animaciones y el
bloque de valores (`juego/src/config/combat/configuraciones.ts`, nombre propuesto). El daño por golpe es el mismo en
las dos; cambian el ritmo, la defensa y los costes.

| Valor | Solo espada (EP) | Espada + escudo (EE) |
|---|---|---|
| Ataque ligero (duración lateral) | 0,60 s (≈ 17 % más rápido) | 0,70 s |
| Aguante por ligero / fuerte | 10 / 22 | 12 / 25 |
| Parada perfecta (ventana) | **250 ms** (15 ticks) | 200 ms (12 ticks) |
| Bloqueo normal: reducción de daño | −60 % | **−80 %** |
| Bloqueo normal: aguante | 0,9 × daño bruto | **0,6 ×** daño bruto |
| Guardia neutra (L1 sin stick; decisión: bloquea el 100 %) | 0 daño, aguante **2,5 ×** bruto [SUPUESTO] | 0 daño, aguante **2,0 ×** bruto [SUPUESTO] |
| Andar con guardia | 50 % de velocidad | 40 % |
| Proyectiles (flechas, hechizos) | No se bloquean. **Desvío con la hoja**: L1 pulsado ≤ 150 ms antes del impacto, de frente (±45°), solo **flechas** ⇒ 0 daño, −8 aguante; si no, daño completo | Bloqueo de frente (±60°): flechas −80 %, hechizos −50 % y su estado al 50 % de acumulación; aguante 0,6 × bruto. Sin parada perfecta contra proyectiles |
| Esquiva: aguante | base | base + 5 (peso del escudo) |
| Lanzar hechizos | Tiempo de lanzamiento −15 % (mano libre) | Base |
| Contraataque tras parada | × 1,5 del ligero, 0,60 s | × 1,5 del ligero, 0,70 s, con golpe de escudo (contundente, empuje 1 m) |
| Habilidad del arma (L1 + R1) | **Estocada de quiebre** (abajo) | **Embestida** (abajo) |

**Por qué ninguna es estrictamente mejor (cálculo rápido con el mismo daño D por golpe y combo de 3 laterales):**
- *DPS sostenido:* EP 3 D / 1,80 s = 1,67 D/s; EE 3 D / 2,10 s = 1,43 D/s ⇒ EP hace un **17 %** más de daño cuerpo a
  cuerpo y lanza un 15 % más rápido (mejor híbrido con magia).
- *Aguante por daño hecho:* EP 10/D; EE 12/D ⇒ EP encadena un 20 % más de golpes por barra.
- *Defensa:* al bloquear un golpe de 20 de daño bruto, EP recibe 8 de vida y gasta 18 de aguante; EE recibe 4 y gasta
  12 ⇒ EE pierde la mitad de vida y un 33 % menos de aguante por golpe bloqueado.
- *Distancia:* EE neutraliza de frente al goblin arquero y al cultista; EP tiene que esquivar o desviar (ventana de
  150 ms) y no puede desviar hechizos.
- *Esqueletos:* EE aporta contundente (Embestida, contraataque); EP depende de Luz o Tierra.

Resultado buscado: EP para quien domina la parada y combina magia; EE para quien bloquea y encara grupos con
enemigos a distancia. Validado con la simulación de §1.11: EP mata antes a goblins y cultistas y EE a esqueletos, y
EE recibe menos daño solo con espada (riesgo: si la parada resulta fácil, EP domina; se ajustaría la ventana de
250 ms o la reducción del −60 %).

#### Habilidad del arma (L1 + R1) por configuración (validadas por el usuario; números a ajustar en playtest)
| | Estocada de quiebre (EP) | Embestida (EE) |
|---|---|---|
| Qué hace | Arranque de 4 m y estocada **perforante** × 1,8 del ligero. **Atraviesa la guardia enemiga** (no rebota). Si el objetivo está en la anticipación de un ataque, lo interrumpe y lo deja **abierto** 0,8 s (ejecutable, sin ventana de contraataque) | Carga de 5 m tras el escudo; golpe **contundente** × 1,0 del ligero, empuje 2 m, **rompe la guardia** y aturde 0,6 s a los enemigos del frente (cono frontal de 90°, máx. 3) |
| Aguante / recarga | 30 / 6 s | 35 / 8 s |
| Duración (anticipación / activo / recuperación) | 0,75 s (0,20 / 0,15 / 0,40) | 1,10 s (0,25 / 0,45 / 0,40) |
| Papel | Duelo y castigo contra un enemigo que telegrafía; premia leer la anticipación | Grupos y control: abre esqueletos y aparta al jefe |

Las dos siguen las decisiones del usuario: sin bloqueo ni parada durante la habilidad e ignoran la dirección del
stick. **Invulnerabilidad (decisión del usuario, 2026-11-26):** el jugador es invulnerable durante **toda** la
habilidad, del primer tick de la anticipación al último de la recuperación (Estocada 0,75 s = 45 ticks; Embestida
1,10 s = 66 ticks), igual que en remates y contraataque (§1.7).

#### Lectura de la dirección [SUPUESTO salvo lo marcado como decisión]
| Regla | Valor |
|---|---|
| Fuente (decisión) | **Mando:** stick izquierdo (el de mover), leído en el **instante de pulsar** L1 o R1. **Teclado + ratón (decisión del usuario):** el **ratón** marca la dirección del ataque y de la guardia, no WASD (WASD solo mueve); detalle en «Mapeo teclado y ratón» |
| Marco de referencia | Pantalla/cámara: arriba = golpe que baja desde arriba; abajo = golpe bajo que sube; izq./der. = lado de la pantalla por el que **entra** el golpe. Igual para atacar y para defender (con objetivo fijado la cámara mira al enemigo, así que coincide) |
| Zona muerta | Inclinación < 0,5 ⇒ **neutro** (sin dirección) |
| Sectores | 4 de 90° centrados en los ejes; histéresis de 10° en el borde para que no tiemble en diagonales |
| «Movido justo ahora» | El stick entró en el sector actual (desde neutro u otro sector) **≤ 150 ms** antes de pulsar |
| «Mantenido» | Lleva en ese sector **> 150 ms** al pulsar |
| Movimiento con guardia | Con L1 mantenido el stick orienta la guardia (cambio de dirección 0,10 s, sin coste) y el personaje anda al 50 % (EP) o al 40 % (EE) |

#### Defensa contra golpes cuerpo a cuerpo [SUPUESTO en números]
| Caso | Condición | Resultado |
|---|---|---|
| **Parada perfecta** (decisión) | Dirección = la del golpe, **movida justo ahora**, y L1 pulsado antes del frame activo del golpe dentro de la ventana: **EP 250 ms**, **EE 200 ms** | 0 daño, **0 aguante** (decisión del usuario); enemigo **abierto** (aturdido) 1,2 s (jefe 0,6 s; rendimientos decrecientes de M-20); abre ventana de contraataque |
| **Bloqueo normal** (decisión) | Dirección = la del golpe pero **mantenida**, o pulsación fuera de la ventana | **EP (hoja):** daño −60 %, aguante 0,9 × daño bruto. **EE (escudo):** daño −80 %, aguante 0,6 × daño bruto. No aturde |
| Guardia mal orientada | Dirección ≠ la del golpe | Golpe completo + tambaleo 0,3 s |
| **Guardia neutra** (decisión; L1 sin stick, inclinación < 0,5) | Cualquier dirección | Bloquea **todo** el daño (100 %, también con solo espada) y gasta **mucho** aguante: EP 2,5 × bruto, EE 2,0 × bruto [SUPUESTO]. **Nunca** parada perfecta ni contraataque. No aturde. Con EE también cubre proyectiles de frente (100 %, mismo coste); con EP no |
| L1 + R1 a la vez (decisión) | Ambas en ≤ 80 ms | Habilidad de la configuración; sin bloqueo ni parada; el jugador es **invulnerable** durante toda la habilidad (decisión del usuario, 2026-11-26) |
| Rotura de guardia | El aguante llega a 0 bloqueando | Tambaleo 1,0 s, sin guardia |
| Golpe imparable (jefe) | Señal roja (ver telegrafiado) | No se bloquea ni se para: solo esquiva o una acción invulnerable (§1.7) |
| Antispam | Ventana de parada abierta sin parar nada | La siguiente pulsación en < 400 ms solo puede ser bloqueo normal |

#### Defensa contra proyectiles (sin dirección) (validada por el usuario; números a ajustar en playtest)
| Caso | EP (solo espada) | EE (espada + escudo) |
|---|---|---|
| Flecha de frente (±45° EP / ±60° EE) con L1 | Desvío si L1 se pulsó ≤ 150 ms antes del impacto: 0 daño, −8 aguante. Con L1 pulsado antes: daño completo | Bloqueo: −80 %, aguante 0,6 × bruto (en cualquier momento con L1 mantenido) |
| Hechizo de frente con L1 | Daño completo (solo esquiva, Reflejo o Barrera) | −50 % y estado al 50 % de acumulación |
| Por la espalda o fuera del ángulo frontal | Daño completo | Daño completo |

El desvío de EP comparte el antispam de 400 ms con la parada. La dirección del stick se ignora en los dos casos.

**Contraataque tras parada perfecta (decisión del usuario: daño × 1,5 del ligero):** solo tras parada perfecta
direccional, nunca tras guardia neutra ni bloqueo normal. R1 en ≤ 0,8 s tras la parada ⇒ animación de contraataque de
la configuración (daño **× 1,5** del ligero, sin coste de aguante; EE añade el golpe de escudo contundente).
**Invulnerabilidad (decisión del usuario, igual que en los remates):** el jugador es invulnerable durante **todo** el
golpe de contraataque, desde el primer frame de la anticipación hasta el último de la recuperación: **EP 0,60 s**
(36 ticks), **EE 0,70 s** (42 ticks), aunque haya otros enemigos cerca; sus golpes y proyectiles no le hacen daño ni le
interrumpen. La ventana de invulnerabilidad es exactamente la duración del clip de contraataque de la configuración
(se lee del mismo dato, no es un valor aparte). Pasados los 0,8 s sin pulsar R1, el enemigo sigue abierto pero R1 es un
ataque normal, sin invulnerabilidad.

**Remates / ejecuciones:** un enemigo normal es **ejecutable** si está **aturdido** por Embestida (o Aturdido de
Rayo en fase 2), **Derribado**, **Congelado** o **abierto por la Estocada de quiebre**, **o** si tiene vida ≤ 15 % aunque
no esté aturdido (decisión del usuario). La **parada perfecta** deja al enemigo **abierto para el contraataque**, no
para el remate (salvo que ya tenga vida ≤ 15 %): así el contraataque de C-09 existe contra enemigos normales y no
compite con el remate [corrección de diseño 2026-11-26; antes la parada también hacía ejecutable y el contraataque solo
podía darse contra el jefe]. R1 a ≤ 2,5 m y de frente (±60°) ⇒ remate de la configuración en lugar del ligero (icono
sobre el enemigo; detalle de UI para `interfaz-ui`). Prioridad: remate > contraataque > ataque.
Daño del remate: mata si vida ≤ 15 %; si no, **× 2 del ataque fuerte** [SUPUESTO; corrige × 3, que con la simulación
de §1.11 dejaba a un esqueleto con vida llena por debajo del 15 % tras cualquier aturdimiento]. **Jefe:** solo remate de cierre en fase 2
con vida ≤ 10 % tras una parada perfecta (lo mata); antes, solo contraataque.

**Invulnerabilidad del jugador (decisión del usuario, 2026-11-26; CONTEXTO «Combate cuerpo a cuerpo direccional»):**
invulnerable durante **todo** el clip, del primer tick de la anticipación al último de la recuperación, aunque haya
otros enemigos cerca, en exactamente cuatro acciones: **remate** (humanoide ≤ 1,4 s, jefe ≤ 2,5 s), **contraataque**
tras parada perfecta (EP 0,60 s, EE 0,70 s), **Estocada de quiebre** (0,75 s) y **Embestida** (1,10 s). Los ataques
**ligero y fuerte normales no** son invulnerables, tampoco el R1 normal pasados los 0,8 s de la parada. La duración se
lee del clip de la configuración activa (no es un valor aparte) y se alarga con su hit-stop. Qué significa y la
esquiva: §1.7.

#### Ataque direccional
- R1 (ligero) y mantener R1 (fuerte) usan la dirección leída al pulsar. **R1 neutro** = sigue el combo por defecto
  (der. → izq. → arriba), para quien no use direcciones [SUPUESTO]. Igual en las dos configuraciones; solo cambian las
  animaciones y sus tiempos.
- **Guardia enemiga direccional (decisión del usuario):** los enemigos cuerpo a cuerpo protegen **una** dirección, y la
  dirección del ataque del jugador importa: golpear el lado protegido **se bloquea** (rebote sin daño, retroceso 0,3 s
  para el jugador) y golpear un lado abierto **entra**. Vale igual para el ligero, el fuerte y el R1 neutro (el combo
  por defecto puede rebotar). Detalle [SUPUESTO]:

| Aspecto | Regla |
|---|---|
| Quién la tiene | Esqueleto guerrero (escudo) y jefe caballero no-muerto. El goblin arquero y el cultista mago no tienen guardia direccional (el escudo mágico del cultista es otra regla, §2.14) |
| Cómo se ve (postura) | El escudo o el arma se colocan claramente en el lado protegido: escudo alzado sobre la cabeza = arriba; bajo y adelantado = abajo; cruzado a un lado = izq./der. Legible sin HUD |
| Cómo se ve (indicador) | Con el enemigo fijado, un **arco de escudo** fijo y tenue en el lado protegido, alrededor del enemigo. Forma y color distintos del chevrón de ataque entrante, que siempre tiene prioridad visual. Al cambiar de lado, el arco se desliza durante la transición |
| Cambio de lado: esqueleto | Cada 3,0–4,5 s (RNG con semilla), transición 0,30 s. Tras recibir un golpe por un lado abierto, gira la guardia hacia ese lado 0,6 s después |
| Cambio de lado: jefe | Fase 1: cada 2,5–3,5 s, transición 0,25 s, reacción al golpe 0,45 s. Fase 2: cada 1,8–2,6 s, transición 0,20 s, reacción 0,35 s |
| Huecos | Durante la transición no hay guardia (todo entra). Mientras el enemigo ataca (anticipación, activo y recuperación) tampoco: castigar sus ataques abre siempre |
| Estocada de quiebre (EP) | **Atraviesa** la guardia: hace daño completo por cualquier lado, pero la guardia sigue en su sitio. Si pilla al enemigo en la anticipación, lo abre 0,8 s |
| Embestida (EE) | **Rompe** la guardia: el enemigo queda sin guardia 2,0 s (jefe 1,0 s) y aturdido 0,6 s |
| Fuerte con Tierra en el arma (§2.4) | Rompe la guardia igual que la Embestida (2,0 s / jefe 1,0 s), en cualquier dirección y en las dos configuraciones |

#### Telegrafiado de la dirección enemiga [SUPUESTO; detalle visual para `interfaz-ui` y `director-arte`]
- **Animación:** la anticipación lleva el arma claramente al lado de origen (mín. 0,55 s en enemigos normales, 0,5 s
  en jefe fase 2), legible sin HUD.
- **Indicador:** chevrón en el lado de entrada alrededor del enemigo fijado (o en el borde de pantalla si está fuera
  de cuadro). Aparece al iniciar la anticipación y **destella** al abrirse la ventana de parada de la configuración
  equipada (200 ms antes del impacto con EE, 250 ms con EP). Forma distinta por dirección (no solo color). Imparable:
  indicador rojo con otra forma.
- **Fintas del jefe en fase 2 (decisión del usuario: sí las hace; detalle [SUPUESTO], legibles y no injustas):**
  - *Qué es:* en la anticipación de un golpe del combo de fase 2, el arma va primero a un lado **falso** y gira al lado
    **real**. Anticipación con finta 0,80 s: 0,40 s hacia el lado falso + giro + 0,40 s hacia el real.
  - *Cómo se ve:* el giro es amplio y lento (0,15 s), con un **destello frío** en el filo y el yelmo, un **chasquido
    metálico** propio (distinto del «tic» de la ventana) y el chevrón que **se desliza** del lado falso al real. El
    chevrón del lado falso es hueco y solo se rellena cuando la dirección es definitiva.
  - *Equidad:* la dirección real queda fijada **≥ 0,40 s** antes del activo, por encima de la ventana de parada (250 ms
    EP) más un margen de reacción. Máximo **1 finta por golpe** y **1 por ciclo de 3 ataques**, nunca dos ciclos
    seguidos. Nunca en el imparable ni en el primer combo tras pasar a fase 2. Deja pistas que se aprenden: el jefe
    nunca finta hacia abajo (solo izq., der. o arriba como lado falso).
  - *Castigo al morder:* si el jugador pulsa L1 fresco hacia el lado falso, el antispam (400 ms) le quita la parada
    perfecta, pero puede reorientar la guardia (0,10 s) al lado real y quedarse en **bloqueo normal**. Morder la finta
    cuesta la parada, no la vida entera.
- **Sonido:** silbido de arma con paneo estéreo al lado de entrada (arriba más agudo, abajo más grave) y un «tic»
  metálico al abrirse la ventana; imparable con sonido propio (para `audio`).
- **Accesibilidad:** opción de indicador ampliado y de «guardia asistida» (L1 orienta solo la guardia; sin parada
  perfecta) [SUPUESTO].

#### Mapeo teclado y ratón (decisión del usuario: la dirección la marca el ratón; detalle [SUPUESTO])
| Acción | Mando | Teclado + ratón |
|---|---|---|
| Moverse | Stick izq. | WASD (no marca dirección de combate) |
| Dirección de ataque y guardia | Stick izq. (sin cambios) | **Ratón** (decisión del usuario); mapeo en los supuestos de abajo |
| Bloquear / parada / desvío | L1 | Clic der. (mantener) |
| Atacar ligero / fuerte | R1 / mantener R1 | Clic izq. / mantener |
| Habilidad de la configuración | L1 + R1 a la vez | Clic izq. + der. a la vez, o G (`docs/GUIA_UI.md`) |

**Supuestos del mapeo de ratón** (decididos lo mínimo para no bloquear; a validar en playtest, valores en
`juego/src/config/combat/direccional.ts`):
- **M-1. Stick virtual con botón mantenido (decisión del usuario, 2026-11-25; números [SUPUESTO]):** la dirección
  solo se lee **mientras clic der. o clic izq. están pulsados**. Al pulsar, el stick virtual se pone en el centro; desde
  ahí se acumula el **desplazamiento relativo** del ratón (*pointer lock*), limitado a un radio de **60 px** (escalado
  por la sensibilidad del ajuste, 40–100 px). Desplazamiento < **30 px** (50 % del radio, igual que la zona muerta del
  stick) ⇒ **neutro**; si no, el sector sale de los mismos 4 sectores de 90° con histéresis de 10° del stick. Mientras el
  botón sigue pulsado **no hay recentrado**: la dirección se mantiene hasta que un movimiento nuevo la cambia. Al soltar
  todos los botones de combate, el stick virtual vuelve al centro. Sin botón pulsado, el ratón no marca dirección.
- **M-2. Marco relativo a la cámara/pantalla**, igual que el stick: ratón hacia arriba = arriba, hacia abajo = abajo,
  izq./der. = lado de la pantalla. Respeta la opción «invertir eje Y» del ratón si existe en ajustes.
- **M-3. Lectura según el botón:**
  - **Guardia (clic der.):** al pulsar, guardia **neutra**; desplazar el ratón la orienta (0,10 s, como con el stick) y
    se conserva mientras el botón siga pulsado. **Parada perfecta con ratón:** con el ratón el botón va siempre antes que
    la dirección, así que el instante que cuenta para la ventana (EP 250 ms / EE 200 ms antes del frame activo) es la
    **entrada en el sector** con el botón ya pulsado; «movido justo ahora» = ese cambio de sector ocurrió ≤ **150 ms**
    antes del impacto. Si la dirección ya estaba fijada antes (> 150 ms), es bloqueo normal.
  - **Ataque (clic izq.): pulsar → trazar → soltar.** Se pulsa, se desplaza el ratón y el golpe sale **al soltar** con
    la dirección vigente en ese instante (ligero). Si el botón sigue pulsado al cumplirse el umbral de «mantener» del
    fuerte, sale el **fuerte** con la dirección vigente en ese instante. Sin desplazamiento ⇒ **R1 neutro** (combo por
    defecto). [SUPUESTO: el ligero con ratón sale al soltar, no al pulsar; validar en playtest que la latencia extra no
    estropea la sensación.]
- **M-4. Cámara:** mientras clic der. o clic izq. están pulsados, el ratón **no orbita la cámara** (alimenta el stick
  virtual); al soltar, vuelve a moverla. Con objetivo fijado la cámara mira al enemigo y el ratón queda libre para la
  dirección igual que sin él. Sustituye a la regla anterior de congelar 0,1 s tras cada clic izq.

#### Convivencia con la habilidad del arma (L1 + R1, `docs/GUIA_UI.md` §5.1)
- **Decisión del usuario: la habilidad tiene prioridad sobre la defensa.** Si L1 y R1 se pulsan a la vez (ventana de
  simultaneidad de §5.1, 80 ms [SUPUESTO]), **no hay bloqueo ni parada**: se ejecuta la habilidad de la configuración
  (Estocada de quiebre o Embestida) y nada más. Un golpe que llega **durante** la habilidad no hace daño
  (invulnerable, decisión del usuario 2026-11-26); uno que impactó **antes** de que empezara (en la retención) entra
  completo.
- Si L1 llega solo (R1 no aparece en 80 ms), la dirección y la marca de tiempo de la parada se toman de la **pulsación
  original** (retroactiva), así que la ventana (200 ms EE / 250 ms EP) no pierde nada. Igual para el desvío de flechas de EP.
- Golpe que impacta **durante** la retención: su resolución espera al cierre de la ventana (≤ 80 ms). Si llega R1 ⇒
  habilidad y ese golpe entra completo (impactó antes del primer tick de la habilidad); si no ⇒ se resuelve como
  defensa con la pulsación original de L1.
- La habilidad del arma ignora la dirección del stick.
- Riesgo: el contraataque (R1 tras parar) solo se confunde con L1 + R1 si se pulsa a < 80 ms de L1; tras una parada
  no ocurre porque L1 ya está mantenido > 80 ms (§5.1: entonces R1 es siempre ataque).

#### Animaciones mínimas [SUPUESTO en duraciones; fases en s: anticipación / activo / recuperación]
Cada animación del jugador existe en **dos variantes** (EP y EE); el set se elige por la configuración equipada.

| Animación del jugador | Dirección | EP: duración (fases) | EE: duración (fases) |
|---|---|---|---|
| Ataque ligero | izq. / der. | 0,60 (0,25 / 0,10 / 0,25) | 0,70 (0,30 / 0,10 / 0,30) |
| Ataque ligero | arriba | 0,68 (0,30 / 0,10 / 0,28) | 0,80 (0,35 / 0,10 / 0,35) |
| Ataque ligero | abajo | 0,64 (0,26 / 0,12 / 0,26) | 0,75 (0,30 / 0,12 / 0,33) |
| Ataque fuerte (las 0,20 s iniciales comparten pose con el ligero, §1.6) | 4 | 1,00 (0,50 / 0,12 / 0,38) | 1,10 (0,55 / 0,12 / 0,43) |
| Esquiva (4 direcciones relativas a la cámara) | 4 | 0,45 | 0,45 |
| Guardia (pose en bucle; EP hoja cruzada, EE escudo alzado) | 4 + neutra | entrada 0,08 | entrada 0,10 |
| Parada perfecta (desvío con la hoja / con el escudo) | 4 | 0,35 (0,05 / 0,10 / 0,20) | 0,40 (0,05 / 0,10 / 0,25) |
| Bloqueo normal (impacto en guardia) | 4 | 0,30 | 0,25 |
| Defensa de proyectil: desvío de flecha con la hoja (EP) / bloqueo con el escudo (EE) | frontal | 0,30 (0,04 / 0,08 / 0,18) | 0,25 |
| Contraataque | 1 | 0,60 (0,12 / 0,10 / 0,38) | 0,70 (0,15 / 0,10 / 0,45; golpe de escudo + tajo) |
| Habilidad L1 + R1 | 1 | Estocada de quiebre 0,75 (0,20 / 0,15 / 0,40) | Embestida 1,10 (0,25 / 0,45 / 0,40) |
| Remate humanoide / remate de jefe (sincronizados con la víctima) | — | 1,30 / 2,40 (0,25 / 0,55 / 0,50 · 0,6 / 1,1 / 0,7) | 1,40 / 2,50 (0,30 / 0,60 / 0,50 · 0,6 / 1,2 / 0,7) |
| Guardia rota / tambaleo | — | 1,00 / 0,30 | 1,00 / 0,30 |

| Enemigo | Animación | Dirección | Duración | Fases |
|---|---|---|---|---|
| Esqueleto guerrero | Ataque | izq. / der. | 1,35 | 0,60 / 0,15 / 0,60 |
| | Ataque | arriba | 1,45 | 0,70 / 0,15 / 0,60 |
| | Ataque | abajo | 1,30 | 0,55 / 0,15 / 0,60 |
| | Golpe rebotado en bloqueo | — | 0,30 | — |
| | Reacción a parada (abierto) | — | 1,20 | tambaleo 0,40 + bucle |
| | Reacción a Embestida (guardia rota + empuje) / a Estocada de quiebre (interrumpido) | — | 0,60 / 0,80 | — |
| | Guardia direccional | 4 | entrada 0,15 | — |
| | Recibir remate (humanoide, una variante por configuración) | — | 1,30 (EP) / 1,40 (EE) | sincronizada |
| Jefe caballero no-muerto | Ataque fase 1 | 4 | 1,60 | 0,70 / 0,20 / 0,70 |
| | Combo fase 2 (2 golpes, direcciones distintas) | 2 de 4 | 2,00 | 0,50 / 0,15 / 0,35 + 0,50 / 0,15 / 0,35 |
| | Golpe con finta (fase 2; lado falso → real) | 3 falsos × 4 reales | 1,30 | 0,80 (0,40 falso + 0,40 real) / 0,15 / 0,35 |
| | Imparable | 1 | 1,80 | 0,90 / 0,25 / 0,65 |
| | Reacción a parada | — | 0,60 | — |
| | Recibir remate de cierre (una variante por configuración) | — | 2,40 (EP) / 2,50 (EE) | sincronizada |
| Cultista mago | Empujón de bastón (sin dirección) | — | 1,10 | 0,50 / 0,10 / 0,50 |
| | Recibir remate (reutiliza humanoide, dos variantes) | — | 1,30 / 1,40 | sincronizada |
| Goblin arquero | Recibir remate (humanoide reescalado, dos variantes) | — | 1,30 / 1,40 | sincronizada |

El **cultista mago no es cuerpo a cuerpo** (lanza hechizos y crea escudos): no tiene ataques direccionales; su empujón
de bastón [SUPUESTO] es frontal y se trata como un proyectil (EE lo bloquea de frente; EP lo esquiva). Él y el goblin sí
necesitan «recibir remate».

**Notas técnicas (para `programador-motor` / `programador-gameplay`; no se implementan aquí):** la capa de input debe
guardar la marca de tiempo del último cambio de sector del stick (y del stick virtual del ratón, que solo acumula con
clic der./izq. pulsado, M-1) por tick de 60 Hz; la cámara no orbita con el ratón mientras hay un botón de combate pulsado (M-4); los remates necesitan
animaciones sincronizadas (alineación de raíz atacante/víctima, ≤ 0,15 s de encaje); la retención de 80 ms debe poder
resolverse antes por un impacto entrante. Valores en `juego/src/config/combat/direccional.ts` y
`juego/src/config/combat/configuraciones.ts` (nombres propuestos). **Cambio técnico necesario:** el personaje necesita
un identificador de configuración (`'espada' | 'espadaEscudo'`) que seleccione a la vez el set de clips y el bloque de
valores; los sistemas leen siempre los valores de la configuración activa, nunca constantes. El esqueleto del
personaje debe admitir dos sets de clips (o capas por mano) sin duplicar el modelo.

#### Reglas comprobables (combate)
| ID | Regla | Test |
|---|---|---|
| C-01 | Dirección leída al pulsar, con zona muerta 0,5 y sectores de 90° con histéresis 10° | Unitario: inclinación 0,49 ⇒ neutro; 44° y 46° desde arriba ⇒ arriba / der.; oscilar ±5° en 45° ⇒ no cambia |
| C-02 | «Movido justo ahora» ≤ 150 ms | Cambio de sector 150 ms antes de L1 ⇒ fresco; 167 ms (10 ticks) ⇒ mantenido |
| C-03 | Parada perfecta por configuración | Golpe izq. con stick fresco a izq.: EE con L1 200 ms antes del activo ⇒ 0 daño, 0 aguante, enemigo abierto 1,2 s; 217 ms ⇒ bloqueo normal. EP con 250 ms ⇒ parada; 267 ms ⇒ bloqueo normal |
| C-04 | Bloqueo normal por configuración | Misma dirección mantenida, golpe de 20 bruto: EE ⇒ 4 de daño y 12 de aguante; EP ⇒ 8 de daño y 18 de aguante; ninguno aturde |
| C-05 | Dirección equivocada | Guardia der. contra golpe izq. ⇒ daño completo + tambaleo 0,3 s (las dos configuraciones) |
| C-06 | Solo cuerpo a cuerpo; proyectiles por configuración | Flecha de frente con guardia en cualquier dirección: EE ⇒ −80 %; EP con L1 a 150 ms del impacto ⇒ 0 daño y −8 aguante; EP a 167 ms o con L1 mantenido ⇒ daño completo. Bola de fuego de frente: EE ⇒ −50 % y estado al 50 %; EP ⇒ completa. Nunca hay parada direccional contra proyectiles |
| C-07 | Antispam | Pulsar L1 fresco sin golpe y otra vez a los 300 ms ⇒ no puede haber parada perfecta (ni desvío de EP); a los 400 ms ⇒ sí |
| C-08 | Rotura de guardia | Bloquear con aguante insuficiente ⇒ aguante 0 y tambaleo 1,0 s |
| C-09 | Contraataque (decisiones del usuario: × 1,5 e invulnerable) | R1 a ≤ 0,8 s tras la parada perfecta direccional ⇒ contraataque × 1,5 del ligero, sin aguante (EE además empuja 1 m con daño contundente); a 0,85 s ⇒ ataque normal. Invulnerabilidad: con un segundo esqueleto golpeando y un goblin disparando en el tick 1, en el último tick del clip (EP tick 36 / 0,60 s; EE tick 42 / 0,70 s) ⇒ 0 daño y el contraataque no se interrumpe; el mismo golpe un tick después del final del clip ⇒ daño normal; la duración de la invulnerabilidad es igual a la del clip de contraataque de la configuración activa |
| C-10 | Ejecutable (decisión del usuario; fuentes [SUPUESTO]) | Esqueleto con vida 15 % **sin aturdir**, aturdido por Embestida, Congelado o abierto por Estocada de quiebre ⇒ R1 de frente a ≤ 2,5 m lanza remate; 16 % sin aturdir ⇒ ataque normal; tras parada perfecta con vida 50 % ⇒ R1 lanza **contraataque**, no remate; tras parada con vida 15 % ⇒ remate; jefe solo en fase 2 ≤ 10 % tras parada |
| C-11 | Remate | Vida ≤ 15 % ⇒ muerte; aturdido con más vida ⇒ daño × 2 del fuerte (esqueleto zona 1: 24 × 2 × 0,8 − 1 = 37,4); jugador invulnerable durante toda la animación (decisión del usuario): con 2 esqueletos y 1 goblin golpeando y disparando durante el remate ⇒ 0 daño y la animación no se interrumpe; un ligero o un fuerte normal con un enemigo golpeando ⇒ el jugador sí recibe daño (solo hay invulnerabilidad en remate, contraataque, Estocada y Embestida; C-09, C-25) |
| C-12 | L1 + R1 a la vez = habilidad, sin defensa (decisión del usuario) | L1 fresco a izq. y R1 a 50 ms con golpe izq. llegando a 30 ms ⇒ habilidad, sin parada ni bloqueo, y ese golpe (anterior al primer tick de la habilidad) entra con daño completo; golpe que llega durante la habilidad ⇒ 0 daño (invulnerable, C-25); L1 solo y golpe a 50 ms ⇒ parada con la marca de tiempo original; R1 a 90 ms ⇒ no es habilidad |
| C-13 | Imparable | Golpe rojo del jefe con parada perfecta o bloqueo ⇒ daño completo en las dos configuraciones; esquiva con i-frames ⇒ 0 |
| C-14 | Telegrafiado | Todo ataque cuerpo a cuerpo enemigo emite evento con dirección al empezar la anticipación (≥ 0,55 s antes del activo; jefe fase 2 ≥ 0,5 s) y otro al abrirse la ventana de la configuración equipada (200 ms EE / 250 ms EP); visible en `window.__GAME__` |
| C-15 | Guardia enemiga (decisión del usuario; números [SUPUESTO]) | Ligero o fuerte en la dirección de la guardia del esqueleto ⇒ rebote sin daño y retroceso 0,3 s; otra dirección ⇒ daño; durante la transición de guardia o mientras el enemigo ataca ⇒ cualquier dirección entra. `window.__GAME__` expone la dirección de guardia de cada enemigo. Con semilla fija, el esqueleto cambia de lado entre 3,0 y 4,5 s (jefe fase 1: 2,5–3,5 s; fase 2: 1,8–2,6 s) y, tras un golpe por el lado abierto, gira hacia él a los 0,6 s (jefe 0,45 / 0,35 s). Estocada de quiebre (EP) ⇒ daño por el lado protegido y la guardia no cambia; Embestida (EE) o fuerte con Tierra en el arma ⇒ sin guardia 2,0 s (jefe 1,0 s). Goblin y cultista ⇒ sin guardia direccional |
| C-16 | Teclado + ratón (decisión del usuario: dirección con ratón; umbrales [SUPUESTO] M-1 a M-4) | Mover el ratón sin botón pulsado ⇒ gira la cámara y no cambia la dirección. Clic der. sin mover ⇒ guardia neutra; con clic der. pulsado, 40 px hacia arriba que entran en el sector 100 ms antes del impacto ⇒ parada arriba; los mismos 40 px 300 ms antes ⇒ bloqueo normal arriba, que se mantiene quieto sin volver a neutro; 25 px ⇒ neutro (zona muerta 30 px). Clic izq., 40 px a la izquierda y soltar ⇒ ligero por la izquierda al soltar; clic izq. y soltar sin mover ⇒ R1 neutro. Con un botón de combate pulsado la cámara no gira, con o sin objetivo fijado. Pulsar W, A, S o D no cambia la dirección (solo mueve). Con mando, la dirección sigue saliendo del stick izquierdo (C-01, C-02) |
| C-17 | Disparador «Al parar» | Se activa con parada perfecta cuerpo a cuerpo (EP y EE) y no con bloqueo normal ni con el desvío de flechas de EP |
| C-18 | Animaciones mínimas | El catálogo de clips tiene, **por cada configuración** (EP y EE), 4 ataques ligeros y 4 fuertes direccionales, 4 esquivas, guardia, parada, bloqueo, defensa frontal de proyectil, contraataque, habilidad y remates, y los clips de enemigo de la tabla (recibir remate en las dos variantes) |
| C-19 | Cambiar de configuración cambia animaciones y valores | Equipar el escudo desde el libro ⇒ `window.__GAME__` muestra configuración `espadaEscudo`, el clip activo de ligero lateral dura 0,70 s, la ventana de parada es 200 ms, el bloqueo reduce un 80 % y L1 + R1 lanza Embestida; quitarlo ⇒ `espada`, 0,60 s, 250 ms, 60 % y Estocada de quiebre. Lo mismo con el atajo cruceta ▲ (alterna entre las dos), sin estar en campamento (decisión del usuario). Con un enemigo en alerta el cambio se rechaza, por libro o por atajo, y no cambia nada |
| C-20 | Costes por configuración | Ligero / fuerte: EP 10 / 22 de aguante, EE 12 / 25; esquiva EE = base + 5; lanzamiento de Proyectil (0,4 s) con EP ⇒ 0,34 s, con EE ⇒ 0,40 s |
| C-21 | Habilidades | Estocada de quiebre: −30 aguante, recarga 6 s, perforante × 1,8 del ligero; contra enemigo en anticipación ⇒ ataque cancelado y abierto 0,8 s. Embestida: −35 aguante, recarga 8 s, contundente × 1,0, empuje 2 m, aturde 0,6 s a ≤ 3 enemigos en un cono frontal de 90°. Con recarga activa o sin aguante ⇒ no se lanza, y aun así no hay defensa ni invulnerabilidad (C-12) |
| C-22 | Ninguna configuración domina | Simulación de §1.11 (solo espada, semillas 0–19): contra el mismo objetivo sin defender, DPS de EP > EE; en la oleada 2 (3 esqueletos + 2 goblins), daño recibido por EE < EP. Si una configuración gana en los dos, el test falla |
| C-23 | Guardia neutra (decisión del usuario; multiplicadores [SUPUESTO]) | L1 con inclinación < 0,5 contra golpe de 20 bruto desde cualquier dirección ⇒ 0 daño; aguante −50 (EP, 2,5 ×) o −40 (EE, 2,0 ×); nunca parada perfecta ni contraataque, aunque L1 sea fresco y esté dentro de la ventana; R1 a 0,3 s después ⇒ ataque normal. Aguante insuficiente ⇒ rotura de guardia (C-08) |
| C-24 | Fintas del jefe (decisión del usuario; detalle [SUPUESTO]) | Fase 1 ⇒ 0 fintas. Fase 2 con semilla fija y 30 ataques ⇒ como máximo 1 finta por ciclo de 3 ataques, ninguna en dos ciclos seguidos, ninguna en el imparable ni en el primer combo de la fase; nunca con «abajo» como lado falso. Cada finta emite `finta` con lado falso y lado real en `window.__GAME__`, y la dirección real se fija ≥ 0,40 s antes del activo. L1 fresco hacia el lado real a 250 ms (EP) sin pulsación previa ⇒ parada perfecta; L1 fresco hacia el lado falso y reorientar al real ⇒ bloqueo normal (antispam), nunca daño completo |

#### Preguntas abiertas (combate direccional)
1.1-1. **RESUELTO — L1 sin inclinar el stick:** bloquea el 100 % en todas las direcciones (también con solo espada),
   gasta mucho aguante (EP 2,5 ×, EE 2,0 × bruto [SUPUESTO]) y nunca da parada perfecta (decisión del usuario; C-23).
   El bloqueo direccional sigue compensando: con un golpe de 20 bruto, EP pierde 8 de vida y gasta 18 de aguante
   (frente a 0 de vida y 50 de aguante en neutra); EE pierde 4 de vida y gasta 12 (frente a 0 y 40). La neutra
   protege la vida y vacía la barra unas 3 veces más rápido: sirve de pánico, no para sostener una pelea.
1.1-2. **RESUELTO — Parada perfecta:** no gasta aguante y el contraataque posterior hace **× 1,5** del ligero
   (decisión del usuario; C-03, C-09). Se aplica a la parada perfecta direccional, no a la guardia neutra. Ventanas de
   250 ms (EP) y 200 ms (EE): validadas con la tabla EP/EE; a ajustar en playtest.
1.1-3. **RESUELTO — Guardia enemiga:** los enemigos protegen una dirección; atacar ese lado se bloquea y el lado
   abierto entra (decisión del usuario; C-15). Siguen como [SUPUESTO]: el aspecto (postura y arco de escudo) y los
   intervalos de cambio por enemigo. Estocada de quiebre (atraviesa) y Embestida (rompe): validadas.
1.1-4. **RESUELTO — Remates:** se puede rematar con vida ≤ 15 % aunque el enemigo no esté aturdido, e invulnerabilidad
   total durante la animación de remate o ejecución aunque haya otros enemigos cerca (decisiones del usuario; C-10,
   C-11). Confirmado (2026-11-26): los ataques ligero y fuerte normales **no** son invulnerables (1.1-10).
1.1-5. **RESUELTO — Fintas del jefe en fase 2:** sí las hace (decisión del usuario). Aspecto, límites y equidad: [SUPUESTO] (telegrafiado; C-24).
1.1-6. **RESUELTO — L1 + R1:** se mantiene la combinación con ventana de 80 ms; la habilidad tiene prioridad y no hay
   defensa durante ella (decisión del usuario; C-12).
1.1-7. **RESUELTO — Teclado:** la dirección del ataque y de la guardia se marca con el **ratón**, no con WASD (WASD
   solo mueve). El mando sigue usando el stick izquierdo. El mapeo concreto del ratón es [SUPUESTO] (ver «Mapeo
   teclado y ratón»; C-16).
1.1-8. **RESUELTO — Configuraciones:** cambio en cualquier momento fuera de combate (sin enemigos en alerta), desde el
   libro o con la cruceta ▲, sin necesidad de campamento (C-19). El usuario valida la tabla EP/EE, el desvío de flechas
   con la hoja en EP, las habilidades Estocada de quiebre / Embestida y los multiplicadores y el escudo del esqueleto.
   Los números finos se ajustan en playtest.
1.1-9. **RESUELTO — Invulnerabilidad en el contraataque:** sí, igual que en los remates (decisión del usuario). Dura
   todo el golpe de contraataque (EP 0,60 s, EE 0,70 s), no solo la fase activa; ventana = duración del clip (C-09).
1.1-10. **RESUELTO — Invulnerabilidad en las habilidades (decisión del usuario, 2026-11-26):** Estocada de quiebre y
   Embestida son invulnerables durante todo su clip; ligero y fuerte normales no. Lista cerrada: remate, contraataque,
   Estocada, Embestida (§1.7; C-25).

### 1.2 Reserva para más adelante (decisión del usuario: fuera «por ahora»)
No se borran: quedan como referencia para recuperarlos sin rediseñar desde cero.
- **Martillo a dos manos:** lento, rompe guardias, cargado en área (sin dirección). Valores que tenía en §1.1:
  parada perfecta 150 ms; bloqueo con el mango −60 % y aguante 1,0 × bruto; guardia neutra −60 %; animaciones
  ligero izq./der. 1,20 (0,55 / 0,15 / 0,50), arriba 1,35 (0,65 / 0,15 / 0,55), abajo 1,25 (0,55 / 0,18 / 0,52),
  guardia con el mango entrada 0,15, parada 0,50 (0,08 / 0,12 / 0,30), contraataque 1,00 (0,25 / 0,15 / 0,60),
  remate humanoide / de jefe 1,60 / 2,50; el fuerte rompía la guardia enemiga en cualquier dirección (antigua C-15).
  Habilidad de la maqueta: Terremoto (×2 a congelado, «Hecho añicos»).
- **Arco:** tensión, flechas limitadas que se recogen; con el arco equipado no había guardia direccional (L1 = apuntar).
  Habilidad de la maqueta: Andanada. Las flechas imantadas de la legendaria en reserva *Jardín de hierro* (§2.7)
  dependían de él.
- Al recuperar martillo o arco hay que revisar: contundente frente a esqueletos (§1), rotura de guardia (C-15),
  inscripciones y destino Arma (§2.12), disparador «Al parar» (2.3), las dos configuraciones de la espada y la tabla
  DPS/TTK.

### 1.3 Pendiente de sincronizar
- **`artista-3d`:** modelo `escudo_jugador.glb` y los dos sets de animación EP/EE (C-18; ahora con 4 fuertes y 4
  esquivas por configuración). Requisitos ya en `docs/GUIA_VISUAL.md`.
- **`disenador-juego`:** cambios pedidos al GDD en §1.12.
- **`optimizador-prompt`:** la invulnerabilidad de CONTEXTO («Pendiente de volcar») ya está volcada en §1.1 y §1.7.
- **`interfaz-ui`:** iconos distintos de **remate** y **contraataque** sobre el enemigo (ya no coinciden tras una parada,
  §1.1); señal en el borde de pantalla del goblin tensando y del círculo del cultista fuera de cuadro (§1.10); barra de
  barrera del cultista.

### 1.4 Recursos (`juego/src/config/combat/recursos.ts`) — **acepta** GDD §4.1 [SUPUESTO]
| Recurso | Máx. (mejora, §1.11) | Regeneración | Retardo antes de regenerar | Reglas |
|---|---|---|---|---|
| Vida | 100 (+15 por Vigor; máx. 145) | No | — | Poción +40 en 1,0 s; Destello +20; descanso al 100 % |
| Aguante | 100 (+15 por Fuelle) | 30/s; con guardia mantenida 15/s | 0,8 s desde el último gasto; **1,5 s** tras rotura de guardia | Una acción con coste > aguante actual no empieza; el bloqueo sí (rompe la guardia, C-08). Nunca < 0 |
| Maná | 100 (+15 por Pozo arcano) | 2/s siempre, también lanzando | 0 | Se paga al terminar el lanzamiento; interrumpido ⇒ no se paga ni entra en recarga |

Comprobación: la barra de aguante da 10 ligeros EP (8 EE) o 6 esquivas EP; de 0 a 100 en 0,8 + 3,3 = 4,1 s; atacar
sin parar se sostiene un ≈ 50 % del tiempo (combo de 1,8 s y pausa de 1,8 s). El maná da 5 Bolas de fuego seguidas y
luego 1 cada 10 s: la magia es ráfaga y control, la espada el daño sostenido. Entre oleadas aguante y maná vuelven al
100 % y la vida no (GDD §7.4; ver riesgo en §1.11).

### 1.5 Fórmula de daño (`juego/src/config/combat/formula.ts`)
```
daño = max(1, base × multiplicadorTipo × multiplicadorEstado × crítico − defensa)
base = daño del ataque (§1.6) o hechizo (§1.8) × (1 + 0,08 × nivel de Filo o de Potencia elemental)
       (en enemigos: su golpe × multiplicador de daño de la zona, GDD §6.2)
daño recibido por el jugador = daño × (1 − reducción de bloqueo)   (§1.1; el jugador tiene defensa 0 en el MVP)
```
| Término | Regla |
|---|---|
| multiplicadorTipo | Tabla tipo × enemigo (§1.9). El jugador recibe × 1,0 de todo en el MVP |
| multiplicadorEstado | Del estado **previo** al golpe, que luego se consume: Congelado + golpe físico × 1,5 (contundente × 2); Congelado + fuego × 2 (Vapor). Si no hay estado aplicable, 1 |
| crítico | × 1,5 si el golpe entra por la **espalda** del objetivo (cono trasero de ±45°); si no, × 1,0. Sin azar (determinismo) |
| defensa | Plana por enemigo (§1.10) |
| Excepciones | **Ardiendo** ignora defensa y crítico. La **barrera** del cultista absorbe antes que la vida; el daño físico cuenta × 2 contra ella y lo que sobra pasa a la vida sin duplicar |
| Redondeo | La lógica trabaja con decimales; la UI muestra enteros (redondeo hacia arriba) |

Ejemplos de test (zona 1): ligero EP a esqueleto 12 × 0,8 − 1 = **8,6**; contraataque EE a esqueleto
18 × 1,5 − 1 = **26**; Bola de fuego a goblin congelado 18 × 1,25 × 2 = **45**; ligero por la espalda a cultista
12 × 1,2 × 1,5 = **21,6**; golpe de esqueleto en zona 3 a EE bloqueando 14 × 1,3 × 0,2 = **3,64**.

### 1.6 Espada (`juego/src/config/combat/espada.ts` + `configuraciones.ts`) [SUPUESTO salvo decisiones de §1.1]
| Ataque | Daño base, tipo | Aguante EP / EE | Fases EP / EE (s) | Alcance y hitbox | Retroceso | Hit-stop |
|---|---|---|---|---|---|---|
| Ligero, golpes 1–2 | 12 cortante | 10 / 12 | Tabla de animaciones (lateral 0,60 / 0,70) | Lateral: arco 120°, radio 2,2 m, alto 0,3–1,9 m. Arriba: caja 0,8 × 2,4 m vertical. Abajo: arco 90°, radio 2,0 m, alto 0–1,0 m | 0,3 m | 60 ms |
| Ligero, golpe 3 (cierre) | 15 (× 1,25) cortante | 10 / 12 | Igual que su dirección | Igual | 0,5 m | 60 ms |
| Fuerte | 24 cortante | 22 / 25 | 1,00 (0,50 / 0,12 / 0,38) / 1,10 (0,55 / 0,12 / 0,43) | Arco 150°, radio 2,5 m (arriba: caja 1,0 × 2,6 m) | 0,8 m + tambaleo 0,4 s (no al jefe; interrumpe anticipaciones) | 75 ms |
| Contraataque | 18 (× 1,5 del ligero); EP cortante, EE **contundente** | 0 | 0,60 / 0,70 | Arco 120°, radio 2,3 m | EP 0,5 m / EE 1,0 m | 75 ms |
| Estocada de quiebre (EP) | 21,6 (× 1,8) perforante | 30 | 0,75 (0,20 / 0,15 / 0,40) | Cápsula de radio 0,5 m y 2,8 m al final de un arranque de 4 m | 0,5 m | 75 ms |
| Embestida (EE) | 12 (× 1,0) contundente | 35 | 1,10 (0,25 / 0,45 / 0,40) | Cono de 90° y 2,0 m por delante durante el activo; máx. 3 | 2 m + aturdido 0,6 s | 75 ms |
| Remate | Mata si vida ≤ 15 %; si no, 48 (× 2 del fuerte) cortante | 0 | Tabla de animaciones | Sincronizado, sin hitbox | — | 90 ms en el impacto |

- **Combo:** R1 desde el inicio de la recuperación hasta **0,35 s** después del final del clip (más el buffer de
  0,15 s del GDD) encadena el siguiente golpe; si no, vuelve al golpe 1. La dirección se elige en cada golpe; R1 neutro
  sigue der. → izq. → arriba. El fuerte no forma parte del combo (lo reinicia).
- **Fuerte con mando:** R1 empieza la anticipación del ligero; si sigue pulsado a los **0,20 s**, se ramifica al fuerte
  (sus 0,50 s de anticipación incluyen esos 0,20 s). Con ratón manda M-3.
- **Cancelación (acepta GDD §3.3, precisada):** la esquiva cancela la recuperación del **ligero** desde el **60 %** del
  clip y nunca antes del final del activo (EP lateral: desde 0,36 s; el activo acaba en 0,35 s). Fuerte, contraataque,
  habilidades y remate no se cancelan. Los últimos 0,15 s de la esquiva se cancelan en ataque.
- **Hit-stop (acepta GDD §3.3: ligero 60 ms, fuerte 75 ms, parada perfecta 90 ms, remate 90 ms, jugador golpeado
  60 ms; añade habilidades y contraataque 75 ms):** es **local**: congela el reloj de clip del atacante y de la víctima;
  el resto del mundo sigue. Un golpe que toca a varios aplica un solo hit-stop. Los ticks de hit-stop alargan el clip y,
  con él, la invulnerabilidad. **Cambio técnico (`programador-motor`):** reloj de animación y de fases por entidad.

### 1.7 Esquiva, bloqueo, parada e invulnerabilidad (`juego/src/config/combat/defensa.ts`)
| Acción | Ventana | Invulnerable | Coste | Nota |
|---|---|---|---|---|
| **Esquiva** (acepta GDD §3.3) | 0,45 s, 3,5 m, en 4 direcciones relativas a la cámara | Ticks 3–18 (0,05–0,30 s) | 15 aguante (EE 20) | Evita imparables; dispara «Al esquivar» (2.3) solo si los i-frames evitan un golpe |
| Parada perfecta | EP 250 ms / EE 200 ms antes del activo, dirección fresca | No (anula ese golpe) | 0 | Abre 1,2 s (jefe 0,6 s) para el contraataque (§1.1) |
| Bloqueo normal | Mientras L1 | No | EP 0,9 × / EE 0,6 × bruto | EP −60 %, EE −80 % |
| Guardia neutra | Mientras L1 sin dirección | No | EP 2,5 × / EE 2,0 × bruto | 100 % del daño |
| Desvío de flecha (EP) | L1 ≤ 150 ms antes del impacto | No | 8 | Solo flechas, frontal ±45° |
| Remate, contraataque, Estocada, Embestida (decisión del usuario) | Clip completo (más su hit-stop) | **Sí** | El de la acción | Lista cerrada |

**Invulnerable** significa: ningún daño, estado ni acumulación nuevos, ni empuje ni interrupción; el proyectil que
toca al jugador se consume. Un Ardiendo aplicado **antes** sigue corriendo. Las cuatro acciones invulnerables también
evitan el imparable del jefe (consecuencia de la decisión; riesgo en §1.11).

### 1.8 Hechizos del MVP (`juego/src/config/combat/hechizos.ts`) [SUPUESTO en números]
Datos cerrados en el MVP; en la fase 2 se reexpresan como recetas predefinidas (§2.1) **conservando estos números**.
Lanzar: el jugador anda al 50 %; un golpe recibido (no invulnerable) interrumpe sin gastar maná. La recarga empieza al
terminar el lanzamiento. EP lanza un 15 % más rápido (§1.1). Mejoras de §1.11 sobre daño y coste.

| | Bola de fuego | Lanza de escarcha | Destello sagrado |
|---|---|---|---|
| Maná / recarga | 20 / 1,5 s | 16 / 1,0 s | 30 / 8,0 s |
| Lanzamiento EE (EP) | 0,45 s (0,38 s) | 0,35 s (0,30 s) | 0,50 s (0,43 s) |
| Forma | Proyectil 25 m/s, alcance 30 m, explota al impactar (radio 2,5 m) | Proyectil 40 m/s, alcance 30 m, un objetivo | Pulso centrado en el jugador, radio 5 m, instantáneo |
| Daño | 18 ardiente a todos en el radio | 10 frío | 15 sagrado a enemigos (× 1,5 a no-muertos por tipo) |
| Estado | **Ardiendo** 4 s: min(3 % vida máx., 3)/s × multTipo fuego; renueva, no acumula | **Escarcha +2**: −15 % de velocidad (movimiento y animación) por acumulación, 5 s; a 3 ⇒ **Congelado** 2 s (jefe 1 s) e inmune a Escarcha 3 s después | **Iluminado** 6 s: revela y quita 1 buff al aplicarse (la barrera del cultista); **cura 20** al jugador |
| Papel | Grupos y goblins; detona Congelado (Vapor × 2) | Preparar: 2 lanzas = Congelado ⇒ remate o Vapor; control del jefe | Esqueletos y jefe; curación; rompe la barrera del cultista |

Ajuste a §2.4 para el MVP: Ardiendo tiene tope de 3/s (para que el % de vida máx. no derrita al jefe) y la Lanza aplica
2 acumulaciones (dato del hechizo; en la fase 2, una por pieza de Hielo del núcleo).

**Adquisición (acepta la propuesta del GDD §6.1; encaja con §2.12–§2.13):**
| Hechizo | Cómo | Tinta | Dónde se graba |
|---|---|---|---|
| Bola de fuego | Ya grabada al empezar | 0 | — |
| Lanza de escarcha | Runa aprendida en el Santuario del Arroyo | 1 | En el santuario (cuenta como altar rúnico, ver §1.12) o en cualquier punto de descanso |
| Destello sagrado | Pergamino del mercader (200 monedas; objeto clave) | 1 | Punto de descanso o altar rúnico |

Coherencia con §2.13: grabar cuesta 1 tinta; solo en altares y campamentos (el punto de descanso cuenta como
campamento, GDD §4.2); sin tinta queda como **borrador** visible y no equipable (M-48); cada grabación = 1 hoja del
libro. §2.12 (inscripciones) es de la fase 2, así que en el MVP la tinta solo sirve para esto: las 2 tintas iniciales
bastan justas y el mercader vende 3 al día (15 monedas), así que no hay bloqueo. En el MVP hay 3 ranuras de hechizo (las
6–8 de §2.11 son de la fase 2) y no hay grimorio libre ni mutación.

### 1.9 Interacciones (`juego/src/config/combat/interacciones.ts`)
**Elemento × estado del objetivo** (recarga de reacción por objetivo 1,5 s, §2.5):
| Golpe ↓ / estado → | Sin estado | Escarcha (1–2) | Congelado | Ardiendo |
|---|---|---|---|---|
| Fuego (Bola) | Aplica Ardiendo | **Derrite:** quita la Escarcha, sin extra | **Vapor: × 2** y consume Congelado | Renueva |
| Hielo (Lanza) | +2 Escarcha | +2 (a 3 ⇒ Congelado) | Sin efecto extra | **Apaga** Ardiendo y aplica +2 |
| Luz (Destello) | Iluminado | Iluminado | Iluminado | Iluminado |
| Espada (física) | — | — | **× 1,5** (contundente × 2) y consume Congelado | — |

**Tipo de daño × enemigo** (multiplicadorTipo; > 1 debilidad, < 1 resistencia):
| Enemigo | Cortante | Contundente | Perforante | Ardiente | Frío | Sagrado | Defensa |
|---|---|---|---|---|---|---|---|
| Esqueleto guerrero | 0,8 | **1,5** | 0,5 | 1,0 | 1,0 | **1,5** | 1 |
| Goblin arquero | 1,0 | 1,0 | **1,25** | **1,25** | 1,0 | 1,0 | 0 |
| Cultista mago | **1,2** | 1,0 | **1,25** | 0,5 | **1,25** | 1,0 | 0 |
| Jefe caballero no-muerto | 0,9 | **1,25** | 0,75 | 0,8 | 1,0 | **1,5** | 3 |

Esqueleto: valores validados por el usuario (§1); su escudo reduce × 0,5 los proyectiles **físicos** de frente (en el
MVP no hay ninguno del jugador; Tierra y Aire llegan en la fase 2).

### 1.10 Enemigos (`juego/src/config/combat/enemigos.ts`) [SUPUESTO; valores de zona 1, ×zona del GDD §6.2]
| Enemigo | Vida / vel. | Ataques (daño · fases o cadencia · alcance) | Señal previa | Cómo se contrarresta |
|---|---|---|---|---|
| **Esqueleto guerrero** | 60 / 3,5 m/s | Tajo direccional 14 · tabla de animaciones (anticipación ≥ 0,55 s) · 2,2 m. Uno cada 3,0–3,5 s si tiene el turno de ataque. Guardia direccional (§1.1) | Postura y chevrón por dirección; destello de la ventana de parada | Parada ⇒ contraataque (EE contundente: el mejor); Embestida ⇒ remate; Destello; atacar el lado abierto |
| **Goblin arquero** | 30 / 5,0 m/s (menos que correr) | Flecha 10 · tensar 0,8 s, una cada 2,5 s · 25 m, 30 m/s. Si el jugador está a < 6 m huye a 10–14 m; acorralado, empujón 6 (0,5 / 0,1 / 0,4) | Cuerda que cruje, brillo en la punta e indicador en el borde de pantalla al tensar | Bola de fuego (debilidad + área), EE bloquea de frente, EP desvía o esquiva; Estocada cierra 4 m |
| **Cultista mago** | 45 / 3,0 m/s | Bola de fuego enemiga 14 + Ardiendo · círculo 0,8 s, una cada 4 s · 20 m/s. **Barrera** sobre sí o un aliado a ≤ 12 m: absorbe 30, 8 s, círculo 1,0 s, recarga 12 s. A ≤ 2,5 m: empujón de bastón 8 + empuje 2 m (0,5 / 0,1 / 0,5) | Círculo de runas con color del elemento (§2.14, ≥ 0,5 s) | Un golpe de espada durante el círculo lo **interrumpe** (recarga 3 s); la espada rompe la barrera (× 2); Destello la quita; Lanza (débil a frío); resiste fuego |
| **Jefe caballero no-muerto** | 800 (fase 2 al 50 %) / 4,0 m/s | Fase 1: tajo direccional 22 (0,70 / 0,20 / 0,70), uno cada 3,2 s; cada 4.º ataque, **imparable** 35 (0,90 / 0,25 / 0,65). Fase 2: combo de 2 golpes de 16 con fintas (§1.1), uno cada 2,6 s; imparable cada 4.º. Transición: 3 s sin recibir control, grito que empuja 3 m | Chevrones, fintas legibles (§1.1); imparable en rojo con sonido propio | Parada ⇒ contraataque; Destello (× 1,5); Lanza × 2 ⇒ Congelado 1 s ⇒ Bola (Vapor); Embestida rompe la guardia 1 s; esquiva el imparable |

- **El jefe no usa multiplicador de zona;** los enemigos normales del dungeon usan los de la amenaza 2 (× 1,25 vida,
  × 1,15 daño; GDD §6.3).
- **Turnos de ataque (necesarios para el balance; cambio técnico para `programador-gameplay`):** como máximo **1
  enemigo cuerpo a cuerpo** en ataque a la vez y **1 tirador** (goblin o cultista) tensando o lanzando a la vez; los
  demás rodean a ≥ 4 m o se recolocan. El turno pasa al siguiente al acabar la recuperación. Sin turnos, las oleadas 4–5
  no se pueden superar ni con la mejor estrategia (§1.11). Detección 15 m (cultista y goblin 25 m).

### 1.11 Balance: DPS, TTK, zonas, mejoras y oleadas
**Método.** Simulación a 60 Hz, determinista, 20 semillas por caso (script en
`juego/tools/sim-balance.ts`, a crear por `qa-tester` leyendo los datos de `config/combat/`). Modelo [SUPUESTO]:
jugador competente (parada 50 % EP / 40 % EE, 40 % / 32 % contra el jefe; 15 % de golpes al lado protegido; 15 % de esquivas fallidas), turnos de ataque 1 + 1, aguante y maná como §1.4.

**DPS por acción** (daño tras fórmula / duración de la acción; hechizos: / (lanzamiento + recarga); zona 1):
| Acción | Esqueleto | Goblin | Cultista | Jefe | Límite sostenido |
|---|---|---|---|---|---|
| Ligero EP (combo) | 15,7 | 21,7 | **26,0** | 14,5 | Aguante: ≈ 50 % del tiempo; 1,3 de daño por aguante |
| Fuerte EP | 18,2 | 24,0 | 28,8 | 18,6 | Aguante: 1,1 de daño por aguante; no se cancela |
| Ligero EE (combo) | 13,4 | 18,6 | 22,3 | 12,4 | Igual que EP, −15 % |
| Estocada (EP) | 13,1 | **36,0** | **36,0** | 17,6 | Recarga 6 s |
| Embestida (EE) | 15,5 | 10,9 | 10,9 | 10,9 | Recarga 8 s; abre remate (37,4 a esqueleto) |
| Contraataque EP / EE | 22,3 / **37,1** | 30,0 / 25,7 | 36,0 / 25,7 | 22,0 / **27,9** | Solo tras parada |
| Bola de fuego | 8,7 | **11,5** | 4,6 | 5,8 | Maná: 0,9 de daño por maná + área + Ardiendo |
| Lanza de escarcha | 6,7 | 7,4 | 9,3 | 5,2 | Maná: 0,6 por maná + Congelado (remate o Vapor) |
| Destello sagrado | 2,5 (21,5 por uso) | 1,8 | 1,8 | 2,3 | Maná: 0,5 por maná + cura 20 + quita barrera |

Ninguna acción es la mejor en todo: la Estocada destaca contra goblin y cultista y es la peor contra el esqueleto
(perforante × 0,5); el contraataque EE domina contra el esqueleto; la Bola es el mejor hechizo contra goblins y el peor
contra el cultista; el fuerte gana en DPS bruto pero pierde en daño por aguante y no se cancela.

**TTK por estrategia** (s, enemigo solo, zona 1, sin mejoras; «mixto» = espada + los 3 hechizos con prioridad por
enemigo; objetivo entre paréntesis):
| Enemigo (objetivo) | EP espada | EE espada | EP mixto | EE mixto | Solo Bola | Solo Lanza | Solo Destello |
|---|---|---|---|---|---|---|---|
| Esqueleto (4–7) | 6,0 | **2,5**¹ | 3,9 | 1,6¹ | 5,0 | 8,0 | 16,9 |
| Goblin (3–5, con acercarse) | 4,1 | 6,5 | 3,8 | 3,7 | **2,0** | 2,6 | 8,4 |
| Cultista (3–7) | **3,7** | 7,0 | 3,2 | 6,8 | 21,2 | 6,7 | 16,9 |
| Jefe (90–130) | 122 | 125 | **96** | 106 | 295 | no lo mata | 580 |
¹ Con la Embestida lista al empezar; en oleada, con su recarga, el esqueleto cuesta ≈ 6,5 s a EE y ≈ 7,8 s a EP.

**Zonas (GDD §6.2) — equilibradas, se aceptan.** EP mixto contra esqueleto: 3,9 / 5,8 / 6,9 s en las amenazas 1 / 2 / 3
(EE espada contra cultista: 7,0 / 8,3 / 9,7 s). Con todas las mejoras, la amenaza 3 queda como la 2 sin mejoras
(esqueleto 5,1 s), y Vigor 3 compensa el daño × 1,3 (golpes de esqueleto para caer: 7,1 base ⇒ 8,0). La amenaza 3 sin
mejoras es dura pero posible: encaja con «sin bloqueo por zona».

**Mejoras (GDD §8.3) — equilibradas, se aceptan.** Filo y Potencia (+8 %/nivel) bajan el TTK ≈ 7 % por nivel (jefe EP
mixto 96 ⇒ 67 s con todo; EE 106 ⇒ 74 s). Vigor, Fuelle y Pozo (+15) valen +1 golpe recibido, +1,5 ligeros o +0,75
Bolas por nivel. Economía (−8 %, 2 niveles) da +19 % de lanzamientos. Ninguna domina; Filo es la de mejor relación
precio/efecto, como debe ser la primera compra.

**Oleadas del dungeon (GDD §7.4; amenaza 2) — composición aceptada con turnos de ataque.** Tiempo (s) y daño neto
recibido (con la cura del Destello cuando se usa):
| Oleada | Vida enemiga total | EP espada | EE espada | EP mixto | EE mixto | Objetivo |
|---|---|---|---|---|---|---|
| 1 · 4 esq. | 300 | 31 / 34 | 26 / 14 | 25 / −37 | 20 / −42 | 20–35 s |
| 2 · 3 esq. + 2 gob. | 300 | 76 / 119 | 43 / 56 | 36 / 2 | 30 / 0 | 30–55 s |
| 3 · 4 esq. + 2 gob. + 1 cult. | 431 | 104 / 149 | 81 / 111 | 51 / 3 | 56 / 10 | 45–80 s |
| 4 · 4 esq. + 3 gob. + 2 cult. | 525 | 355 / 678 | 148 / 248 | 70 / 46 | 87 / 59 | 65–110 s |
| 5 · 6 esq. + 3 gob. + 2 cult. | 675 | 366 / 688 | 163 / 256 | 85 / 43 | 99 / 51 | 80–125 s |

Con mezcla de espada y magia, el dungeon completo dura ≈ 4,5–5 min más ≈ 1,5–2 min de jefe. **Sin turnos** (2 + 2), EP
mixto sube a 137 s / 230 de daño en la oleada 4. **Solo espada** no es viable en las oleadas 4–5 (sobre todo EP): es
intencionado (pilar 2), pero es el mayor riesgo de frustración.

**Riesgos de balance.**
1. **Vida que no se rellena entre oleadas:** sin Destello, el daño acumulado de EP mixto en las 5 oleadas es
   ≈ 250–300 (necesita 4–5 pociones; las monedas de las oleadas, 335, pagan 7 en el altar). Con Destello queda en ≈ 60.
2. **Invulnerabilidad de las habilidades:** Estocada cada 6 s y Embestida cada 8 s son i-frames garantizados (11–12 %
   del tiempo) y evitan el imparable. Si en playtest sustituyen a la esquiva, subir la recarga (8 / 10 s) antes que
   quitar la decisión.
3. **Embestida + remate** mata un esqueleto en 2,5 s: limitado por la recarga de 8 s; vigilar en grupos.
4. **Parada:** las tasas de parada son supuestos; si el jugador medio para menos del 30 %, EP pierde frente a EE en todo.
5. **Daño del jefe:** EP mixto recibe ≈ 113 netos en 96 s (necesita 1–2 pociones). Si cuesta demasiado, bajar el tajo
   de 22 a 20.

### 1.12 Reglas comprobables (recursos, daño, hechizos, enemigos, balance) y cambios pedidos al GDD
| ID | Regla | Test |
|---|---|---|
| C-25 | Invulnerabilidad: lista cerrada (decisión del usuario) | Con un esqueleto golpeando y un goblin disparando en cada tick: durante Estocada (45 ticks), Embestida (66), contraataque (36 / 42) y remate ⇒ 0 daño, 0 acumulaciones, sin interrupción; el tick siguiente al final del clip ⇒ daño normal; durante ligero o fuerte ⇒ daño. El imparable del jefe durante una Estocada ⇒ 0 |
| C-26 | Recursos | Aguante 0 ⇒ 0 durante 0,8 s y 100 a los 4,13 s; con guardia, 15/s; tras rotura de guardia empieza a 1,5 s. Maná 0 ⇒ 100 a los 50 s, también lanzando. Ligero con 9 de aguante (EP) ⇒ no sale |
| C-27 | Fórmula | Los 5 ejemplos de §1.5 dan 8,6 / 26 / 45 / 21,6 / 3,64 (± 0,01); un golpe de 1 contra defensa 3 ⇒ 1; Ardiendo a esqueleto ⇒ 1,8/s y al jefe ⇒ 2,4/s (3 × 0,8) |
| C-28 | Combo y fuerte | R1 0,30 s después del final del 1.er ligero ⇒ golpe 2; a 0,40 s ⇒ golpe 1. El 3.º hace 15. Mantener R1 0,20 s ⇒ fuerte de 1,00 s (EP) |
| C-29 | Cancelación con esquiva | Esquiva pulsada en el ligero EP a 0,30 s ⇒ sale a 0,36 s (60 %); en el fuerte EP a 0,30 s ⇒ se descarta (fuera del buffer de 0,15 s); a 0,90 s ⇒ sale al acabar el clip (1,00 s) |
| C-30 | Esquiva | 0,45 s, 3,5 m ± 0,1; golpe en los ticks 3–18 ⇒ 0 daño; en el tick 2 o 19 ⇒ daño; −15 aguante (EE −20) |
| C-31 | Hit-stop local | Ligero que impacta ⇒ el clip dura 0,66 s y la víctima se congela 60 ms; un tercer enemigo sigue moviéndose; un contraataque con impacto alarga su invulnerabilidad 75 ms |
| C-32 | Hechizos | Valores de la tabla de §1.8; 2 Lanzas ⇒ Congelado 2 s y una 3.ª en los 3 s siguientes ⇒ sin Escarcha; Bola contra congelado ⇒ × 2 y el estado desaparece; Destello sobre cultista con barrera ⇒ barrera 0 y luego daño; golpe al jugador lanzando ⇒ sin coste de maná |
| C-33 | Grabar hechizos MVP | Partida nueva ⇒ Bola equipada, 2 tintas; aprender en el Santuario y grabar ⇒ Lanza equipable y 1 tinta; Destello sin tinta ⇒ borrador no equipable (M-48); grabar fuera de descanso/altar ⇒ rechazo |
| C-34 | Interacciones | Tabla de §1.9: fuego sobre Escarcha 2 ⇒ Escarcha 0 sin extra; Lanza sobre Ardiendo ⇒ Ardiendo apagado y Escarcha 2; recarga de reacción 1,5 s por objetivo |
| C-35 | Turnos de ataque | Con 4 esqueletos y 3 goblins a 10 m durante 60 s: nunca hay 2 cuerpo a cuerpo en anticipación/activo a la vez ni 2 tiradores tensando/lanzando a la vez (`window.__GAME__`) |
| C-36 | Balance (simulación de §1.11) | Con los datos de `config/combat/`: TTK de §1.11 ± 15 %; ninguna acción de espada tiene el mayor DPS contra los 4 enemigos y ningún hechizo tampoco; EP mixto en las oleadas 1–5 dentro de los objetivos; EE espada recibe menos daño que EP espada en la oleada 2 (C-22) |

**Cambios que se piden al GDD (`disenador-juego`; no se edita aquí):**
1. §3.3 y §4.1: marcar como aceptados por COMBATE (recursos, esquiva, cancelación desde el 60 % y nunca antes del final
   del activo, hit-stop local con 75 ms para habilidades y contraataque). Añadir «aguante a 15/s con guardia» y «1,5 s de
   retardo tras rotura de guardia».
2. §6.1 / §7.3: el **Santuario del Arroyo** cuenta como altar rúnico (o tiene punto de descanso) para grabar la Lanza.
3. §7.4: los goblins «en la muralla» deben ser alcanzables (escaleras o rampas, ≤ 8 s de subida) o bajar cuando quedan
   solos; si no, EP sin magia no puede terminar la oleada. Mencionar los turnos de ataque (§1.10).
4. §6.3: recomendar llegar al dungeon con Destello sagrado o ≥ 4 pociones (riesgo 1 de §1.11); «Curva por oleada y TTK:
   COMBATE §1.11» (ya no pendiente).

---

## 2. Sistema de magia (fase 2)

### 2.1 Principios
1. **Un hechizo es una receta de runas**; no hay hechizos "cerrados" salvo los del MVP, que pasan a ser recetas predefinidas.
2. **El elemento se reinterpreta según el destino** (fuego en arma ≠ fuego en armadura).
3. **Combinar es la mejor estrategia**, pero cuesta: maná, complejidad e **inestabilidad**.
4. **Determinismo:** toda tirada usa RNG con semilla (`semillaHechizo` + contador). Mismo estado ⇒ mismo resultado.
5. **Topes de seguridad** antes que fórmulas abiertas: nada de bucles, nada de explosiones de entidades.
6. **El nivel no bloquea:** toda receta se puede crear, equipar y lanzar desde el principio; el nivel de mago
   solo cambia el **coste de maná** y la **probabilidad de fallo de ejecución** (2.11).

### 2.2 Estructura del hechizo

```
Hechizo = Forma/Destino (1) + Núcleo (1–4 piezas) + Modificadores (0–3) + Runa de control (0–1)
          + Disparador (0–1 → hechizo hijo)
```

| Pieza | Obligatoria | Qué decide | Límite |
|---|---|---|---|
| Forma/Destino | Sí | A quién/dónde va y cómo viaja | 1 |
| Núcleo | Sí | Elemento(s), compuesto, arcano y/o efecto de alteración | máx. 4 piezas (tope absoluto) |
| Modificadores | No | Ajustes numéricos y de comportamiento | máx. 3 |
| Runa de control | No | Ancla, Catalizador o Sangre: ajusta la inestabilidad | 1, **hueco propio** (no ocupa modificador) |
| Disparador | No | Lanza un **hechizo hijo** ante un evento | 1; el hijo **no** puede tener disparador |

**Escuela** = etiqueta derivada (no se elige): se calcula de destino + núcleo y sirve para afinidades,
progresión y reglas (p. ej. qué rompe la invisibilidad).

| Escuela | Se deriva de | Ejemplos |
|---|---|---|
| Ataque | Destino de ataque + elemento | Bola de fuego, Cono de cellisca |
| Encantamiento | Destino Arma/Armadura | Filo ígneo, Coraza de escarcha |
| Bendición | Destino Yo/Aliado + buff | Celeridad, Piel de piedra |
| Protección | Efecto Barrera/Reflejo/Escudo | Cúpula de prisma, Muro de permafrost defensivo |
| Curación y apoyo | Efecto Curar/Purificar | Destello sagrado, Raíz viva sobre aliados |
| Utilidad/exploración | Movimiento, Objeto/mundo, Arcanos | Destello, Planeo, Piedra de paso |
| Invocación | Efecto Invocar / Podredumbre | Espíritu elemental, cadáveres alzados |
| Sigilo | Velo, Pasos mudos, Niebla negra | Invisibilidad |

**Alteración** (no rompe la invisibilidad) = Bendición, Protección, Curación sobre uno mismo, Utilidad y Sigilo.

### 2.3 Catálogo de runas

#### Formas y destinos [SUPUESTO en todos los números]
| Forma/Destino | Maná base | Lanzamiento | Recarga base | Complejidad | Factor potencia | Notas |
|---|---|---|---|---|---|---|
| Proyectil | 10 | 0,4 s | 1,0 s | 1 | 1,0 | 25 m/s, alcance 30 m |
| Rayo (haz canalizado) | 6/s | 0,3 s | 2,0 s | 2 | 0,3 por tic (0,25 s) | 15 m, instantáneo |
| Cono | 12 | 0,3 s | 2,0 s | 1 | 0,8 | 6 m, 60° |
| Área (en punto) | 18 | 0,8 s | 4,0 s | 2 | 1,2 | radio 4 m, a ≤ 20 m |
| Muro | 20 | 0,6 s | 8,0 s | 2 | 0,5/s contacto | 8 × 3 m, 8 s; máx. 2 |
| Trampa | 14 | 0,5 s | 6,0 s | 2 | 1,5 | se arma en 1 s; máx. 3 |
| Yo (tu personaje) | 8 | 0,5 s | 3,0 s | 1 | — | buffs, curación, movimiento |
| Aliado / NPC / montura | 10 | 0,6 s | 3,0 s | 1 | — | a ≤ 15 m, requiere línea de visión |
| Arma | 15 | 1,0 s | 10 s | 2 | 0,4 por golpe | encantamiento temporal de la espada (única arma del jugador por ahora, §1; el escudo cuenta como armadura) |
| Armadura | 15 | 1,0 s | 10 s | 2 | 0,4 por reacción | encantamiento temporal |
| Zona / suelo | 16 | 0,8 s | 6,0 s | 2 | 0,3/s | radio 5 m, 6 s; máx. 4 activas |
| Objeto / mundo | 8 | 0,5 s | 2,0 s | 1 | — | puertas, agua, plantas, cerraduras |

#### Núcleos
| Pieza de núcleo | Maná | Complejidad | Notas |
|---|---|---|---|
| Elemento base (7) | +8 | 2 | Potencia base 12 por pieza [SUPUESTO] |
| Compuesto descubierto (21 fusiones) | +14 | 2 | Ocupa 1 hueco, cuenta como 2 elementos para daño |
| Arcano descubierto (Espacio, Tiempo) | +25 | 4 | Ocupa 1 hueco; solo con destinos de su tabla |
| Efecto de alteración | ver tabla | 1–3 | Puede ir solo o junto a un elemento |

**Efectos de alteración** (núcleo sin daño):
| Efecto | Maná | C | Qué hace |
|---|---|---|---|
| Curar | +12 | 1 | 25 vida instantánea (o 4/s 6 s con Duración) |
| Purificar | +10 | 1 | Quita 1 debuff (2 con Potencia) |
| Barrera | +14 | 2 | Absorbe 30 daño, 6 s |
| Reflejo | +16 | 2 | Devuelve el siguiente proyectil (ventana 3 s) |
| Revelar | +8 | 1 | Anula invisibilidad y marca en radio 12 m, 8 s |
| Velo | ver 2.9 | 3 | Invisibilidad |
| Pasos mudos | +6 | 1 | Radio de ruido −60 %, 60 s |
| Destello / Intercambio / Llamada / Impulso / Planeo / Levitar | ver 2.10 | 1–2 | Movimiento |
| Iluminar | +4 | 1 | Luz flotante 120 s |
| Invocar | +30 | 3 | Espíritu del elemento del núcleo, 30 s; máx. 2 invocaciones |
| Disipar | +12 | 2 | Quita 1 buff enemigo o anula una zona/muro |
| Buff (ver 2.8) | ver tabla | 1–2 | Solo con destino Yo/Aliado |

#### Modificadores (máx. 3) y runas de control (hueco propio, máx. 1) [SUPUESTO]
| Modificador | C | Maná | Efecto | Inestab. |
|---|---|---|---|---|
| Potencia | 1 | ×1,3 | +25 % daño/efecto | +10 (agresivo) |
| Alcance | 1 | +4 | +50 % alcance | 0 |
| Radio | 1 | ×1,2 | +40 % radio/cono | 0 |
| Velocidad | 1 | +3 | +50 % velocidad de proyectil, −20 % lanzamiento | 0 |
| Multiplicar | 2 | ×1,5 | +2 proyectiles (abanico 20°) al 60 % de potencia | +10 (agresivo) |
| Perforar | 1 | +5 | Atraviesa 2 objetivos | 0 |
| Rebote | 1 | +5 | Rebota 2 veces en superficies, 70 % por rebote | 0 |
| Buscador | 2 | +6 | Teledirigido suave (90°/s) | 0 |
| Duración | 1 | ×1,2 | +50 % duración de estados, zonas y buffs | 0 |
| Carga | 1 | +0 | Mantener hasta 1,5 s: potencia ×1,0→×1,8 | +5 (agresivo) |
| Eco | 2 | ×1,4 | Se repite 1 s después al 50 % | +10 (agresivo) |
| Persistencia | 1 | +6 | Deja zona del núcleo 4 s al impactar | 0 |
| Silencioso | 1 | +3 | Sin sonido ni círculo visible; no alerta a quien no impacta | 0 |
| Eficiencia | 1 | ×0,75 | −20 % potencia | 0 |
| *Hueco de control:* | | | | |
| **Ancla** (control) | 1 | +0 | −15 % potencia | −20 |
| **Catalizador** (control) | 1 | +0 | +25 % potencia | +15 |
| **Sangre** (control) | 1 | 50 % del maná se paga en vida | — | −25 |

#### Disparadores (máx. 1; el hijo se paga al 50 % al lanzar el padre) [SUPUESTO]
| Disparador | C | Válido en | Condición |
|---|---|---|---|
| Al impactar | 2 | Ataques | El padre toca a un objetivo o superficie |
| Al expirar | 2 | Proyectil, zona, muro, trampa | Fin de vida del padre |
| Temporizador | 2 | Cualquiera | 1–5 s tras el lanzamiento |
| Proximidad | 2 | Trampa, zona, objeto | Enemigo a ≤ 3 m |
| Al recibir golpe | 2 | Yo, armadura | Golpe cuerpo a cuerpo recibido (recarga interna 3 s) |
| Al matar | 2 | Ataques, arma | El padre mata a un objetivo |
| Al esquivar | 2 | Yo | Esquiva con i-frames que evita daño |
| Al parar | 2 | Arma, yo | Parada perfecta cuerpo a cuerpo, con o sin escudo (no bloqueo normal ni desvío de flechas; C-17) |

**Topes de seguridad:** profundidad de disparo 1 (el hijo no dispara nada); recarga interna de cada
disparador 0,5 s; máx. 8 instancias de efecto por lanzamiento; máx. 24 proyectiles activos por lanzador
y 64 globales (los más antiguos se disipan); máx. 6 saltos de cadena; máx. 2 muros, 3 trampas, 4 zonas,
2 invocaciones por lanzador.

### 2.4 Elementos base

| Elemento | Tipo de daño | Estado (dur. / acumul.) | Comportamiento |
|---|---|---|---|
| Fuego | Ardiente | **Ardiendo**: 3 % vida máx/s (tope 3/s, §1.8), 4 s, renueva | Explota (radio 2,5 m al impactar) |
| Hielo | Frío | **Escarcha**: −15 % vel. por acumul., 5 s, 3 acumul. → **Congelado** 2 s | Cristaliza (deja hielo, congela agua) |
| Luz | Sagrado (×1,5 a no-muertos) | **Iluminado**: revela, −1 buff, 6 s; en aliados cura 3/s | Haz rápido (×1,5 vel.), revela |
| Rayo | Eléctrico | **Cargado**: 3 acumul. → **Aturdido** 1 s, 5 s | Salta en cadena (2 saltos, 6 m, 70 %) |
| Tierra | Físico (contundente) | **Lastrado**: −10 % vel. por acumul., 3 acumul. → **Derribado** 1,5 s | Empuja y persiste (fragmentos 4 s) |
| Sombra | Necrótico | **Maldito**: drena 2 vida/s al lanzador, −20 % curación, 6 s | Maldice/oculta (reduce detección) |
| Aire | Cortante | **Desequilibrado**: interrumpe ataque en preparación, 1,5 s | Velocidad, empuje, dispersa nubes y gases |

Tierra y Aire usan los tipos físicos del MVP (contundente/cortante), así que heredan las debilidades y
resistencias de la tabla de enemigos (esqueleto débil a Tierra, por ejemplo).

**Pares opuestos:** Fuego/Hielo y Luz/Sombra.

#### Reinterpretación por destino
| Elemento | Arma (por golpe) | Armadura (al ser golpeado) | Yo / aliado | Zona / suelo |
|---|---|---|---|---|
| Fuego | +4 ardiente y aplica Ardiendo | El atacante cuerpo a cuerpo recibe 6 + Ardiendo | Inmune a Escarcha, +30 % res. frío | Suelo en llamas 4 daño/s |
| Hielo | +1 Escarcha | El atacante gana 1 Escarcha | +30 % res. fuego; congela agua al pisar | Hielo resbaladizo (enemigos −40 % control) |
| Luz | +4 sagrado; revela al golpeado | Bloquear cura 2 vida | Regenera 2/s y quita 1 debuff | Consagrada: aliados 2 vida/s, no-muertos −20 % vel. |
| Rayo | 1 de cada 4 golpes salta a otro enemigo | Descarga que aturde 0,3 s (recarga 5 s) | +10 % vel. de ataque | Charco eléctrico: aplica Cargado |
| Tierra | +25 % daño a guardia y retroceso; los golpes de espada cuentan como **contundentes** y el fuerte rompe la guardia enemiga [SUPUESTO, sustituye al martillo; §1, C-15] | −15 % daño físico, −5 % vel. | Inmune a empuje/derribo | Pinchos: Lastrado por segundo |
| Sombra | Robo de vida 8 % | El atacante recibe Debilidad 4 s | Radio de detección −50 % | Penumbra: enemigos −50 % visión |
| Aire | +0,5 m alcance, +10 % vel. de ataque | 25 % de desviar proyectiles | +15 % vel. de movimiento, caída lenta | Corriente: empuja enemigos, acelera aliados |

### 2.5 Fusiones de dos elementos (y tabla de reacciones)

**Descubrimiento:** la primera vez que lanzas un núcleo con los dos elementos (2 huecos) o provocas la
reacción en combate, el compuesto entra en el **Códice elemental**. Desde entonces ocupa **1 hueco** y su
penalización por par opuesto baja a la mitad (+15).

**Reacción en combate (misma tabla):** si un golpe del elemento B alcanza a un objetivo con el estado del
elemento A (A ≠ B), se dispara la reacción A+B: consume el estado A, hace 50 % del daño del golpe como
daño extra del compuesto y aplica el efecto. Recarga de reacción por objetivo: 1,5 s. Caso del MVP:
**Fuego sobre Congelado = estallido de Vapor a ×2**.

| # | Fusión | Elementos | Daño | Estado | Comportamiento | Reacción en combate |
|---|---|---|---|---|---|---|
| 1 | Vapor | Fuego+Hielo | Escaldadura (ardiente+frío) | Cegado 2 s | Nube que crece a 4 m | Estallido de vapor (×2 si Congelado), nube ciega 3 s |
| 2 | Llama sagrada | Fuego+Luz | Sagrado+ardiente | Ardiendo que quita 1 buff/s | Haz con estela ígnea | Pira: ×1,5 a no-muertos, quita 1 buff |
| 3 | Plasma | Fuego+Rayo | Ardiente+eléctrico | Ardiendo + Cargado | ×2 velocidad, perfora 3 | Lanza perforante en línea de 6 m |
| 4 | Magma | Fuego+Tierra | Ardiente+contundente | Ardiendo + Lastrado | Charcos 5 s | Costra: inmoviliza 1,5 s y deja charco |
| 5 | Fuego negro | Fuego+Sombra | Ardiente+necrótico | **Sin curación** 6 s | No se apaga con agua | Sin curación 8 s, salta a 1 vecino |
| 6 | Prisma | Hielo+Luz | Frío+sagrado | Deslumbrado (−30 % precisión) 4 s | Refracta en 3 al tocar superficie; escudos de cristal (absorben 30) | Abanico de 3 fragmentos |
| 7 | Escarcha eléctrica | Hielo+Rayo | Frío+eléctrico | Escarcha + Cargado | Salta solo entre objetivos con Escarcha (hasta 6) | Cadena a todos los congelados a 8 m |
| 8 | Permafrost | Hielo+Tierra | Frío+contundente | Escarcha + Lastrado | Muros y pinchos de hielo 8 s | Pinchos desde el suelo, Derribado |
| 9 | Vacío helado | Hielo+Sombra | Frío+necrótico | Agotamiento | Drena 20 aguante | Roba 20 aguante para el lanzador |
| 10 | Juicio | Luz+Rayo | Sagrado+eléctrico | Aturdido 1 s | Rayo del cielo tras señal de 0,6 s | Segundo rayo del cielo |
| 11 | Raíz viva | Luz+Tierra | Sagrado+contundente | Enraizado 2 s / aliados 4 vida/s | Persiste 6 s | Raíces atrapan 2 s |
| 12 | Crepúsculo | Luz+Sombra | Sagrado+necrótico | Anulado | Zona 5 m que borra buffs y debuffs 4 s | Disipa todo; +10 daño por estado quitado |
| 13 | Magnetismo | Rayo+Tierra | Eléctrico+contundente | Imantado 5 s | Atrae o repele; desvía flechas y armas metálicas | Tirón hacia el lanzador; flechas cercanas lo buscan (sin arco del jugador: son las flechas enemigas, p. ej. del goblin arquero, que se desvían hacia el imantado y pueden herir a otros enemigos) |
| 14 | Caos | Rayo+Sombra | Eléctrico+necrótico | Confusión 3 s | Saltos a objetivos al azar (con semilla; nunca al lanzador) | Confusión 3 s |
| 15 | Podredumbre | Tierra+Sombra | Contundente+necrótico | Veneno 2 %/s, 8 s, 3 acumul. | Alza cadáveres aliados 20 s (máx. 2) | Veneno; si muere en 5 s, se alza |
| 16 | Incendio | Aire+Fuego | Ardiente+cortante | Ardiendo extendido 6 s | Se propaga por hierba y crece con viento | Ardiendo salta a todos a 4 m |
| 17 | Cellisca | Aire+Hielo | Frío+cortante | 2 Escarcha por impacto | Tormenta móvil, −40 % vel. | +2 Escarcha y empuje |
| 18 | Aurora | Aire+Luz | Sagrado+cortante | Cegado 2 s; aliados +20 % vel. | Cortina de luz | Ceguera 2 s; aliados a 6 m Celeridad 4 s |
| 19 | Tempestad | Aire+Rayo | Eléctrico+cortante | Cargado + Desequilibrado | Rayos al azar en zona móvil | Empuje + Aturdido 0,5 s |
| 20 | Tormenta de arena | Aire+Tierra | Contundente+cortante | Cegado + Desgaste (−5 defensa, 5 acumul.) | Zona que oculta | Desgaste ×2 acumulaciones |
| 21 | Niebla negra | Aire+Sombra | Necrótico+cortante | Cegado 3 s | Nube: aliados dentro indetectables a > 6 m | Nube de 3 s alrededor del objetivo |

### 2.6 Combinaciones de 3–4 piezas (generadas por rasgos)

Prioridad de resolución: **Arcano** (conjunto exacto de 3) > **Legendaria** (multiconjunto exacto) > **Generada**.

**Reglas de generación** (el núcleo es un multiconjunto; se pueden repetir elementos):
1. **Dominante** = elemento con más piezas; empate ⇒ los empatados se ordenan por `hash(semillaHechizo, idElemento)`
   (estable para siempre en ese hechizo). **`semillaHechizo` (decisión del usuario):** entero de 20 bits **aleatorio**
   tirado con el RNG con semilla de la partida al **crear** el hechizo (grabar o mutar); determinista en tests.
   Importar un código conserva la semilla del código (2.13); editar una receta propia la conserva (decisión del usuario).
   Consecuencia: la misma receta creada por separado por dos jugadores puede tener distinto desempate de
   dominante, nombre y mutaciones; compartir el código reproduce exactamente el original.
2. **Comportamiento** = el del dominante.
3. **Estados** = los de los **dos elementos más presentes**; si forman una fusión del Códice, se usa el estado de la fusión.
4. **Daño** repartido por proporción de piezas entre sus tipos; potencia total = 12 × piezas × (1 + 0,10 × (piezas − 1)) [SUPUESTO].
5. Núcleo de un solo elemento repetido ("concentrado"): sin estados extra, potencia ×1,15 adicional.
6. **Nombre** (híbrido) = **nombre rúnico** en lengua propia + **subtítulo** descriptivo en castellano,
   p. ej. «Asharvel — saeta de ceniza tronante». Ver reglas abajo. Renombrable (el nombre propio sustituye al
   rúnico en HUD y grimorio; el subtítulo se mantiene).
7. **Visual** = color mezclado por proporción + máx. 3 capas de partículas (las de los 3 más presentes).

**Lengua rúnica** [SUPUESTO; validar tono con `disenador-juego`]. Fonología: consonantes *s, sh, r, l, n, m, v,
t, d, k, b, g, th*, vocales *a, e, i, o, u, y*; sílabas (C)V(C); sin dobles consonantes ni grupos de 3 consonantes.

| Elemento | Raíz (dominante) | Enlace (2.º elemento) | Materia (castellano, femenino) | Adjetivo (2.º/3.º) |
|---|---|---|---|---|
| Fuego | Ash | -is- | ceniza | ardiente |
| Hielo | Ysk | -ys- | escarcha | helada |
| Luz | Ilen | -el- | luz | radiante |
| Rayo | Tar | -ar- | tormenta | tronante |
| Tierra | Bron | -od- | piedra | pétrea |
| Sombra | Vesh | -um- | penumbra | umbría |
| Aire | Sil | -av- | brisa | silbante |

| Forma/Destino | Terminación | Palabra del subtítulo |
|---|---|---|
| Proyectil / Rayo (haz) / Cono | -vel / -ith / -esh | saeta / haz / abanico |
| Área / Muro / Trampa | -mar / -tor / -nik | estallido / muralla / sello |
| Yo / Aliado / Arma / Armadura | -em / -emi / -kar / -mir | don / ofrenda / filo / égida |
| Zona / Objeto-mundo | -ra / -un | círculo / toque |

**Composición del nombre rúnico:** `Raíz(dominante) + Enlace(2.º más presente) + Terminación(forma)`.
- Núcleo de 1 pieza: sin enlace; si la raíz acaba en grupo consonántico (*sk*) y la terminación empieza por
  consonante, se inserta *-a-* (Ysk + vel = Yskavel). Concentrado (un elemento repetido): enlace propio (Ash-is-vel).
- Si el enlace acaba en la letra con la que empieza la terminación, se funden (-ar- + -ra ⇒ -ara: Bronara).
- El 3.º y 4.º elemento **no** entran en el nombre rúnico (solo en el subtítulo). Longitud ≤ 12 caracteres.
- Núcleo sin elemento (solo alteración): raíz neutra *Eon* + terminación; subtítulo = forma + nombre del efecto.
- Arcanos y legendarias conservan su nombre fijo (2.7).
- El nombre depende de receta + `semillaHechizo` (vía el desempate de la regla 1): sin empates, el nombre es el
  mismo para cualquier semilla.

**Subtítulo:** `palabra(forma) + "de" + materia(dominante) + adjetivo(2.º) [+ "y" adjetivo(3.º)]`; concentrado ⇒
`materia + "pura"`. Las materias son todas femeninas, así que los adjetivos concuerdan siempre en femenino.
**Uso:** ranuras del HUD = solo nombre rúnico; grimorio/tooltip = nombre + subtítulo; texto de accesibilidad
(lector de pantalla, `aria-label`) = nombre + subtítulo.

Los ejemplos 2 y 3 tienen empates: su resultado vale para la **semilla de referencia de test** `SEMILLA_REF`
(constante en config, elegida para producir este orden); con otra semilla el desempate puede cambiar.

**Ejemplo 1 — Proyectil + [Fuego, Fuego, Rayo] + Multiplicar**
- Dominante Fuego ⇒ explota. Estados: Fuego+Rayo = Plasma ⇒ Ardiendo + Cargado. Daño 67 % ardiente / 33 % eléctrico.
- Potencia de núcleo 12 × 3 × 1,2 = 43,2 (× factor Proyectil 1,0) ⇒ con Multiplicar: 3 proyectiles de 25,9.
- Maná (10 + 24) × 1,5 = **51**. Complejidad 1 + 6 + 2 = **9**; dificultad (2.11) **9**.
- Inestabilidad: 3.ª pieza +15, Multiplicar +10 = **25 %**. Nombre: «Asharvel — saeta de ceniza tronante».

**Ejemplo 2 — Muro + [Hielo, Tierra, Aire]**
- Empate triple ⇒ la semilla ordena Tierra, Hielo, Aire: dominante Tierra (persiste). Estados de los 2 primeros: Tierra+Hielo = Permafrost (Escarcha + Lastrado).
- Muro de 8 s que lanza ráfagas cortantes heladas. Maná 20 + 24 = **44**; C = 2 + 6 = **8**; inestabilidad **15 %**. Nombre: «Bronystor — muralla de piedra helada y silbante».

**Ejemplo 3 — Área + [Sombra, Sombra, Fuego, Hielo] + Ancla** (Ancla en el hueco de control)
- Dominante Sombra (maldice). Estados: Sombra + (empate Fuego/Hielo ⇒ semilla: Fuego) = Fuego negro ⇒ Sin curación.
- Inestabilidad: par Fuego/Hielo +30, piezas 3.ª y 4.ª +30, Ancla −20 = **40 %**. Potencia de núcleo 12 × 4 × 1,3 × 0,85 = 53 (× factor Área 1,2 = 64).
- Maná 18 + 32 = **50**; C = 2 + 8 + 1 = **11**. Nombre: «Veshismar — estallido de penumbra ardiente y helada».

### 2.7 Legendarias y arcanos

**Legendarias** (4, decisión del usuario; sustituyen al resultado generado; se obtienen en santuarios ocultos o
por mutación rara ≈ 1 %). Las 4 elegidas (aceptadas por el usuario) cubren los 7 elementos:
| Legendaria | Receta exacta | Efecto |
|---|---|---|
| Obsidiana | Fuego + Tierra + Hielo | El magma se templa en cristal negro: muro/proyectil que al romperse lanza esquirlas perforantes (×1,4) |
| Tormenta solar | Luz + Fuego + Rayo | Columna de luz que cae 3 veces en 2 s; ciega y quema; ×2 a no-muertos |
| Ciclón de cristal | Aire + Aire + Hielo + Luz | Remolino móvil de esquirlas que refleja proyectiles 5 s |
| Coro de almas | Sombra + Hielo + Aire | Espectros helados persiguen a 3 enemigos; drenan aguante |

*Reserva para expansiones (decisión del usuario; fuera del alcance actual):* Eclipse ceniciento, Jardín de hierro, Corazón de volcán,
Faro del vendaval. Sus recetas resuelven como **generadas**. Nota: las flechas imantadas de *Jardín de hierro* dependían del arco del jugador (en reserva, §1.2); si vuelve sin arco, se rediseña sobre flechas enemigas como Magnetismo.

**Arcanos** (fusiones de 3; se descubren lanzándolos una vez y luego ocupan 1 hueco; C 4).

**ESPACIO = Aire + Sombra + Tierra**
| Hechizo | Maná | Recarga | Efecto |
|---|---|---|---|
| Salto lejano | 40 | 30 s | Teletransporte a punto visible ≤ 150 m; transición 1 s |
| Intercambio mayor | 25 | 12 s | Cambia de lugar con objetivo ≤ 40 m |
| Ancla rúnica | 20 | 20 s | Marca un punto; reactivar en ≤ 60 s te devuelve |
| **Piedra de paso** | 60 + 1 esquirla rúnica crear / 30 viajar | 120 s viajar | Crea tu propio punto de viaje rápido (máx. 5; reglas de colocación abajo). Viajar: ver abajo |
| Portal | 80 | 180 s | Une dos piedras de paso 15 s; pasan aliados y caballo |
| Gravedad | 25 | 10 s | Atrae o repele en radio 8 m durante 2 s |
| Vacío | 30 | 15 s | Esfera de 3 m que traga proyectiles 4 s |
| Zancada | 20 | 8 s | 3 destellos de 6 m encadenados en 2 s |

No existe red de viaje rápido predefinida: solo las piedras que crea el jugador. Una nueva piedra por
encima del máximo exige borrar una existente (borrar no devuelve la esquirla; decisión del usuario). Las piedras
**persisten en el guardado** (posición y orden).

**Viajar con Piedra de paso.** El destino se elige en el apartado **Mapa** del libro-menú (`docs/GUIA_UI.md`).
Al confirmar: animación de lanzar un hechizo de portal → transición 2–3 s con precarga de celdas → llegada.
Requisitos: 30 maná, recarga de 120 s lista, fuera de combate (ningún enemigo en alerta a < 40 m) y no estar
dentro de un dungeon. Si alguno falla, los destinos aparecen **deshabilitados** (con motivo) y **no se gasta nada**;
maná y recarga se cobran solo al confirmar.

**Colocación de Piedra de paso** [SUPUESTO salvo máx. 5 y esquirla]. Se comprueba todo **antes** de gastar; si
algo falla, rechazo con motivo y **sin gastar maná ni esquirla**:
| Condición | Valor |
|---|---|
| Material | 1 «esquirla rúnica» en el bolso mágico (2.12) |
| Fuera de combate | Ningún enemigo en alerta a < 40 m |
| Suelo firme | No en agua, no en el aire ni planeando; pendiente ≤ 30° |
| Separación | ≥ 300 m de cualquier otra piedra propia |
| Lugar prohibido | Dungeons y santuarios |

**TIEMPO = Luz + Rayo + Hielo**
| Hechizo | Maná | Recarga | Efecto |
|---|---|---|---|
| Burbuja lenta | 35 | 20 s | Radio 6 m: enemigos y proyectiles a ×0,4 de velocidad, 5 s |
| Acelerar | 25 | 15 s | Yo/aliado a escala de tiempo ×1,3, 4 s |
| Estasis | 30 | 25 s | Objetivo detenido e invulnerable 3 s (jefes 1 s); sirve para salvar a un aliado |
| Rebobinar | 40 | 90 s | Vuelves a posición, vida y aguante de hace 3 s (no maná, no muertes enemigas) |
| Eco del tiempo | 20 fijo | 12 s | Repite tu último hechizo (≤ 10 s) al 60 % |
| Envejecer | 20 | 10 s | Enemigo −30 % defensa 8 s; objeto: pudre madera, oxida cerraduras |
| Crecer | 15 | 10 s | Plantas: liana-puente de 10 m o cobertura 20 s |

### 2.8 Bendiciones (buffs) y debuffs

**Reglas:** máx. **3 bendiciones** activas; el mismo buff **no se acumula** (renueva duración); los buffs de
duración ≥ 60 s **reservan** un % del maná máximo mientras duran (el maná actual no supera máx. − reserva);
los más cortos pagan coste normal. Si un buff sufre contragolpe, se aplica su **inverso** a ti (½ duración).

| Buff | Duración | Valor | Reserva / coste | Inverso (contragolpe) |
|---|---|---|---|---|
| Celeridad | 30 s | +20 % movimiento, +10 % vel. ataque | 20 maná | Torpeza |
| Piel de piedra | 60 s | −20 % daño físico, −10 % movimiento | 10 % | Fragilidad |
| Furia | 20 s | +20 % daño cuerpo a cuerpo, +15 % daño recibido | 20 maná | Debilidad |
| Regeneración | 30 s | +2 vida/s | 25 maná | Sangrado |
| Arma encantada | 60–120 s | Ver 2.4 (arma) | 10 % | Arma apagada (sin encantamiento 10 s) |
| Reflejo | 20 s | Refleja 1 proyectil cada 5 s | 25 maná | Marca |
| Levitación | 10 s | Caída lenta 2 m/s, flota 1 m | 15 maná | Agotamiento |
| Resistencia (elegir elemento) | 120 s | −40 % daño de ese elemento | 10 % | Vulnerabilidad elemental |
| Visión nocturna | 300 s | Ve en oscuridad, ve rastros | 5 % | Ceguera |
| +Maná máx. / +Aguante máx. | 120 s | +25 | 10 % | Agotamiento |
| Mente clara | 60 s | Contragolpe mental ⇒ resultado Normal; −50 % duración de debuffs mentales | 10 % | Confusión |

**Debuffs físicos** [SUPUESTO]
| Debuff | Duración | Efecto | Acumul. |
|---|---|---|---|
| Lentitud | 4 s | −30 % movimiento y vel. de ataque | 1 |
| Debilidad | 8 s | −25 % daño infligido | 1 |
| Marca | 10 s | +15 % daño recibido de todo; visible a través de paredes | 1 |
| Vulnerabilidad elemental | 8 s | +30 % daño de un elemento | 1 por elemento |
| Sangrado | 6 s | 2 % vida máx/s | 3 |
| Sacrificio | 6 s | Cada acción cuesta 3 vida | 1 |
| Agotamiento | 8 s | −50 % regeneración de aguante | 1 |
| Torpeza | 6 s | −20 % vel. ataque, +30 % recuperación | 1 |
| Fragilidad | 8 s | −30 % defensa; cualquier golpe rompe guardia | 1 |

**Debuffs mentales** [SUPUESTO]
| Debuff | Duración | En enemigos | En el jugador |
|---|---|---|---|
| Miedo | 3 s | Huye | Sin control 3 s (opción accesible) |
| Confusión | 4 s | Ataca al objetivo más cercano, sea quien sea | Ejes de movimiento invertidos (opción accesible) |
| Alucinación | 6 s | Ve 2 dobles falsos del jugador | Ves 2 enemigos falsos sin colisión |
| Olvido | 8 s | Pierde su habilidad especial | Bloquea 1 hechizo equipado (al azar con semilla) |
| Silencio | 4 s | No lanza hechizos | No lanzas hechizos |
| Ceguera | 3 s | Pierde objetivo; detección −70 % | Viñeta fuerte |
| Sueño | 6 s | Inactivo; despierta al recibir daño (×1,5 ese golpe) | Inactivo; despiertas con daño |

**Revelar** anula Velo, Niebla negra y Alucinación en su radio.

### 2.9 Invisibilidad (Velo)

| Regla | Valor [SUPUESTO] |
|---|---|
| Coste | 10 maná al activar + 6 maná/s |
| Duración máxima / recarga | 10 s / 20 s (desde que termina) |
| Se rompe | Al atacar o lanzar un hechizo que no sea de alteración; al recibir daño; al agotar maná |
| Primer golpe desde invisible | ×1,5 daño (no se combina con crítico de espalda: se toma el mayor) |
| Detección por ruido | Correr 8 m, andar 4 m, agachado 1,5 m (Pasos mudos −60 %) |
| Detección por proximidad | Enemigos normales 2 m; **cultista mago 5 m**; jefes 4 m |
| Al ser detectado | El enemigo te ve 3 s (contorno) sin romper el Velo |
| Contra | Revelar (y Luz en arma/zona) |
| Visual | Refracción translúcida (distorsión de pantalla), sin sombra proyectada |
| A caballo | El Velo cubre **jinete y caballo** (mismo coste); el galope cuenta como "correr" para el ruido |
| Niebla negra | Afecta también al caballo: jinete y montura dentro de la nube son indetectables a > 6 m (como el Velo) |

### 2.10 Movimiento mágico

| Hechizo | Maná | Recarga | Valores |
|---|---|---|---|
| Destello | 15 | 4 s | 8 m (5–12 m con Alcance/Eficiencia); 0,15 s de invulnerabilidad |
| Intercambio | 15 | 8 s | Cambia de sitio con objetivo ≤ 25 m |
| Llamada | 10 | 20 s | Trae caballo, aliado u objeto suelto ≤ 40 m (caballo: desde cualquier distancia en el mundo, llega en 3 s) |
| Impulso | 12 | 2 cargas, 3 s c/u | Salto de 6 m vertical o 10 m horizontal |
| Planeo | 5 + 3/s | — | Caída 2 m/s; horizontal 14 m/s (Aire 18 m/s) |
| Levitación | ver buff | — | Caída lenta / flotar |

**Variantes de Destello por elemento:** Sombra = solo entre zonas en sombra pero alcance ×1,5 y sin sonido;
Rayo = Aturdido 0,5 s a 2 m al llegar; Luz = Cegado 2 s a 4 m al llegar; Fuego = explosión en el origen;
Hielo = deja un clon de hielo que atrae ataques 3 s; Tierra = emerges del suelo derribando a 2 m; Aire = +40 % alcance.

**Aéreo:** solo levitación, planeo e impulsos (no hay vuelo libre). Aire es el elemento principal; otros dan
variantes (Fuego: impulso con explosión; Rayo: impulso instantáneo; Hielo: plataforma de hielo 3 s).

**A caballo:** Planeo e Impulso se permiten con el caballo (el jinete lanza; el caballo planea con él) con los
mismos límites de velocidad, techo y zonas de anulación; el daño por caída al aterrizar se aplica a ambos.

**Límites:**
- Velocidad aérea ≤ 1,5 × galope (galope ≈ 14 m/s [SUPUESTO] ⇒ ≤ 21 m/s).
- Techo ≈ 300 m sobre el terreno (por encima, planeo e impulso no suben).
- Viajes largos: transición de 1–3 s con precarga de celdas destino.
- **Daño por caída:** a partir de 10 m, 4 % vida máx. por metro extra; letal a ≥ 35 m. Planeo/Levitación activos lo anulan.
- **Zonas de anulación** (dungeons, salas de jefe, santuarios marcados): bloquean Salto lejano, Portal, Ancla
  rúnica, Planeo e Impulso. **Piedra de paso:** crear se bloquea en dungeons y santuarios (más reglas en 2.7);
  viajar se bloquea dentro de dungeons.
  **Destello, Intercambio, Zancada, Rebobinar y Estasis sí funcionan.**
  El HUD muestra esas runas apagadas con aviso; lanzar una bloqueada no gasta maná.

### 2.11 Fórmulas: coste, complejidad, inestabilidad [SUPUESTO]

```
maná       = (maná_forma + Σ maná_núcleo + Σ maná_mod_plano) × Π mult_mod   (redondeo arriba)
lanzamiento = t_forma + 0,1 s × (piezas_núcleo − 1) + Σ ajustes_mod          (mín. 0,2 s)
recarga    = r_forma × (1 + 0,25 × (piezas_núcleo − 1)) + Σ ajustes_mod     (mín. 0,5 s)
complejidad = C_forma + Σ C_núcleo + Σ C_mod + C_disparador + C_hijo / 2
potencia   = 12 × piezas × (1 + 0,10 × (piezas − 1)) × factor_forma × Π mod_potencia
```

**Topes absolutos (no dependen del nivel):** 4 piezas de núcleo, 3 modificadores, 1 runa de control,
disparador de profundidad 1, topes de entidades de 2.3. **Equipados:** 6 + 1 por arcano descubierto (máx. 8; confirmado por el usuario, M-30). Asignación de
ranuras a controles (mando y teclado) y habilidad del arma: ver `docs/GUIA_UI.md` (no se duplica aquí).
**Piedras de paso:** máx. 5 y 1 esquirla rúnica por piedra creada (decisión del usuario); colocación en 2.7.

#### Dominio, margen y fallo de ejecución [SUPUESTO]
```
dificultad D = complejidad + 2 × max(0, elementos_distintos − 2)
dominio    Do = 5 + nivel_mago (1–10) + afinidad(elemento dominante, 0–5)   (sin elemento: ⌊afinidad máx. / 2⌋)
margen     M  = Do − D ;  déficit d = max(0, −M)
M ≥ 0 ⇒ coste = maná × (1 − min(0,15; 0,03 × M)) ; P_fallo = 0
M < 0 ⇒ coste = maná × (1 + min(0,8; 0,10 × d))   ; P_fallo = min(78 %; 12 % × d)       (redondeo arriba)
```
**Fallo de ejecución** (falta de dominio): se tira **antes** que la inestabilidad (semilla
`hash(semillaHechizo, nºLanzamiento, 0)`; la de inestabilidad usa `…, 1`). Si falla, el hechizo se disipa al
terminar el lanzamiento, sin efecto, gasta el **50 % del coste** y aplica el 50 % de la recarga; no hay tirada de
inestabilidad. Con **d ≥ 5**, el fallo dispara además un contragolpe (físico 70 % / mental 30 %, tabla de abajo).
**Inestabilidad** (por la receta: opuestos, nº de piezas, modificadores) solo se tira si la ejecución tiene éxito y
no depende del nivel. El grimorio muestra D, M, coste final, % de fallo y % de inestabilidad antes de equipar.

**Niveles (XP acumulada):** 2: 100 · 3: 250 · 4: 450 · 5: 700 · 6: 1000 · 7: 1400 · 8: 1900 · 9: 2500 · 10: 3200.
| Fuente | XP | Peso objetivo |
|---|---|---|
| (B) Runa nueva / fusión descubierta / legendaria / arcano | 40 / 30 / 120 / 200 | |
| (B) Entrada del Códice / lugar, POI o santuario / altar rúnico | 10 / 15 / 25 | ≈ 75–80 % (≈ 100–120 XP/h explorando) |
| (A) Lanzamiento válido (combate real, regla 2.13.1) | 1 × 0,8^(n−1), n = usos del mismo hechizo en la última hora | |
| (A) Tope de uso | 4 XP por hechizo y hora; 25 XP/h en total | ≈ 20–25 % (≤ 25 XP/h) |

**Contenido de magia (opción A «Ajustado», decisión del usuario):**
| Contenido | Cantidad | XP c/u | XP total |
|---|---|---|---|
| Runas aprendibles | 18 | 40 | 720 |
| Fusiones del Códice | 21 | 30 | 630 |
| Legendarias | 4 | 120 | 480 |
| Arcanos | 2 | 200 | 400 |
| POI / lugares / santuarios | ≈ 60 | 15 | ≈ 900 |
| Altares rúnicos | 10 | 25 | 250 |
| Entradas del Códice | ≈ 40 | 10 | ≈ 400 |
| **Total** | | | **≈ 3.780** (estimación del usuario ≈ 3.600) |

Nivel 10 (3.200 XP) ≈ 80 % del mundo (≈ 25 h): 80 % del contenido ≈ 3.020 XP + XP de uso (≤ 25 XP/h). Sin XP de
uso, con < 70 % del contenido (≤ 2.650 XP) el nivel 10 es inalcanzable. Nº de POI y reparto por bioma: los valida
`disenador-juego` (`contexto/CONTEXTO_PROYECTO.md` da 50–70 POI; aquí se toma ≈ 60).

**Afinidad** (0–5 por elemento): +1 punto por lanzamiento válido con ese elemento dominante (mismo decrecimiento);
umbrales 30 / 100 / 250 / 500 / 900. Solo cuenta en hechizos cuyo dominante es ese elemento.

**Ejemplo A — novato** (nivel 1, afinidad 0): Proyectil + [Fuego, Hielo, Rayo, Aire]. C = 1 + 8 = 9; 4 distintos
⇒ D = 13; Do = 6; M = −7. Maná base 42 ⇒ **72** (×1,7); fallo **78 %** (tope) y, si falla, pierde 36 y sufre
contragolpe (d ≥ 5). Si se ejecuta (22 %), aún tira inestabilidad 60 % (par opuesto +30, 3.ª y 4.ª pieza +30).
**Ejemplo B — avanzado** (nivel 8, afinidad Fuego 4): Proyectil + [Fuego] + Velocidad. C = D = 4; Do = 17;
M = +13 ⇒ maná 21 × 0,85 = **18**; fallo **0 %**; inestabilidad 0 %.

**Inestabilidad I (0–100 %):** +30 por par opuesto (+15 si es fusión descubierta), +15 por cada pieza de
núcleo a partir de la 3.ª, +modificadores agresivos (tabla 2.3), ± runas de control. Se limita a [0, 100].

Tirada de inestabilidad por lanzamiento (semilla = `hash(semillaHechizo, nºLanzamiento, 1)`; `semillaHechizo` es
la aleatoria de creación, 2.6, así que dos copias con la misma receta pero creadas por separado tiran secuencias
distintas, y un hechizo importado tira la misma que su original):
| Resultado | Probabilidad | Efecto en ataque | En buff | En teletransporte |
|---|---|---|---|---|
| Sobrecarga | 0,25·I | ×1,5 potencia + debuff físico o mental extra 4 s al objetivo | +50 % duración | +50 % alcance + estallido en origen |
| Normal | resto | — | — | — |
| Contragolpe físico | 0,35·I | Pagas 10 % de vida máx. **o** debuff físico propio 4 s | Se aplica el inverso | Apareces desviado 2–4 m y −30 aguante |
| Contragolpe mental | 0,15·I | Debuff mental propio 3 s (Mente clara ⇒ Normal) | Se aplica el inverso | Desorientación (Confusión 2 s) |

Con I = 100: 25 % sobrecarga, 25 % normal, 50 % contragolpe. **Visual:** I < 20 círculo estable; 20–50 parpadea;
> 50 se agrieta (el círculo de runas de `prototipo/vfx/vfx.js` se parametriza con `inestabilidad`).

### 2.12 Encantamientos e inscripciones

| | Temporal (hechizo) | Permanente (inscripción rúnica) |
|---|---|---|
| Dónde | En cualquier lugar (destino Arma/Armadura) | Altar rúnico o forja de asentamiento |
| Duración | 30–120 s (60 s base; Duración la sube) | Indefinida |
| Límite | 1 en la espada y 1 por armadura (el escudo, si se lleva, cuenta como armadura) | 1 / 2 / 3 huecos según calidad (común / fina / maestra) |
| Coste | Maná; reserva 10 % si ≥ 60 s | Materiales **del bolso mágico**: tinta rúnica + esquirla del elemento (+ polvo arcano para compuestos) |
| Potencia | 100 % de la tabla 2.4 | 60 % de la tabla 2.4 |
| Contenido | Núcleo + modificadores | 1 pieza de núcleo por hueco (elemento, compuesto o efecto pasivo) |
| Cambiar | Se sustituye al relanzar | Borrar y regrabar; borrar devuelve 50 % de materiales |

Temporal y permanente se suman; si comparten elemento, gana el de mayor potencia (no se duplica). Los
encantamientos temporales **no** cuentan para el tope de 3 bendiciones. Huecos de inscripción por calidad de la
pieza: común 1 / fina 2 / maestra 3 (aplica a la espada, a cada parte de la armadura modular y al escudo opcional). Borrar devuelve el
50 % de materiales (redondeo abajo) [SUPUESTO].

**Bolso mágico** (decisión del usuario): el jugador lo tiene desde que despierta al inicio; sin peso ni carga;
pestañas Armas / Armaduras / Objetos y materiales. En lo que afecta a la magia, contiene los materiales para
**crear magia nueva** (2.13) e **imbuir/inscribir** objetos, y las esquirlas rúnicas de Piedra de paso (2.7).
Materiales mágicos [SUPUESTO]: *tinta rúnica* (origen en 2.13), *pigmento* (1 por bioma), *polvo de esquirla*,
*esquirla del elemento* (7 tipos), *polvo arcano*, *esquirla rúnica*.
El detalle del bolso, pociones (pocas y simples), comercio y armadura modular por partes corresponde a
`docs/GDD.md` (`disenador-juego`).

### 2.13 Creación de hechizos: grimorio y mutación

**(A) Grimorio:** combinar libremente runas conocidas; solo en altares y campamentos (no en combate). Grimorio
ilimitado con favoritos y archivo; equipados 6–8 (2.11). Nombres generados (2.6) y renombrables. Las runas se
aprenden explorando (santuarios, ruinas, cultistas) y por mutación. **Grabar** una receta nueva (crear o importar)
consume **1 tinta rúnica** del bolso (decisión del usuario); sin tinta queda como *borrador* (visible, no
equipable). Editar una receta propia no consume materiales y conserva su semilla; la variante de mutación elegida
tampoco gasta tinta (decisión del usuario).

**Tinta rúnica — origen (opción C mixta, decisión del usuario):**
| Vía | Regla | Números (decisión del usuario) |
|---|---|---|
| Fabricar | En altar rúnico: pigmento (planta o mineral, distinto por bioma) + polvo de esquirla. La 1.ª receta de fabricación viene en el bolso (del Tejedor que fue su dueño) | 1 pigmento + 1 polvo de esquirla ⇒ 2 tintas |
| Comprar | Mercaderes; barata y con stock limitado que se repone cada día de juego | 15 monedas c/u; 3 por mercader y día |
| Encontrar | Botín fijo en ruinas y santuarios de los Tejedores | 1–3 por ruina/santuario (no reaparece) |
**Libro físico** (decisión del usuario): el grimorio es un libro; aprender una runa o grabar un hechizo nuevo
(crear, importar o mutar) genera **una hoja nueva** con animación. Presentación y animación: `docs/GUIA_UI.md`
(`interfaz-ui`); aquí solo cuenta que cada entrada nueva = 1 hoja.

**Código compartible** (decisión del usuario: autocontenido, sin servidor):
| Aspecto | Regla |
|---|---|
| Formato | `FX` + versión + `-` + semilla + receta + checksum, p. ej. `FX1-9WMB-3F7A-K2QD`; grupos de 4 separados por `-` |
| Alfabeto | Crockford base32 (0–9, A–Z sin I, L, O, U). Al leer: mayúsculas/minúsculas iguales, O→0, I/L→1, guiones y espacios ignorados |
| Contenido | `semillaHechizo` (20 bits = **4 caracteres fijos**, decisión del usuario) + receta canónica (piezas ordenadas) de longitud variable. Total tras `FX1-`: ≈ 12 caracteres (3 grupos) en recetas simples, ≤ 28 (≈ 29 con prefijo) en la máxima con disparador e hijo. **Sin nombre** (se regenera de receta + semilla, 2.6) |
| Importar | Reproduce **exactamente** el hechizo de origen: misma semilla ⇒ mismo desempate, nombre, tiradas y mutaciones. Si ya existe en el grimorio una entrada con igual receta y semilla, no se duplica (sin hoja nueva) ni se gasta tinta (decisión del usuario) |
| Checksum | CRC de 10 bits (2 caracteres) sobre versión + semilla + receta [SUPUESTO]; código alterado ⇒ rechazo con mensaje |
| Versión | Cada versión del catálogo tiene tabla de migración: los códigos viejos siguen leyéndose; versión más nueva que el juego ⇒ rechazo «versión no soportada» |
| Nombre propio | Sufijo opcional fuera del checksum: `FX1-3F7A-K2QD~Mi saeta` (≤ 24 caracteres, texto saneado) |
| Extras | «Copiar como enlace» (`?receta=FX1-...`, abre el grimorio con la importación) y **tarjeta-imagen** (PNG con círculo de runas, nombre, subtítulo y código) |
| Runas no aprendidas | Opción C (decisión del usuario): la receta aparece en el libro (graba hoja y gasta tinta igual), **no se puede equipar ni lanzar** hasta aprenderlas todas; cada runa que falta se muestra como **silueta + pista** de dónde encontrarla (p. ej. «se dice que en las ruinas del desierto…»). Importar no enseña runas ni da XP |
| Pistas | Datos **por runa** en el catálogo: `pista: { texto, fuenteId }`, donde `fuenteId` apunta a su POI/santuario/enemigo de origen. Al aprender la runa, la silueta se sustituye por la runa y la pista desaparece |

**(C) Mutación:**
1. Cada impacto en combate real (enemigo hostil que pueda dañarte; no muñecos ni enemigos ya derrotados de nivel
   muy inferior) suma **resonancia**: +1 por impacto, +3 si provoca reacción. Umbral 100 [SUPUESTO].
2. Al llenarse se ofrecen **3 variantes** deterministas (`hash(semillaHechizo, nºMutación)`; con la semilla
   aleatoria de 2.6, la misma receta creada por separado ofrece variantes distintas, y una importada, las mismas
   que su original). La variante elegida es un hechizo nuevo con **semilla nueva** del RNG de la partida:
   - Cambio de una pieza de la misma categoría (elemento por elemento, modificador por modificador…). **La
     forma/destino nunca cambia y la escuela (2.2) se conserva siempre**: un candidato que cambie la escuela se
     descarta y se vuelve a tirar con la siguiente subsemilla.
   - +1 modificador (si ya hay 3, se convierte en cambio de pieza).
   - Rareza ≈ 5 %: una variante incluye una **runa desconocida** que se aprende al elegirla (≈ 1 % legendaria).
3. La elegida se guarda como **hechizo nuevo**; el **original nunca se borra** y su resonancia vuelve a 0.
4. Si no eliges, queda como **propuesta pendiente** (máx. 5; la sexta sustituye a la más antigua).
5. **Árbol genealógico** por hechizo (padre → hijos), visible en el grimorio.
6. Las variantes nunca se bloquean por nivel: muestran su margen, coste y % de fallo con el dominio actual.

### 2.14 Reglas de jefes

- Duración de control ×0,5. Rendimientos decrecientes por categoría (aturdir, inmovilizar, ralentizar, mental)
  en ventana de 20 s: 100 % → 50 % → 25 % → **inmune 10 s**.
- Inmunes a Miedo, Confusión, Sueño y Alucinación: se sustituyen por **Vacilación** (interrumpe 0,5 s).
- Debuffs de estadística (Debilidad, Marca, Vulnerabilidad, Sangrado, Fragilidad) al 60 %.
- Estasis 1 s; Congelado 1 s; Derribado solo con la barra de aturdimiento de jefe llena.
- Reflejo y Vacío no afectan a sus ataques marcados como **imparables** (señal roja).
- El cambio de fase limpia todos sus debuffs y le da 3 s de inmunidad a control.
- Detecta invisibilidad a 4 m y al recibir daño.
- **Rebobinar y Estasis funcionan** en salas de jefe: Estasis sobre el jefe dura 1 s y cuenta como *inmovilizar*
  (rendimientos decrecientes); Rebobinar solo afecta al jugador.

**Enemigos lanzadores de runas** (decisión del usuario): el **cultista mago**, los **jefes** y el **chamán goblin**
(enemigo **nuevo** respecto al MVP de §1; su ficha la completa `disenador-combate` junto con `disenador-juego`)
lanzan **recetas de runas** compiladas con el mismo `PlanHechizo` que el jugador (mismos topes, estados y
reacciones). Señal previa: el círculo de runas con el color/icono del elemento es visible durante todo el
lanzamiento, mínimo 0,5 s en enemigos [SUPUESTO]; Silencio y Desequilibrado lo interrumpen.
Pendiente con el usuario (2.18): recetas fijas o generadas con semilla por zona, inestabilidad y aprendizaje de runas.

### 2.15 Accesibilidad

- **Ajustes → "Efectos de control suaves"** (desactivado por defecto): Confusión ⇒ −30 % movimiento + viñeta;
  Miedo ⇒ −25 % daño 4 s; Alucinación ⇒ los dobles se marcan con contorno; Ceguera ⇒ viñeta suave.
- Elementos identificables por **icono y forma de partícula**, no solo por color (daltonismo).
- Opción para reducir parpadeo del círculo inestable y la distorsión del Velo (fotosensibilidad).
- Avisos de inestabilidad también en texto/icono en el HUD.

### 2.16 Notas técnicas (para el arquitecto; requieren ADR)

- Runas como datos JSON en `juego/src/config/runas/` validados contra tipos TS (o `.ts` tipados, coherente con
  la regla de `config/combat/*.ts`): **decidir en ADR**.
- **Compilación:** receta → `PlanHechizo` (lista de pasos: `Emitir`, `Mover`, `Impactar`, `AplicarEstado`,
  `Reaccionar`, `Disparar(hijo)`), calculado una vez al guardar en el grimorio. Lógica pura, testeable con Vitest.
- RNG con semilla por hechizo y por lanzamiento; mutación con `hash(semilla, nºMutación)`.
- **Escala de tiempo por entidad** (`timeScale`) en todos los sistemas; en Rapier se aproxima escalando velocidades
  dentro de burbujas.
- **Rebobinar:** búfer circular solo del jugador, 5 s a 10 Hz (50 instantáneas de posición, vida y aguante).
- **Viaje largo:** transición 1–3 s con precarga de celdas destino; el streaming debe exponer una "precarga forzada".
- **Zonas de anulación:** volúmenes de datos en celdas y dungeons; la consulta la hace el sistema de magia.
- **Dependencia:** las inscripciones permanentes (2.12), grabar recetas (2.13) y crear Piedras de paso (2.7)
  consumen materiales del **bolso mágico** (inventario sin peso, pestañas; detalle en `docs/GDD.md`). El bolso
  y el crafteo básico (materiales, altar/forja) deben planificarse antes que esas features.
- **Guardado:** persisten XP, afinidad, grimorio (incluidos borradores y runas bloqueadas de recetas importadas)
  y Piedras de paso (posición y orden).
- **Código compartible:** codificador/decodificador puro ({semilla 20 bits, receta canónica} ⇄ bits ⇄ Crockford
  base32 + CRC-10), con tabla de catálogo por versión y migraciones. `semillaHechizo` se tira con el RNG de la
  partida al crear/mutar y **se guarda** con cada entrada del grimorio; el RNG de partida debe ser serializable
  para que los tests sean deterministas. Pistas de runa como datos del catálogo con `fuenteId` validado. Lectura de
  `?receta=` al arrancar; tarjeta-imagen generada en cliente (canvas → PNG). Sin backend.
- **Enemigos lanzadores:** la IA usa el mismo compilador de recetas; el sistema de magia no distingue lanzador.
- **Nombres:** generador puro receta → {nombre rúnico, subtítulo}; tablas de raíces/enlaces/terminaciones como datos.
- **Progresión:** contador de usos por hechizo en ventana de 1 h de juego (persistente, ver Guardado).
- **Caballo:** el Velo y el planeo/impulso se aplican a la entidad montura + jinete.
- **VFX compartidos** (~15–25 piezas parametrizadas por color/intensidad): círculo de runas, núcleo, estela,
  impacto, explosión, zona, muro, haz, cadena, aura de arma, aura de armadura, cúpula, nube, refracción, portal,
  piedra de paso, chispas. Partir de `prototipo/vfx/vfx.js`.
- **Glifos de runas:** procedurales (gramática de trazos por elemento y forma); detalle en `docs/GUIA_VISUAL.md`.

### 2.17 Reglas comprobables (para qa-tester y planificador)

| ID | Regla | Test |
|---|---|---|
| M-01 | Máx. 4 núcleo, 3 modificadores, 1 runa de control (hueco propio), 1 disparador, hijo sin disparador | Validador rechaza recetas que lo violan; 3 mods + Ancla es válida |
| M-02 | Ningún bloqueo por nivel: toda receta válida se equipa y lanza a nivel 1 | Equipar y lanzar Ejemplo A a nivel 1 |
| M-03 | Coste base, lanzamiento y recarga según 2.11 (con M = 0) | Ejemplos 1–3 dan 51/44/50 de maná y C 9/8/11 |
| M-04 | Inestabilidad según 2.11 | Ejemplos 1–3 dan 25/15/40 % |
| M-05 | Tirada determinista | Misma semilla y nº de lanzamiento ⇒ mismo resultado |
| M-06 | Distribución de resultados | 10 000 tiradas con I = 100 ⇒ sobrecarga 25 / normal 25 / físico 35 / mental 15 % (± 1 %) |
| M-07 | Prioridad arcano > legendaria > generada | Resolver núcleos de prueba |
| M-08 | Fusión descubierta ocupa 1 hueco y par opuesto +15 | Unitario de núcleo |
| M-09 | Reacción consume estado y respeta recarga 1,5 s | Simulación de 2 golpes seguidos |
| M-10 | Fuego sobre Congelado = Vapor ×2 | Daño esperado en unitario |
| M-11 | Topes de entidades (24/64 proyectiles, 6 saltos, 8 instancias) | Estrés con Multiplicar + Eco |
| M-12 | Máx. 3 bendiciones; mismo buff renueva | Aplicar 4 buffs y repetir uno |
| M-13 | Reserva de maná de buffs ≥ 60 s | Maná actual ≤ máx. − reserva |
| M-14 | Contragolpe en buff aplica inverso | Forzar resultado y comprobar estado |
| M-15 | Velo: rompe al atacar, no al lanzar alteración; máx. 10 s | e2e con `?test=1` |
| M-16 | Zona de anulación bloquea lo listado y no gasta maná; Destello funciona | e2e en dungeon |
| M-17 | Velocidad aérea ≤ 21 m/s y techo 300 m | Simulación de planeo + impulso |
| M-18 | Mutación: original intacto, nuevo hechizo, resonancia a 0 | Unitario de grimorio |
| M-19 | Mutación determinista | Mismas 3 variantes con misma semilla y nº |
| M-20 | Jefes: rendimientos decrecientes y sustitución mental | Aplicar 4 aturdimientos en 20 s |
| M-21 | Opción accesible sustituye Confusión/Miedo | Unitario con ajuste activo |
| M-22 | Piedras de paso ≤ 5 y nunca en dungeons ni santuarios | Crear la 6.ª ⇒ pide borrar; crear en dungeon o santuario ⇒ rechazo sin gastar maná ni esquirla |
| M-23 | Margen ≥ 0 nunca falla por ejecución | 10 000 lanzamientos con M ∈ {0, 5} ⇒ 0 fallos |
| M-24 | P_fallo = min(78 %, 12 % × d) | 10 000 tiradas con d = 3 ⇒ 36 % ± 1,5; con d = 9 ⇒ 78 % ± 1,5 |
| M-25 | Coste y fallo según margen | Ejemplo A ⇒ 72 maná, 78 %; Ejemplo B ⇒ 18 maná, 0 % |
| M-26 | Fallo de ejecución ≠ inestabilidad | Fallo forzado: sin efecto, gasta 50 %, sin tirada de inestabilidad; contragolpe solo si d ≥ 5 |
| M-27 | Explorar da ≥ 3× más XP por hora que lanzar | Perfil simulado de 1 h: uso máximo ≤ 25 XP; perfil de exploración de referencia ≥ 75 XP |
| M-28 | Rendimientos decrecientes del uso | 50 lanzamientos del mismo hechizo en 1 h ⇒ ≤ 4 XP; muñecos ⇒ 0 |
| M-29 | Afinidad sube dominio solo con su elemento | Afinidad Fuego 3 no cambia el margen de un hechizo de dominante Hielo |
| M-30 | Equipados = 6 + arcanos (máx. 8) | 0 arcanos ⇒ 6; 2 arcanos ⇒ 8 |
| M-31 | Rebobinar/Estasis en sala de jefe; Velo y planeo a caballo | e2e: Estasis al jefe 1 s; Velo oculta caballo; planeo montado ≤ 21 m/s |
| M-32 | Código: ida y vuelta | Para un lote de recetas (incl. la máxima con disparador e hijo) y semillas (incl. 0 y 2²⁰−1): `decodificar(codificar(r, s)) = (r, s)` canónica; mismo hechizo compilado |
| M-33 | Código: alfabeto y longitud | Solo caracteres Crockford en grupos de 4; los 4 primeros tras `FX1-` son la semilla; Proyectil + 1 elemento ⇒ ≤ 12 caracteres tras `FX1-`; receta máxima ⇒ ≤ 28 |
| M-34 | Código: lectura tolerante | Minúsculas, O/0, I/L/1, espacios y guiones extra ⇒ misma receta |
| M-35 | Código: checksum | Cambiar cualquier carácter de 1 000 códigos ⇒ 100 % rechazados sin crear entrada |
| M-36 | Código: versión | Código v1 se lee con catálogo v2 (migración); versión mayor que la del juego ⇒ rechazo «versión no soportada» |
| M-37 | Código con semilla y sin nombre | Mismo código con y sin sufijo `~Nombre` ⇒ misma receta y misma semilla; el sufijo solo cambia el nombre mostrado. Importar un código ⇒ hechizo idéntico al de origen: misma semilla, mismo nombre generado, mismas 10 primeras tiradas de lanzamiento y mismas 3 variantes de mutación |
| M-38 | Importar con runas no aprendidas (opción C) | Entrada visible en el libro; equipar/lanzar ⇒ rechazo; cada runa ausente se muestra como silueta con el texto de su pista; al aprender todas ⇒ equipable y lanzable y las siluetas desaparecen; importar no da XP ni enseña runas |
| M-39 | Enlace `?receta=` | e2e: abrir URL con código válido ⇒ grimorio muestra la importación; código inválido ⇒ aviso, sin entrada |
| M-40 | Nombre generado determinista | Con `SEMILLA_REF`, ejemplos 1–3 ⇒ Asharvel / Bronystor / Veshismar con sus subtítulos de 2.6; nombre ≤ 12 caracteres para todas las recetas generables |
| M-41 | Nombre en HUD y accesibilidad | Ranura del HUD muestra solo el nombre rúnico; tooltip/grimorio y `aria-label` incluyen el subtítulo |
| M-42 | Piedra de paso: coste y material | Crear ⇒ −60 maná y −1 esquirla rúnica; sin esquirla ⇒ rechazo sin gastar maná |
| M-43 | Piedra de paso: colocación | Rechazo sin gastar nada con: enemigo en alerta a 39 m, agua, en el aire/planeando, pendiente 31°, otra piedra a 299 m; aceptada a 41 m / 30° / 300 m |
| M-44 | Piedras persisten | Guardar y cargar ⇒ mismas 5 piedras (posición y orden) |
| M-45 | Niebla negra cubre al caballo | e2e: jinete montado dentro de la nube no detectado a > 6 m |
| M-46 | Mutación conserva forma y escuela | 10 000 mutaciones con semillas distintas ⇒ 0 cambios de forma/destino y 0 cambios de escuela |
| M-47 | Inscripciones con materiales del bolso | Inscribir consume tinta + esquirla del elemento (+ polvo arcano en compuestos); común/fina/maestra ⇒ 1/2/3 huecos; borrar devuelve ⌊50 %⌋ |
| M-48 | Grabar receta cuesta tinta | Con 1 tinta ⇒ receta lanzable y tinta 0; sin tinta ⇒ borrador no equipable; mutar y editar no consumen |
| M-49 | Enemigos lanzadores usan recetas | Cultista, chamán goblin y jefe: hechizo compilado con el mismo `PlanHechizo`; círculo visible ≥ 0,5 s antes del efecto; Silencio lo interrumpe |
| M-50 | XP de contenido (opción A) | Suma T de XP del catálogo de contenido: 3.200 ≤ T < 4.571 (así, sin XP de uso, obtener < 70 % de T ⇒ nivel < 10); con el catálogo actual T ≈ 3.780 |
| M-51 | Semilla aleatoria al crear | Desde el mismo estado del RNG de partida, crear una receta ⇒ misma `semillaHechizo` (determinismo); crearla 2 veces seguidas ⇒ semillas distintas; Ejemplo 2 con 2 semillas que empaten distinto ⇒ dominante y nombre distintos; editar conserva la semilla; mutar asigna semilla nueva |
| M-52 | Pistas de runa como datos | Las 18 runas aprendibles tienen `pista.texto` no vacío y `pista.fuenteId` que existe en el catálogo de POI/fuentes |
| M-53 | Hoja nueva en el libro | Aprender una runa o grabar/importar/mutar un hechizo ⇒ +1 hoja en el grimorio (evento `hojaNueva` en `window.__GAME__`); editar no añade hoja; importar un duplicado exacto ⇒ ni hoja ni tinta |
| M-54 | Tinta: vías de obtención | Fabricar en altar con 1 pigmento + 1 polvo ⇒ +2 tintas (fuera de altar ⇒ rechazo sin gastar); partida nueva ⇒ receta de tinta ya conocida; comprar 4.ª tinta al mismo mercader el mismo día ⇒ rechazo, al día siguiente stock = 3; saquear ruina de Tejedores ⇒ +1–3 una sola vez; grabar con 0 tinta ⇒ borrador; elegir variante de mutación con 0 tinta ⇒ hechizo nuevo lanzable y tinta sigue en 0 |
| M-55 | Piedra de paso: viajar | e2e: en Mapa del libro-menú, confirmar destino válido ⇒ animación de portal, luego transición 2–3 s con precarga, llegada a la piedra, −30 maná y recarga 120 s; con enemigo en alerta a 39 m, recarga activa, maná < 30 o dentro de dungeon ⇒ destinos deshabilitados, maná y recarga sin cambios |

### 2.18 Preguntas abiertas

*Resueltas antes:* runas de control (hueco propio), progresión del mago (2.11, sin bloqueos), Velo y planeo a
caballo (sí), Rebobinar/Estasis en jefes (sí).

*Resueltas ahora (decisiones del usuario):*
1. **RESUELTO — Código compartible:** autocontenido sin servidor, `FX` + versión + semilla + receta + checksum en
   Crockford base32, longitud variable, nombre fuera del código, enlace y tarjeta-imagen (2.13; M-32–M-39).
   **Semilla (opción B):** aleatoria al crear, viaja en el código (+4 caracteres); importar reproduce el hechizo
   exacto (2.6, 2.11, 2.13; M-37, M-51). **Runas no aprendidas (opción C):** visible, no equipable, silueta + pista
   por runa (2.13; M-38, M-52).
2. **RESUELTO (parcial) — Enemigos con runas:** sí, cultista mago, jefes y chamán goblin (nuevo) (2.14; M-49). Lo pendiente pasa a la pregunta 13.
3. **RESUELTO — Piedras de paso:** persisten en el guardado; Niebla negra afecta al caballo; máx. 5 + 1 esquirla
   rúnica por piedra; colocación [SUPUESTO] fuera de combate, suelo firme, ≥ 300 m, nunca en dungeons ni santuarios (2.7, 2.9, 2.10; M-22, M-42–M-45).
4. **RESUELTO — Mutación:** nunca cambia forma/destino; la escuela se conserva (2.13; M-46).
5. **RESUELTO — Inventario:** bolso mágico sin peso con pestañas; materiales para crear magia e inscribir;
   armadura modular y comercio (2.12, 2.16; M-47, M-48). Detalle en `docs/GDD.md` (`disenador-juego`, aún no existe).
6. **RESUELTO — Ritmo de XP:** opción A «Ajustado» (18 runas, 21 fusiones, 4 legendarias, 2 arcanos, ≈ 60 POI,
   10 altares, ≈ 40 entradas ⇒ ≈ 3.780 XP; nivel 10 ≈ 80 % del mundo, ≈ 25 h) (2.7, 2.11; M-50). Nº de POI
   (50–70 en `contexto/CONTEXTO_PROYECTO.md`) y reparto por bioma: los valida `disenador-juego`.
7. **RESUELTO — Nombres:** híbrido lengua rúnica + subtítulo castellano (2.6; M-40, M-41). Tono final de raíces y
   terminaciones: validar con `disenador-juego`.
8. **RESUELTO — Supuestos validados:** las 4 legendarias (Obsidiana, Tormenta solar, Ciclón de cristal, Coro de
   almas) y las 4 de reserva para expansiones (2.7); 1 tinta rúnica por grabar receta y grimorio como libro físico
   con hoja nueva animada (2.13; M-48, M-53; UI en `docs/GUIA_UI.md`); borrar piedra no devuelve la esquirla (2.7).
9. **RESUELTO — Origen de la tinta rúnica (opción C mixta):** fabricar en altar (pigmento por bioma + polvo de
   esquirla), comprar a mercaderes (stock diario) y encontrar en ruinas/santuarios de los Tejedores (2.13; M-54).
10. **RESUELTO — Supuestos de semilla:** editar un hechizo conserva su semilla; importar un duplicado exacto (misma
   receta y semilla) no crea hoja ni gasta tinta (2.6, 2.13; M-51, M-53).
11. **RESUELTO — Supuestos de tinta:** la mutación elegida no gasta tinta; la 1.ª receta de tinta viene en el bolso;
   fabricar 1 pigmento + 1 polvo ⇒ 2 tintas; comprar a 15 monedas c/u, 3 por mercader y día; encontrar 1–3 por
   ruina/santuario, sin reaparecer (2.13; M-48, M-54). Moneda y mercaderes: `docs/GDD.md`.
12. **RESUELTO — Ranuras equipadas:** se mantiene M-30 (6 + 1 por arcano, máx. 8). Controles de lanzamiento por
   ranura y de la habilidad del arma: definidos en `docs/GUIA_UI.md` (2.11).

*Abiertas:*
13. Enemigos lanzadores: ¿recetas fijas por enemigo o generadas con semilla por zona? ¿Sufren inestabilidad
   (propuesta pendiente: sí, visible con el círculo agrietado como oportunidad para el jugador)? ¿Derrotarlos
   enseña sus runas?
14. Ficha de combate del chamán goblin (vida, resistencias, patrones, telegraphing): pendiente con `disenador-juego`
    al rellenar §1.
