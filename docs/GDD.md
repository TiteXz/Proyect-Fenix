# GDD — Proyecto Fénix

Documento del rol `disenador-juego`. Fija mecánicas, reglas, progresión, niveles y mundo. Todo lo marcado
**[SUPUESTO]** es una propuesta del diseñador pendiente de validar; lo demás es decisión del usuario. Los
valores ajustables vivirán como datos en `juego/src/config/` (nunca dentro de los sistemas); cada tabla indica su
fichero propuesto. Combate, magia y balance viven en `docs/COMBATE.md`; aquí solo se referencian.
Ante conflicto con `contexto/CONTEXTO_PROYECTO.md`, manda CONTEXTO. Simulación a 60 Hz: 1 tick = 16,7 ms.

---

## 1. Resumen y pilares

**Resumen.** Acción/RPG ligero en tercera persona para navegador. Despiertas sin recuerdos en Valdera, 300 años
después de «la Pausa», con un bolso mágico. Exploras a pie y a caballo un mundo abierto luminoso, limpias campamentos,
ganas monedas, mejoras espada y magia, y entras en el **Patio del castillo en ruinas** (5 oleadas + jefe) para liberar
al Guardián. Tras el final, el mundo sigue abierto.

| # | Pilar | Cómo se comprueba en el MVP |
|---|---|---|
| P1 | **Combate con decisiones** (cada herramienta tiene un papel) | Ningún enemigo se vence de forma óptima con una sola acción: esqueleto (contundente/luz), goblin (escudo o desvío), cultista (cerrar distancia) |
| P2 | **Arma + magia combinadas** | Las interacciones de CONTEXTO (escarcha → espada, fuego sobre congelado, luz contra no-muertos) aparecen en los 15 primeros minutos |
| P3 | **Respuesta inmediata** | Todo golpe tiene hit-stop, sonido y partícula; el input nunca se pierde (buffer §3.3) |
| P4 | **Mundo que invita a explorar sin perder fluidez** | Desde cualquier punto del camino se ve al menos un punto de interés o señal (humo, torre, luz) a ≤ 400 m [SUPUESTO] |

**Regla de los primeros 30 s:** combate real antes de los 30 s de partida nueva (§7.2, escena 0).

## 2. Bucle principal

| Escala | Bucle | Recompensa |
|---|---|---|
| **30 s** | Ver amenaza → acercarse → leer dirección del golpe → parar/esquivar → castigar con espada o hechizo → remate | Hit-stop, monedas que vuelan al jugador, remate invulnerable |
| **5 min** | Viajar (a pie o a caballo) hacia una señal → limpiar un campamento o patrulla → abrir cofre → descansar en un punto de descanso | Monedas, botín vendible, punto de descanso activado (respawn + autoguardado), POI en la brújula |
| **Sesión (30–60 min)** | Volver a la Aldea del Vado → gastar (mejoras, ampliación del bolso, pociones, hechizo) → fijar un objetivo mayor: encargo, santuario, zona nueva o el dungeon | Nueva capacidad (escudo, hechizo, +4 casillas, mejora) que cambia cómo se juega la siguiente sesión |
| **Arco del MVP (3–5 h; 8–10 h completista)** [SUPUESTO] | Despertar → Aldea → escudo (encargo) → Lanza de escarcha (santuario) → Destello sagrado (mercader) → dungeon → final → mundo abierto | Escena final con la voz del Guardián; dungeon rejugable |

Ritmo objetivo [SUPUESTO]: un encuentro cada 60–120 s de recorrido por camino; un punto de descanso cada 1–1,5 km.

## 3. Controles y sensación (game feel)

### 3.1 Controles (teclado + ratón; mando en el hito de pulido)
Fuente: CONTEXTO «Público y plataforma» y COMBATE §1.1 (combate, no se duplica aquí).

| Acción | Teclado + ratón | Mando | Nota |
|---|---|---|---|
| Mover / cámara | WASD / ratón | Stick izq. / der. | WASD nunca marca dirección de combate |
| Esprintar | Shift (a pie) [SUPUESTO] | L3 | A caballo, Shift = galope |
| Esquivar | Espacio | ○ [SUPUESTO] | |
| Atacar / bloquear / dirección / habilidad | Clic izq. / clic der. / ratón con botón mantenido / G | R1 / L1 / stick izq. / L1+R1 | COMBATE §1.1 M-1 a M-4 |
| Hechizos | Q / E / R (CONTEXTO) o 1–3 (GUIA_UI §5.1) | L2 + cara | **Conflicto a resolver por `interfaz-ui`** (§10.10). En el MVP solo hay 3 hechizos |
| Fijar objetivo | Clic central [SUPUESTO] | R3 [SUPUESTO] | |
| Poción de vida / de maná | Z / X [SUPUESTO] | Cruceta ▼ / ◄ [SUPUESTO] | |
| Interactuar / montar | F / F mantenida 0,5 s | ✕ / ✕ mantenida | Lejos del caballo, F mantenida = silbar |
| Alternar EP/EE | V | Cruceta ▲ | Solo fuera de combate |
| Pausa = libro | Esc | OPTIONS | Pausa la simulación (GUIA_UI §1) |

**Sin salto ni nado en el MVP [SUPUESTO]:** Espacio es esquiva. El personaje sube solo escalones ≤ 0,45 m; pendiente
máxima transitable 45° (a caballo 35°). Agua: se vadea hasta 1,2 m de profundidad; más allá, colisión blanda en la
orilla. Las islas son visibles pero inaccesibles hasta la fase 4 (barcos).

### 3.2 Movimiento (`juego/src/config/movimiento.ts`, `caballo.ts`) [SUPUESTO]
| Parámetro | A pie | A caballo |
|---|---|---|
| Andar / correr / esprint | 2,0 / 5,5 / 7,5 m/s | paso 4 / trote 8 / galope 14 m/s (galope de COMBATE §2.10) |
| Aceleración 0 → correr | 0,15 s | 0 → galope 1,2 s |
| Frenada correr → 0 | 0,10 s | galope → 0 en 1,0 s |
| Giro | 720°/s (instantáneo < 90° a baja velocidad) | 180°/s al galope, 360°/s al paso |
| Esprint | Sin coste fuera de combate; en combate 10 aguante/s | Galope sin coste en el MVP |
| Con guardia | 50 % (EP) / 40 % (EE) de correr (COMBATE) | No se bloquea ni ataca montado en el MVP |
| Caída | Daño = (altura − 6 m) × 8 si > 6 m; ≥ 18 m es letal | El caballo no se lanza desde > 4 m (se frena en el borde) |

**Caballo:** montar/desmontar 0,6 s. Silbar (F mantenida a > 4 m): aparece fuera de cámara a ≤ 60 m y llega al trote.
No entra en asentamientos (se queda en la entrada), ni en el dungeon. No muere: recibir ≥ 20 de daño montado o chocar a
galope desmonta al jugador y el caballo huye 30 m; vuelve al silbar.

### 3.3 Sensación (`juego/src/config/feedback.ts`) [SUPUESTO; COMBATE §1 puede ajustarlo]
| Elemento | Valor |
|---|---|
| **Buffer de input** | 0,15 s (9 ticks) para ataque, esquiva, hechizo, poción e interactuar: lo pulsado durante la recuperación se ejecuta en el primer tick posible |
| **Coyote time** | 0,10 s (6 ticks): al salir de un borde se puede iniciar esquiva o ataque como si se estuviera en el suelo |
| **Cancelación** | La esquiva cancela la recuperación del ataque ligero a partir del 60 % del clip (propuesta para COMBATE) |
| **Hit-stop** (rango de GUIA_VISUAL: 60–90 ms) | Ligero 60 ms · fuerte 75 ms · parada perfecta 90 ms · remate 90 ms (en el impacto) · jugador golpeado 60 ms |
| **Sacudida de cámara** (amplitud / duración) | Ligero 0,02 / 0,10 s · fuerte 0,05 / 0,15 s · golpe recibido 0,06 / 0,20 s · explosión de fuego 0,08 / 0,25 s · golpe imparable del jefe 0,12 / 0,35 s. Escalable 0–100 % y desactivable |
| **Retroceso** | Enemigo golpeado 0,3 m (fuerte 0,8 m); jugador golpeado 0,5 m |
| **Imán de monedas** | Radio 4 m, recogida automática en 0,3 s |
| **Esquiva** (propuesta para COMBATE §1) | 0,45 s, 3,5 m, invulnerable de 0,05 s a 0,30 s, aguante 15 (EE +5) |

### 3.4 Muerte y reaparición (decisión del usuario; detalle [SUPUESTO])
| Dónde | Regla |
|---|---|
| Mundo | Pantalla «Caíste» 2,0 s → fundido → reaparece en el **último punto de descanso usado o activado** con vida, aguante y maná al 100 %. **Conserva monedas, bolso y mejoras.** Los enemigos del encuentro recuperan la vida; los muertos siguen muertos. Las pociones gastadas no vuelven. La hora no cambia |
| Dungeon | Reaparece al **inicio de la oleada actual** (oleada completa de nuevo; la tienda no se repite). En el jefe, al inicio del combate (fase 1). Intentos ilimitados. Conserva todas las monedas |
| Partida nueva sin descanso activado | Reaparece en el Torreón caído (inicio) |

### 3.5 Guardado (decisión del usuario; detalle [SUPUESTO]) (`juego/src/config/guardado.ts`)
- **Una partida** con **1 ranura manual + 1 autoguardado**. «Continuar» carga el más reciente. «Nueva partida» pide confirmación.
- **Manual:** desde el libro (la pausa, GUIA_UI §1), solo si **no hay enemigos en alerta** y **fuera del dungeon**.
  Guarda la posición exacta. Si no se cumple, el botón está deshabilitado con el motivo («En combate» / «No se puede
  guardar dentro del castillo»).
- **Autoguardado:** al descansar o activar un punto de descanso; al entrar en un asentamiento (máx. 1 cada 2 min); al
  cerrar la tienda del mercader; al salir del dungeon (victoria o abandono); al ver el final; cada 5 min si se cumplen
  las condiciones del manual; al ocultar la pestaña (`visibilitychange`) solo si se cumplen.
- **Contenido:** lo de CONTEXTO «Persistencia» más: puntos de descanso activados y último usado, POI descubiertos,
  hechizos aprendidos, configuración EP/EE, estado del encargo, banderas de NPC (reconocido, mercader enfadado hasta),
  stock del mercader y día, fragmentos del Códice, final visto. Versión de esquema para migraciones (arquitecto).

## 4. Mecánicas (reglas exactas y números iniciales)

Combate, hechizos, enemigos, daño y estados: **`docs/COMBATE.md` §1**. Aquí, el resto de mecánicas del MVP.

### 4.1 Recursos del jugador (propuesta inicial hasta que COMBATE §1 fije la fórmula) [SUPUESTO]
| Recurso | Base | Regeneración |
|---|---|---|
| Vida | 100 | No se regenera sola; pociones, Destello sagrado, descansar |
| Aguante | 100 | 30/s tras 0,8 s sin gastar |
| Maná | 100 | 2/s siempre; descansar lo llena |

### 4.2 Puntos de descanso (`mundo/descanso.ts`) [SUPUESTO]
Hoguera con estandarte en asentamientos y caminos (≈ 20–25 en el mapa). Primera interacción = activar. Descansar (F):
vida/aguante/maná al 100 %, fija el punto de reaparición, autoguarda y ofrece **esperar** hasta amanecer (06:00),
mediodía (12:00) o anochecer (20:00) con fundido de 2 s. Cuenta como «campamento» para COMBATE §2.13. No reaparece
enemigos. No se puede descansar con enemigos en alerta a ≤ 30 m.
Ciudad de la Roca: 4 puntos (plaza, nicho del desfiladero, pozo N3, posada de pago) + 1 en la biblioteca tras el jefe;
detalle y reglas en §7.6.1. Cuentan dentro de los 20–25 del mapa.

### 4.3 Ciclo día/noche (`mundo/tiempo.ts`)
1 día = 24 min reales (CONTEXTO) ⇒ 1 h de juego = 1 min real. Partida nueva a las 08:00. Amanecer 06:00, anochecer 20:00.
Al **amanecer**: se repone el stock del mercader, se limpia su enfado y reaparecen las **patrullas** de mundo; los
**campamentos** despejados siguen despejados (persisten) [SUPUESTO].

### 4.4 Interacción
F a ≤ 2,5 m del objeto/NPC más centrado en pantalla (cono 60°). Muestra el aviso con la acción. Cofres: abrir 0,8 s;
el contenido pasa al bolso; lo que no cabe se queda en el cofre (que sigue abierto y recuperable).

### 4.5 Comercio
- **Mercader de la Aldea del Vado** (único en el mundo; D-6): vende pociones, tinta rúnica, ampliaciones del bolso,
  mejoras y el pergamino de Destello sagrado; compra botín vendible. Horario 06:00–21:00 (§5.2). Stock diario §8.2.
- **Altar de ofrendas** (dentro del dungeon, entre oleadas; es un objeto, no un NPC): vende **mejoras** y pociones de
  vida. **No vende ampliaciones del bolso** (decisión del usuario) ni tinta.
- Comprar: monedas suficientes + (si es objeto) hueco en el bolso; si no, el botón se deshabilita con el motivo.

### 4.6 Encargo del MVP (1, opcional) [SUPUESTO]
El **anciano** pide despejar el *campamento goblin del Molino* (≈ 500 m de la Aldea; 3 goblins arqueros + 1 esqueleto
en patrulla cercana). Recompensa: **escudo viejo** (activa la configuración EE) + 40 monedas. Se acepta hablando con él;
se marca en la brújula; se cobra volviendo. Segundo encargo posible (CONTEXTO permite 1–2): fuera del MVP mínimo.

### 4.7 Reglas comprobables (para el planificador y qa-tester)
| ID | Regla | Test |
|---|---|---|
| G-01 | Movimiento | Mantener W en llano: velocidad 5,5 m/s ± 0,1 a los 0,15 s; soltar: 0 a los 0,10 s; Shift: 7,5 m/s; esprint en combate gasta 10 aguante/s, fuera no |
| G-02 | Buffer de input | Clic izq. 0,12 s antes del fin de la recuperación ⇒ el ataque sale en el primer tick libre; a 0,17 s ⇒ se descarta |
| G-03 | Caballo | F mantenida 0,5 s a ≤ 2,5 m monta; Shift al galope ⇒ 14 m/s; F mantenida a > 4 m ⇒ el caballo aparece a ≤ 60 m y llega; en el dungeon no se puede silbar |
| G-04 | Muerte en el mundo | Morir con 120 monedas ⇒ reaparece en el último descanso con 120 monedas y recursos al 100 % |
| G-05 | Muerte en el dungeon | Morir en la oleada 3 ⇒ reaparece al inicio de la oleada 3 con su composición completa; monedas iguales |
| G-06 | Guardado manual | Con enemigo en alerta o dentro del dungeon el botón está deshabilitado con motivo; fuera de combate guarda y recargar restaura posición (± 0,5 m), monedas, bolso, hora |
| G-07 | Autoguardado | Descansar ⇒ marca de tiempo del autoguardado nueva en `window.__GAME__`; «Continuar» carga la más reciente de las dos ranuras |
| G-08 | Bolso | §5.3 (B-01 a B-05) |
| G-09 | Mercader golpeado | Golpear al mercader a las 14:00 ⇒ interactuar muestra «Hoy no te vendo nada» y no abre la tienda; a las 05:59 igual; a las 06:00 abre |
| G-10 | NPC inmortal | Cualquier daño a un NPC no reduce nada ni lo mata; dispara la reacción de §5.2 |
| G-11 | Reconocimiento | Primera vez a ≤ 8 m del mercader ⇒ bocadillo una vez; recargar la partida y volver ⇒ no se repite |
| G-12 | Día/noche | Avanzar 24 min simulados ⇒ +24 h; al pasar por 06:00 el stock del mercader vuelve a su máximo |
| G-13 | Tienda entre oleadas | Tras limpiar la oleada N (1–5) se abre el altar; no ofrece ampliaciones; la oleada N+1 empieza solo al pulsar «Continuar» |
| G-14 | Abandonar dungeon | Desde la pausa ⇒ vuelve al portón del mundo con las monedas ganadas y el progreso de oleadas a 0 |
| G-15 | Final | Vencer al jefe ⇒ escena final, créditos, el jugador vuelve al mundo; `finalVisto = true` persiste y el dungeon pasa a modo rejuego (§7.4) |
| G-16 | Descanso | Descansar con vida 30 ⇒ 100; con enemigo en alerta a ≤ 30 m ⇒ rechazado |

## 5. Entidades y objetos

### 5.0 Jugador
Recursos §4.1; movimiento §3.2; combate y configuraciones EP/EE en COMBATE §1.1. Empieza con: espada equipada,
**Bola de fuego**, bolso de 12 casillas con 2 pociones de vida, 2 tintas rúnicas y la receta de tinta del Tejedor
(objeto clave). 0 monedas.

### 5.1 Animales (fauna) — decidido que existen; detalle pendiente
- **Decisión del usuario:** Valdera tiene **animales** como fauna del mundo abierto.
- **Fase:** según la hoja de ruta de `contexto/CONTEXTO_PROYECTO.md`, los animales llegan en la **fase 3**; no entran en
  el MVP salvo que el usuario lo cambie. (El caballo del MVP es montura del jugador, no fauna.)
- **Supuesto mínimo [SUPUESTO]:** la fauna es **ambiental y no hostil por defecto** (da vida al mundo y no sustituye a
  los enemigos de `docs/COMBATE.md`). Sin especies, comportamientos, caza, botín ni domesticación fijados.
- Todo lo demás queda abierto en §10.11 (D-1 a D-4).

### 5.2 NPCs (habitantes) del MVP (decisiones del usuario 2026-11-25/26; detalle [SUPUESTO]) (`npcs.ts`)
| NPC | Dónde | Función | Rutina (hora de juego) |
|---|---|---|---|
| **Mercader** | Aldea del Vado, puesto de la plaza | Tienda (§4.5, §8.2) | 06–21 en el puesto (abierto); 21–06 en su casa (cerrado: «Vuelve por la mañana») |
| **Anciano** | Aldea del Vado | Cuenta la leyenda del Guardián (2–3 frases que rotan) y da el encargo (§4.6) | 07–12 banco de la plaza; 12–18 junto al vado; 18–22 hoguera; 22–07 casa |
| Aldeanos (4–6 en el Vado; 2–4 en cada otro asentamiento; ≤ 20 en total) | Asentamientos | Ambientales: frase suelta al interactuar | Trabajo de día, plaza al atardecer, casa de noche |

- **Interacción:** F abre la función del NPC (tienda o bocadillo). El protagonista es mudo: no se eligen frases.
- **Reconocimiento (D-8, decisión del usuario):** solo el **mercader** y el **anciano**, con **una frase suelta en
  bocadillo** (4 s) la **primera vez** que ven al protagonista (≤ 8 m, con línea de visión, fuera de combate). La bandera
  se guarda en la partida y no se repite. Frases [SUPUESTO]: mercader «¿Nos conocemos? Juraría que he visto esa cara…»;
  anciano «Esos ojos… mi abuela hablaba de unos ojos así».
- **Vida de los NPCs (D-9, decisión del usuario):** rutina ligada al día/noche (tabla); **se les puede golpear, no
  mueren** (no tienen vida) y **reaccionan**: 1.er golpe ⇒ queja en bocadillo y se cubren 1,5 s; 2.º golpe en < 20 s ⇒
  huyen a su casa y no salen en 60 min de juego [SUPUESTO]. Cuenta cualquier daño del jugador (espada o hechizo).
- **Mercader golpeado (decisión del usuario):** no vende **hasta el amanecer siguiente** (06:00). Interactuar ⇒ «Hoy no te
  vendo nada». Esperar en un punto de descanso hasta el amanecer lo resuelve.
- **Zona segura [SUPUESTO]:** los enemigos de mundo no entran en el radio de un asentamiento (patrullas lo rodean).
- Fuera del MVP: NPC recurrente que guíe la trama (D-7), NPCs modulares (fase 3), viajes entre asentamientos.
- **Ciudad de la Roca:** en el MVP cuenta como «otro asentamiento» (2–4 aldeanos dentro del tope de 20). En fase 2
  (servicios, arena, Archivista) tiene su **propio tope: ≤ 24 NPCs activos** (modelo, rutina, interacción) **+ multitud
  de fondo** (instancias/impostores sin IA ni interacción, no cuentan) [SUPUESTO]. Reparto en §7.6.2; el Archivista
  en §10.12. Los **rivales de la arena no son habitantes**: son combatientes con vida (excepción a G-10, §7.7).

### 5.3 Bolso mágico (decisión del usuario; detalle [SUPUESTO]) (`bolso.ts`)
| Regla | Valor |
|---|---|
| Casillas | Empieza con **12**; **sin peso** |
| Ampliación | Solo al **mercader de la Aldea del Vado**: **+4** por compra, en orden, cada vez más cara; tope **28** [SUPUESTO] (4 compras) |
| Precio de ampliación | 12→16: **100** · 16→20: **200** · 20→24: **350** · 24→28: **550** (total 1.200). Curva: cada salto +50 sobre el anterior |
| Qué ocupa casilla | 1 casilla por **pila**: pociones (pila máx. 5), tinta rúnica (10), materiales (20), botín vendible (10), cada arma/escudo no equipado (1) |
| Qué no ocupa | Monedas, objetos clave (receta de tinta, pergaminos ya leídos), lo **equipado** |
| Bolso lleno | No se recoge: aviso «Bolso lleno»; el objeto queda en el cofre. El botín vendible que suelta un enemigo sin hueco se pierde con aviso |
| Descartar | Desde el libro, con confirmación; el objeto desaparece |

Reglas comprobables: **B-01** partida nueva ⇒ 12 casillas, 3 ocupadas. **B-02** comprar ampliación con 100 monedas ⇒ 16
casillas y 0 monedas; la siguiente cuesta 200. **B-03** con 28 casillas el mercader no ofrece más ampliaciones. **B-04** el
altar de ofrendas nunca lista ampliaciones. **B-05** 6.ª poción con una pila de 5 y sin casilla libre ⇒ no se compra.

### 5.4 Objetos del MVP (`objetos.ts`) [SUPUESTO]
| Objeto | Efecto | Precio compra / venta |
|---|---|---|
| Poción de vida | +40 vida en 1,0 s; beber 0,8 s (anda al 50 %); 2 s entre pociones | 30 (altar: 45) / — |
| Poción de maná | +40 maná en 1,0 s; mismas reglas | 30 / — |
| Tinta rúnica | Grabar una hoja de hechizo (COMBATE §2.13; en el MVP, aprender Lanza de escarcha y Destello sagrado) | 15 (COMBATE) / — |
| Pergamino de Destello sagrado | Objeto clave: enseña la runa; se graba con 1 tinta en un punto de descanso | 200 / — |
| Escudo viejo | Habilita EE (COMBATE §1.1) | Recompensa del encargo / — |
| Abalorio | Botín vendible (15 % por enemigo) | — / 10 |
| Reliquia de la Orden | Botín vendible (cofres de ruinas) | — / 40 |

### 5.5 Enemigos
Fichas, estadísticas y comportamiento: COMBATE §1 (esqueleto guerrero, goblin arquero, cultista mago, jefe caballero
no-muerto). Aquí solo su papel en el mundo y su botín (§8.1). Grupos de mundo: 2–5 enemigos; ≤ 40 activos (CONTEXTO).

## 6. Progresión y dificultad

### 6.1 Progresión del jugador (sin niveles ni XP en el MVP; el nivel llega en fase 2)
| Eje | Cómo avanza | Fuente |
|---|---|---|
| Hechizos (3) | Bola de fuego al inicio · Lanza de escarcha en el **Santuario del Arroyo** (≈ 1 km de la Aldea; se graba con 1 tinta) · Destello sagrado: pergamino del mercader (200 + 1 tinta) [SUPUESTO] | Exploración + monedas (CONTEXTO) |
| Configuración EE | Escudo viejo del encargo (§4.6) | Encargo |
| Mejoras | Monedas en mercader o altar (§8.3) | Monedas |
| Bolso | +4 casillas por compra (§5.3) | Monedas |
| Conocimiento | Fragmentos del Códice en ruinas y estatuas (§10.4) | Exploración |

**Fase 2: la Ciudad de la Roca como nodo de progresión** [SUPUESTO; XP y recetas en COMBATE §2.7, §2.11]
| Eje | Fuente en la ciudad | Aporte |
|---|---|---|
| XP de arena | Primera victoria de cada rango y de cada rival (§7.7) | ≤ 290 XP en total (un solo cobro) |
| Magia | Biblioteca del subsuelo (§7.8.3): **Arcano de Espacio** garantizado + 5 recetas/runas opcionales | 1 de los 2 arcanos del catálogo; desbloquea **Piedra de paso** (viaje rápido de fase 2) |
| Reputación | Fama (arena) y Estima (ciudad) (§8.5) | Precios y recompensas, nunca poder de combate |
| Conocimiento | Glifos de umbral (puzle D), frases del Archivista, Tabla de las Horas | Entradas de Códice (10 XP c/u) |
Regla: la ciudad **no bloquea por nivel** (§10.6): se puede entrar al subsuelo a nivel 1; solo es más duro (amenaza 3).

### 6.2 Dificultad del mundo por zonas (`mundo/zonas.ts`) [SUPUESTO]
| Zona | Amenaza | Vida / daño enemigo | Monedas |
|---|---|---|---|
| Bosque cercano al Vado (≤ 1,5 km) | 1 | ×1,0 / ×1,0 | ×1,0 |
| Resto del bosque y costa | 2 | ×1,25 / ×1,15 | ×1,5 |
| Desierto, monte nevado, Ciudad de la Roca | 3 | ×1,5 / ×1,3 | ×2,0 |
Sin bloqueo por zona: se puede ir a cualquier sitio desde el principio. Composición por zona: 1 solo goblins y
esqueletos; 2 añade cultistas; 3 grupos mixtos de 4–5.

### 6.3 Curva objetivo [SUPUESTO]
- Minuto 0–15: 3–4 encuentros de 1–2 enemigos; primera compra posible (~60–90 monedas).
- Minuto 60–90: escudo y Lanza de escarcha; 4–6 mejoras; preparado para el dungeon (dificultad del dungeon ≈ amenaza 2).
- Ingreso medio explorando: 15–20 monedas/min. Completar todas las mejoras + bolso exige ≈ 4.400 monedas (§8.3): mundo
  completo + 1–2 rejuegos del dungeon.
- Curva por oleada y TTK: COMBATE §1 (pendiente allí).

## 7. Niveles, escenas y mundo jugable

### 7.1 Escenas
Carga → Menú principal → **Mundo (Valdera)** ⇄ **Dungeon (instancia)** → Escena final → Créditos → Mundo. Pausa = libro.
Fase 2: **Mundo ⇄ Subsuelo de la Roca (instancia: antecámara N6 + sala del jefe N7 + biblioteca N8)**, con pantalla de
carga al cruzar el umbral de N6 (§7.8). La arena **no** es instancia: es parte de la celda de la ciudad.

### 7.2 Escena 0: despertar (primeros 30 s) [SUPUESTO]
El jugador despierta en el **Torreón caído** (cripta de un torreón exterior del castillo, ≈ 600 m de la Aldea del Vado).
Al salir (≤ 10 s) ve el castillo en lo alto en el horizonte (hito visual permanente). A ≤ 20 s, **un esqueleto solo** guarda
la salida: aviso contextual de dirección de ataque y guardia (COMBATE §1.1). Tras vencerlo, el humo de la Aldea marca el
camino. Primer punto de descanso a la entrada de la Aldea.

### 7.3 Mundo (Valdera) (dimensiones, biomas y asentamientos en CONTEXTO y §10.1)
Disposición propuesta [SUPUESTO; a fijar por el diseño de nivel]:
| Zona | Posición en la cuadrícula 6,4 × 8,4 km | Contenido clave |
|---|---|---|
| Bosque (inicio) | Centro-oeste | Aldea del Vado, Torreón caído, Molino, Santuario del Arroyo, **castillo en ruinas** en una colina ≈ 3 km al norte de la Aldea |
| Costa | Franja oeste y sur | Puerto Gaviota, Caleta, faros y ruinas costeras |
| Monte nevado | Norte | Refugio del lago, lago glaciar, estatua sin rostro |
| Desierto y zona rocosa | Este y sureste | Oasis de Arenal, Ciudad de la Roca (§7.6) |
| Islas (4–5) | > 1 km de la costa | Visibles, inaccesibles en el MVP |
POI: 50–70 (CONTEXTO): ≈ 25 campamentos/patrullas fijas, ≈ 20 cofres y ruinas, 20–25 puntos de descanso, 4–6
estatuas/santuarios con fragmentos. **Sin viaje rápido en el MVP** [SUPUESTO]: caballo + caminos; piedras de paso en fase 2.

### 7.4 Dungeon «Patio del castillo en ruinas» (`dungeons/patio_castillo.ts`)
Entrada: portón del castillo (F) → carga → instancia; el mundo se congela y descarga (CONTEXTO). Patio cerrado de
≈ 60 × 40 m con murallas derruidas, 3 puertas de entrada de enemigos y el altar de ofrendas en el centro.

| Oleada | Composición [SUPUESTO; balance en COMBATE] | Monedas (enemigos + bonus) |
|---|---|---|
| 1 | 4 esqueletos | 20 + 10 |
| 2 | 3 esqueletos + 2 goblins arqueros (en la muralla) | 23 + 20 |
| 3 | 4 esqueletos + 2 goblins + 1 cultista | 36 + 30 |
| 4 | 4 esqueletos + 3 goblins + 2 cultistas (en dos tandas) | 48 + 40 |
| 5 | 6 esqueletos + 3 goblins + 2 cultistas (en dos tandas) | 58 + 50 |
| Jefe | Caballero no-muerto, 2 fases (COMBATE) | 150 + cofre del Guardián 100 |
Total primera vez ≈ 585 monedas. **Entre oleadas:** se abre el altar (§4.5); aguante y maná se rellenan, la vida no;
«Continuar» lanza la siguiente. **Salida:** victoria tras el jefe o abandonar desde la pausa (pierde el progreso de
oleadas, conserva monedas). **Rejuego tras el final:** «Eco del patio», 5 oleadas sin jefe (el Guardián ya está libre),
monedas ×0,5, sin cofre del Guardián.

### 7.5 Escena final
Tras vencer al jefe: cámara sobre el castillo, **voz del Guardián liberado con subtítulos** (4–6 líneas, ≈ 40 s, cierra con
«No eras nadie. Simplemente, no te rendiste.»), créditos, vuelta al mundo junto al portón al amanecer.

### 7.6 Ciudad de la Roca (zona 3, este/sureste) (`mundo/ciudad_roca.ts`; espacio y arte en `docs/CIUDAD_ROCA.md`)
Ciudad **grande y habitada** tallada en un macizo de arenisca (decisión del usuario). Ocupa **6 × 5 celdas de 128 m +
7 celdas** de desfiladero (CIUDAD_ROCA §2). Amenaza 3 (§6.2) en desfiladero, periferia y pozo desde N3; **plaza,
terrazas, arena (fuera de combate) y servicios son zona segura** (§5.2).

**Qué entra cuándo** [SUPUESTO: CONTEXTO limita el MVP a un mercader, un dungeon y sin XP]
| Fase | Contenido | Arte |
|---|---|---|
| MVP | Ciudad visitable: desfiladero, plaza, terrazas sin interiores, fachada del Santuario, meseta, pozo N1–N2 (N3 y siguientes cerrados por derrumbe hasta la fase 2); descansos de plaza y desfiladero; 2–4 aldeanos ambientales | Proxy (CIUDAD_ROCA §8) |
| Fase 2 | Servicios (§7.6.2), arena (§7.7), Archivista (§10.12), cadena de puzles, subsuelo, jefe y biblioteca (§7.8) | Proxy (CIUDAD_ROCA §8) |
| Fase 3 | Arte final: kit tallado, multitud animada, biblioteca monumental (CIUDAD_ROCA §7) | Final |

Recorrido: desierto → desfiladero (≈ 900 m, combate) → plaza (hub) → arena (norte) / terrazas (servicios) → Santuario
del Telar → escalera a la meseta → gran pozo (N1–N5 públicos) → oculto: N6–N8 (§7.8).

#### 7.6.1 Puntos de descanso de la ciudad [SUPUESTO]
| Punto | Fase | Regla especial |
|---|---|---|
| Nicho-altar del desfiladero | MVP | Normal (§4.2) |
| Fuente de la plaza | MVP | Normal |
| Pozo N3 (sala de mapas) | Fase 2 | Normal; además permite **esperar hasta las 17:00** (rayo del puzle A, §7.8.1) |
| Posada (terrazas) | Fase 2 | 10 monedas; permite esperar a **cualquier hora en punto**; da «Descansado» (+10 % regeneración de aguante durante 24 min reales; a validar por COMBATE) |
| Biblioteca N8 | Fase 2 | Se activa al vencer al jefe; autoguarda dentro de la instancia (requiere cambio técnico, §10.10) |

#### 7.6.2 Servicios y NPCs (fase 2) (`ciudad/servicios.ts`) [SUPUESTO salvo la lista, decidida por el usuario]
| Servicio (NPC) | Dónde | Horario | Qué ofrece |
|---|---|---|---|
| Herrero/armero | Terrazas N1 | 07–20 | Mejoras Filo, Vigor, Fuelle (§8.3, mismos precios); armas de fase 2 |
| Posada (posadero) | Terrazas N2 | 24 h | Descanso de pago (§7.6.1) |
| Alquimista/curandero | Terrazas N2 | 08–21 | Pociones de vida/maná (30; stock 8/5 al amanecer); mejoras Pozo arcano y Economía de maná |
| Sastre/peletero | Terrazas N3 | 08–19 | Armaduras modulares de fase 2 (COMBATE); tintes cosméticos |
| Establo (mozo) | Entrada de la plaza | 24 h | Trae el caballo aunque esté a > 60 m, gratis |
| Escriba/copista | Terrazas N3 | 09–19 | Tinta rúnica (15; 3/día), pergaminos de runas de fase 2 |
| Taberna (tabernera) | Plaza | 12–02 | 1 rumor/día que señala un POI sin descubrir en la brújula |
| Gremio de cazadores (maestre) | Terrazas N1 | 07–21 | 3 encargos «ve y limpia» rotativos (1 nuevo al amanecer): 60–120 monedas + 5 Estima |
| Cambista | Plaza | 08–20 | Compra botín vendible al **120 %** de §5.4 |
| Mercader general | Plaza | 06–21 | Como el del Vado **sin ampliaciones del bolso** (siguen solo en el Vado, §5.3) |
| Casa de la Arena (inscriptor) | Plaza | 08–22 | Inscripción y cartel (§7.7) |

Reparto de los ≤ 24 activos: 11 de servicio + Archivista + maestro de arena y presentador + sacerdote-custodio +
2 acólitos + 4 guardas + 3–4 ambientales. Público y fondo de plaza = multitud (no cuenta). Las reglas de NPC golpeado
(§5.2) se aplican a todos; «no vende hasta el amanecer» a cualquier NPC con tienda.

### 7.7 Arena de la Roca (fase 2) (`ciudad/arena.ts`) [SUPUESTO sobre la propuesta de CIUDAD_ROCA §3c]
Ruedo elíptico 40 × 32 m en el anfiteatro del lado norte de la plaza; inscripción en la Casa de la Arena.

| Regla | Valor |
|---|---|
| Inscripción | F con el inscriptor, 08–22; el combate empieza tras 5 s de entrada del presentador. Cuota (se pierde si se pierde): Bronce 0 · Plata 50 · Oro 120 · Campeón 250 |
| Rangos | **Bronce → Plata → Oro → Campeón**; cada uno se desbloquea al completar el anterior |
| Serie de un rango | 3 / 4 / 5 / 5 oleadas de monstruos del bestiario + **duelo final contra el rival del rango** (NPC con nombre) |
| Dificultad | Vida/daño enemigo ×1,0 / ×1,25 / ×1,5 / ×1,75 (Bronce a Campeón); composición y fichas de rivales en COMBATE |
| Entre oleadas | 15 s; aguante y maná al 100 %, **la vida no**; pociones permitidas; sin tienda |
| Derrota | Pierde la serie y la cuota; reaparece en el túnel de combatientes con recursos al 100 %; **sin otra penalización** |
| Abandono | Salir del ruedo es imposible (muro de 3,5 m); abandonar desde la pausa = derrota |
| Repetir | Rangos completados repetibles: monedas ×0,3, sin XP ni objeto; máx. 3 cobros por rango y día de juego |
| Recompensa (1.ª vez) | Monedas: 60 / 120 / 220 / 400 (fijas, sin multiplicador de zona) · Objeto de rango: 2 pociones / 3 tintas / pieza de equipo de fase 2 / arma de Campeón (COMBATE) · Título: Novato del ruedo / Gladiador / Veterano / Campeón de la Roca |
| XP (1.ª vez) | Rango: 25 / 35 / 50 / 80 · Rival vencido: 15 · Revancha vencida: 10 ⇒ **máx. ≈ 290 XP** (dentro del margen de COMBATE M-50) |

**Duelo contra NPC: elegir matar o perdonar** (decisión del usuario). Al llegar el rival a 0 de vida cae de rodillas
(no muere), el público calla y aparece **Perdonar / Matar** (sin límite de tiempo; la cámara se acerca). Los monstruos
no ofrecen elección.
| Elección | Consecuencias |
|---|---|
| **Perdonar** | Fama +10, Estima +5. El rival sigue en el cartel y ofrece **1 revancha** a partir del amanecer siguiente, con ×1,25 sobre su rango y equipo mejorado; vencerla da monedas ×1,5 y +10 XP y se vuelve a elegir. Perdonado 2 veces, se retira y deja un regalo (objeto vendible de 100) |
| **Matar** | **Botín extra**: su equipo (vendible 60 / 100 / 150 / 250 según rango; en fase 2 puede ser equipable). Fama +5, Estima −15; el rival **desaparece del cartel para siempre** (el rango se completa igual); su NPC vinculado (1 por rival, p. ej. un familiar en la taberna) deja de hablar con el jugador |

Reglas comprobables:
| ID | Regla | Test |
|---|---|---|
| AR-01 | Desbloqueo | Sin Bronce completado, el inscriptor no ofrece Plata |
| AR-02 | Derrota | Morir en la oleada 2 de Plata ⇒ túnel, recursos 100 %, monedas = antes − 50, Plata sigue sin completar |
| AR-03 | Elección | Rival a 0 de vida ⇒ queda vivo y aparece Perdonar/Matar; con un monstruo a 0 ⇒ muere sin elección |
| AR-04 | Perdonar | Perdonar ⇒ Fama +10, Estima +5; revancha no disponible antes de las 06:00 siguientes, disponible después |
| AR-05 | Matar | Matar ⇒ objeto de botín en el bolso, Fama +5, Estima −15, el rival no vuelve a aparecer tras recargar |
| AR-06 | Un solo cobro | Repetir Bronce ⇒ 18 monedas, 0 XP; el 4.º cobro del mismo día ⇒ 0 monedas |

### 7.8 Subsuelo: camino oculto, jefe y biblioteca (fase 2) (`ciudad/subsuelo.ts`)
El pozo público (N1–N5) acaba en un aparente callejón sin salida. **La sala del jefe está escondida**: sin marcador,
se llega explorando (pistas ambientales de CIUDAD_ROCA §3b) y resolviendo la **cadena obligatoria C → B → A**
(decisión del usuario). **D** es opcional; **E** está descartado.

#### 7.8.1 Cadena de puzles [SUPUESTO en el detalle; espacio en CIUDAD_ROCA §10]
| Puzle | Dónde | Regla exacta | Resuelto (bandera persistente) |
|---|---|---|---|
| **C** Conjuros como llaves | Meseta + N2–N3 | C1: Bola de fuego quema el toldo y las cuerdas que tapan la boca del conducto de luz en la meseta (no vuelve a crecer). C2: Lanza de escarcha congela la charca de N2 durante **20 s** (se puede repetir) y permite cruzar a N3. C3: Destello sagrado a ≤ 15 m de la pared de glifos de N3 la revela y abre la escalera a N4 | `puzleC` cuando C1, C2 (cruzado) y C3 están hechos; los tres usan hechizos del MVP |
| **B** Cisternas | N3–N4 | 2 compuertas (palancas F). Agua con 3 alturas (alta/media/baja); cada cambio tarda **4 s**. Media: las 3 plataformas flotantes llegan a la repisa; baja: descubre el paso a N5. Una palanca de **reinicio** en la entrada de N4 devuelve todo a «alta» (anti-bloqueo) | `puzleB` al pisar N5 |
| **A** Espejos de sol | Santuario → conducto → N3–N5 | El rayo entra por la ranura del frontón **solo de 17:00 a 19:00** (2 min reales) y solo si C1 está hecho. 3 espejos de bronce con **4 posiciones fijas** (90°) cada uno; 1 solución. El glifo de N5 debe recibir luz **2 s seguidos** ⇒ la pared de N5 se abre para siempre. Los espejos conservan su posición | `puzleA` ⇒ acceso a N6 |
| **D** Glifos de umbral (opcional) | 5 fachadas de la ciudad + pilar de N5 | Cada glifo visto a ≤ 10 m con línea de visión ⇒ entrada de Códice. Con 5/5, el pilar de N5 muestra las posiciones correctas de los espejos | No bloquea nada |

Pistas: solo ambientales y del Archivista (§10.12); **nunca** marcador, flecha ni entrada de misión.

#### 7.8.2 Instancia del subsuelo: antecámara (N6) y sala del jefe (N7)
- **Entrada:** cruzar el umbral de N6 ⇒ pantalla de carga ⇒ instancia (el mundo se congela y descarga como en §7.4).
  Se guarda el estado de puzles antes de cargar.
- **Sala del jefe:** circular, Ø 40 m útiles, 6 pilares; la puerta se sella al entrar. Jefe único (ficha en COMBATE,
  pendiente). Sin oleadas ni altar.
- **Muerte:** reaparece en la antecámara con recursos al 100 %; el jefe se reinicia completo; monedas iguales.
- **Salida:** volver por el umbral (carga ⇒ N5) en cualquier momento fuera de combate. Tras el jefe, el muro este se
  retrae y da paso a N8. Jefe **no rejugable** [SUPUESTO]: la sala queda vacía.
- **Recompensa del jefe:** 300 monedas + cofre (COMBATE) + XP de POI (15).

#### 7.8.3 Biblioteca de la Orden (N8): recompensas de magia (decisión del usuario; ubicaciones de CIUDAD_ROCA §3d)
Zona sin enemigos, con punto de descanso. Ningún atril tiene marcador; se encuentran con las mismas pistas ambientales.
| Recompensa | Tipo (COMBATE §2) | Dónde | Obligatoria | XP (COMBATE §2.11) |
|---|---|---|---|---|
| **Arcano de Espacio** | Arcano (destinos de Espacio, p. ej. Piedra de paso) | Atril central (+ 2 esquirlas de Piedra de paso al lado) | **Garantizada** | 200 |
| Llama sagrada | Fusión Fuego+Luz | G5, al encender el brasero con fuego | Opcional | 30 |
| Aurora | Fusión Aire+Luz | G8, bajo el lucernario | Opcional | 30 |
| Crepúsculo | Fusión Luz+Sombra | G2, rincón en penumbra | Opcional | 30 |
| Planeo | Runa de movimiento | G11, mirador cerca del techo | Opcional | 40 |
| Ancla | Runa de control | G3, mesa del copista | Opcional | 40 |
| **Arcano de Tiempo** | **No se obtiene** (reservado a la trama final) | G6, «Tabla de las Horas» con hornacina vacía | — | 2–3 entradas de Códice (10 c/u) |

Regla de concesión [SUPUESTO, a confirmar por COMBATE §2.7]: el atril **graba la receta/runa en el grimorio** (como un
pergamino leído, sin tinta); la XP de «fusión descubierta» se cobra en el **primer lanzamiento válido**, como el resto.
Planeo **funciona dentro de la biblioteca** (no es zona de anulación); la sala del jefe sí lo anula. Tiempo estimado:
8–10 min hasta el atril central, 20–30 min para todo lo opcional.

Reglas comprobables:
| ID | Regla | Test |
|---|---|---|
| SU-01 | Orden de la cadena | Con `puzleC = false` la escalera a N4 está cerrada; con `puzleB = false` no hay paso a N5; con `puzleA = false` la pared de N5 no se abre |
| SU-02 | Hora del rayo | A las 16:59 no hay rayo; a las 17:00 sí (con C1 hecho); a las 19:00 desaparece |
| SU-03 | Espejos | Solución correcta + 2 s de luz en el glifo ⇒ `puzleA = true` persiste tras recargar; 1,9 s ⇒ no |
| SU-04 | Anti-bloqueo de B | Desde cualquier estado de compuertas, la palanca de reinicio devuelve el agua a «alta» en ≤ 4 s |
| SU-05 | Instancia | Cruzar el umbral de N6 ⇒ pantalla de carga; morir en N7 ⇒ antecámara, jefe con vida completa |
| SU-06 | Biblioteca | Vencer al jefe ⇒ muro abierto; atril central ⇒ Arcano de Espacio en el grimorio; nunca se obtiene el Arcano de Tiempo |

## 8. Economía, victoria/derrota y puntuación

### 8.1 Fuentes de monedas (`economia.ts`) [SUPUESTO; ×multiplicador de zona §6.2]
| Fuente | Monedas |
|---|---|
| Esqueleto / goblin / cultista | 5 / 4 / 8 |
| Cofre común / de ruina | 20–40 / 40–60 (+ reliquia 50 %) |
| Encargo del anciano | 40 + escudo |
| Dungeon | §7.4 |
| Venta de botín | §5.4 (cambista de la Roca: 120 %, fase 2) |
| Arena de la Roca (fase 2) | §7.7: 800 por los 4 rangos la 1.ª vez + botín/revanchas |
| Gremio de cazadores (fase 2) | 60–120 por encargo, 1 nuevo al día |
| Jefe del subsuelo (fase 2) | 300 + cofre (§7.8.2) |

### 8.2 Mercader de la Aldea del Vado (stock que se repone al amanecer)
| Artículo | Precio | Stock diario |
|---|---|---|
| Poción de vida / de maná | 30 | 5 / 3 [SUPUESTO] |
| Tinta rúnica | 15 | 3 (COMBATE §2.13) |
| Ampliación del bolso | §5.3 | Sin límite diario (4 en total) |
| Pergamino de Destello sagrado | 200 | Único |
| Mejoras | §8.3 | Sin límite |

### 8.3 Mejoras (mercader y altar de ofrendas; `progresion.ts`) [SUPUESTO; multiplicadores a validar por COMBATE]
| Mejora | Por nivel | Niveles | Precios |
|---|---|---|---|
| Filo (daño de espada) | +8 % | 3 | 80 / 160 / 280 |
| Vigor (vida máx.) | +15 | 3 | 80 / 160 / 280 |
| Fuelle (aguante máx.) | +15 | 3 | 80 / 160 / 280 |
| Pozo arcano (maná máx.) | +15 | 3 | 80 / 160 / 280 |
| Potencia elemental (daño de hechizos) | +8 % | 3 | 80 / 160 / 280 |
| Economía de maná (coste de hechizos) | −8 % | 2 | 120 / 240 |
Curva: cada nivel ≈ ×2 del anterior, redondeado. Total mejoras 2.960 + bolso 1.200 + Destello 200 ≈ 4.360.

### 8.4 Victoria, derrota y puntuación
- **Victoria del MVP:** vencer al jefe ⇒ escena final; `finalVisto` se guarda y el mundo sigue abierto. Liberar al
  Guardián es **solo narrativo** en el MVP (decisión del usuario): sin habilidad ni objeto nuevo.
- **Derrota:** no hay fin de partida; muerte ⇒ reaparición (§3.4).
- **Puntuación:** sin marcador global. Al terminar el dungeon, resumen: tiempo, paradas perfectas, remates, daño recibido,
  monedas; se guarda el **mejor tiempo**. En el libro, estadísticas de partida (tiempo jugado, POI descubiertos x/total,
  fragmentos x/total).

### 8.5 Reputación en la Ciudad de la Roca (fase 2) (`ciudad/reputacion.ts`) [SUPUESTO]
Dos contadores persistentes; solo cambian precios y recompensas, **nunca bloquean la trama ni el subsuelo**.
| Contador | Rango (inicio) | Sube | Baja | Efectos |
|---|---|---|---|---|
| **Fama** (Casa de la Arena) | 0–100 (0) | Perdonar +10, matar +5, completar rango +5 | — | ≥ 40: monedas de arena ×1,2 · ≥ 80: ×1,4 y título «Favorito del público» |
| **Estima** (ciudad) | −100…+100 (0) | Perdonar +5, encargo del gremio +5 | Matar −15 | ≥ +30: servicios −10 % · ≤ −30: servicios +20 % y el sacerdote-custodio no habla · ≤ −60: la posada no te aloja (los descansos gratuitos siguen) |
Con 4 rivales, matar a todos deja la Estima en −60 como mínimo sin encargos; se recupera con el gremio (sin bloqueo
permanente). Comprobable: **RE-01** matar 2 rivales con Estima 0 ⇒ −30 y el herrero cobra Filo 1 a 96; **RE-02** con
Estima −60 la posada rechaza y la fuente de la plaza permite descansar.

## 9. Feedback
| Evento | Visual | Sonido | HUD |
|---|---|---|---|
| Golpe propio que entra | Chispa/polvo según material, flash 1–2 frames, hit-stop, retroceso | Impacto con peso por material | — |
| Golpe rebotado en guardia enemiga | Chispa azulada, retroceso del jugador 0,3 s | Clang seco | — |
| Golpe recibido | Sacudida, viñeta roja breve | Gruñido + impacto | Barra de vida con «trazo fantasma» |
| Parada perfecta | Destello dorado, hit-stop 90 ms, enemigo tambalea | Campanada metálica | — |
| Guardia rota | Brazo cae, chispas | Crujido | Barra de aguante parpadea ámbar |
| Remate | Cámara se acerca levemente | Golpe grave + silencio corto | Icono de remate sobre el enemigo antes |
| Muerte enemigo | Se desploma/deshace; monedas que vuelan al jugador | Tintineo | Contador de monedas sube con animación |
| Vida < 25 % | Viñeta roja pulsante (desactivable) | Latido grave | Barra roja parpadeando |
| Sin aguante / sin maná | Jadeo / el gesto de lanzar falla | Jadeo / chasquido apagado | Barra vacía con icono + texto |
| Bolso lleno / compra imposible | — | Sonido «denegado» | Aviso con motivo |
| Compra / mejora / ampliación | Brillo en el bolso (ampliación: casillas nuevas se «cosen») | Monedas + campanilla | Aviso 1,5 s |
| Punto de descanso activado | La hoguera prende, estandarte se despliega | Fuego + acorde | «Punto de descanso» + icono de guardado |
| Guardado | — | — | Icono de guardado 2 s (abajo a la derecha) |
| Entrar en asentamiento / descubrir POI | — | Motivo musical corto | Nombre del lugar 3 s; POI en la brújula |
| NPC reconoce / NPC golpeado / mercader enfadado | Bocadillo sobre el NPC; NPC se cubre o huye | Murmullo / queja | Bocadillo con subtítulo |
| Amanecer / anochecer | Cambio de luz (CONTEXTO) | Gallo y pájaros / grillos | — |
| Oleada empieza / limpia | Puertas del patio se abren / se cierran; altar se ilumina | Cuerno / acorde de victoria | «Oleada 3/5» · «Oleada limpia» |
| Jefe: cambio de fase | Onda de choque, el yelmo arde en frío | Rugido + cambio de música | Barra del jefe marca fase 2 |
| Muerte del jugador | Cámara lenta 0,5 s, desaturación, fundido | Golpe sordo, música se corta | «Caíste» 2 s |
| Montar / silbar | Animación de montar / el caballo aparece al trote | Silbido, relincho, cascos | — |
| Arena: entrada / oleada (fase 2) | Compuertas de jaula se abren; presentador en el palco | Clamor del público, cuerno | «Plata · Oleada 2/4» |
| Arena: rival de rodillas | Cámara se acerca, público quieto | Silencio súbito | Aviso **Perdonar / Matar** (GUIA_UI) |
| Perdonar / Matar | Rival se levanta y se retira / remate breve | Aclamación / abucheo mezclado | «Fama +10» / «Estima −15» 2 s |
| Paso de puzle resuelto | Polvo que cae, mecanismo que se mueve; el rayo se enciende al llegar al glifo | Piedra que rueda, acorde grave | — (sin texto; el Códice anota si procede) |
| Página de conjuro (atril) | Motas que forman una página de luz y se funden con la runa del jugador | Coro tenue | Nombre del conjuro 3 s; entrada en el grimorio |
Detalle visual: GUIA_VISUAL; sonido: rol `audio`; HUD: GUIA_UI.

---

## 10. Mundo y lore

### 10.1 Nombres
- **Bronsil**: el mundo. Nombre en la lengua rúnica: *Bron* (tierra) + *Sil* (aire); raíces en `docs/COMBATE.md` §2.6.
- **Valdera**: la región jugable (el mapa del juego).
- Los lugares concretos mantienen nombre en castellano:

| Lugar | Bioma / zona | Papel en el lore |
|---|---|---|
| Aldea del Vado | Bosque, junto a un vado de río [SUPUESTO] | Primer asentamiento; origen de la leyenda del «Guardián de la Pausa» [SUPUESTO]; único mercader del MVP |
| Puerto Gaviota | Costa | Puerto; rumores de tierras «detenidas» al otro lado del mar [SUPUESTO] |
| Caleta | Costa / frente a las islas [SUPUESTO] | Pueblo pesquero; acceso a las islas en fase 4 [SUPUESTO] |
| Oasis de Arenal | Desierto | Parada de caravanas; ruinas de una piedra de viaje caída de la Orden [SUPUESTO] |
| Refugio del lago | Monte nevado, lago glaciar | Refugio de montaña; estatua sin rostro [SUPUESTO] |
| Ciudad de la Roca | Zona rocosa del desierto (mesetas y cañones) | Ciudad grande y habitada tallada en un macizo (§7.6); bajo el gran pozo, oculto, el **archivo de la Orden** (biblioteca, §7.8.3), que los habitantes ya no recuerdan (§10.12) |
| Dungeon del castillo («Patio del castillo en ruinas») | Bosque, colina ≈ 3 km al norte de la Aldea [SUPUESTO] (§7.3) | Lugar de la noche de la Pausa, atrapado en un bucle temporal |
| Islas (4–5) | Islas | Fragmentos opcionales; posibles ganchos de expansión [SUPUESTO] |

### 10.2 Premisa: «La Orden Dormida»
- Las **runas son el idioma con que se tejió el mundo**. Durante siglos la **Orden de los Tejedores** cuidó ese tejido.
- Hace **300 años** la Orden desapareció en una sola noche: **«la Pausa»**. Desde entonces el tejido se deshilacha.
- Consecuencias jugables que el lore justifica:
  - **Magia inestable** → la inestabilidad del sistema de runas (`docs/COMBATE.md`).
  - **El castillo quedó atrapado en un bucle temporal** → el dungeon de oleadas repetibles.
  - **Cultistas**: buscan la runa prohibida de **«cierre»** para fijar el mundo a su voluntad.
  - **Goblins**: usan runas aprendidas a medias de restos de la Orden; por eso su **chamán es inestable**.
  - **La red de piedras de viaje de la Orden cayó** → no hay viaje rápido predefinido; solo existen las
    **piedras de paso** que crea el jugador.

### 10.3 Protagonista
- **Mudo.** Identidad oculta durante todo el juego.
- **No era de la Orden ni un elegido.** Estudiaba magia por su cuenta; un día, estudiando, encontró el
  **bolso mágico**, que perteneció a algún Tejedor olvidado.
- La noche de la Pausa **siguió luchando en el castillo**; el hechizo de Tiempo le alcanzó y **despierta 300 años
  después**, sin recuerdos, con el bolso.

### 10.4 Insinuaciones (que el jugador crea que era un héroe)
Repartidas por el mundo, nunca confirmadas hasta el final:
1. Leyendas en las aldeas sobre **«el Guardián de la Pausa»** (en el MVP: el anciano de la Aldea del Vado).
2. **Estatuas sin rostro** del Guardián.
3. NPCs y el **caballero no-muerto** parecen **reconocerle** (en el MVP: mercader y anciano, §5.2).
4. Entradas del **Códice** con hazañas que encajan con el protagonista.
5. **Runas que «recuerda»** antes de aprenderlas.

### 10.5 El Guardián y el jefe
- El **Guardián de la leyenda es el caballero no-muerto** (jefe del castillo, 2 fases): el héroe real de esa noche,
  que luchó junto al protagonista y quedó atrapado en el bucle.
- Al vencerlo, el jugador **lo libera** (no lo «mata»). En el MVP es **solo narrativo** (decisión del usuario).

### 10.6 Revelación final y tema
- El protagonista **no era nadie**: simplemente alguien que no dejó de luchar. Sin nombre ni título al final.
- Línea de referencia: **«No eras nadie. Simplemente, no te rendiste.»**
- **Tema:** la grandeza no viene del destino, sino de no rendirse. Encaja con la regla de magia **«sin bloqueos por
  nivel»**: cualquiera puede lanzar cualquier receta; solo cuesta más.

### 10.7 Estructura narrativa
- **Trama principal** con el final de 10.6 (en el MVP, trama mínima: §7.2, §7.5).
- **Fragmentos** de historias pasadas repartidos por el mundo: entradas del Códice, ruinas, POI, santuarios y objetos.
- **Mundo abierto tras el final:** sin punto de no retorno; se sigue explorando y **las expansiones se juegan con la
  misma partida**.
- Implicación técnica (para arquitecto/planificador): el guardado registra `finalVisto` sin cerrar la partida, y el
  castillo tiene un estado posterior a la liberación del Guardián (rejuego «Eco del patio», §7.4).

### 10.8 Ganchos de expansión (opciones futuras; NINGUNO elegido)
| # | Gancho | Idea | Enlace |
|---|---|---|---|
| 1 | La Pausa no empezó aquí | Las últimas palabras del caballero revelan que vino de más allá del mar; escena final con una grieta en el cielo en el horizonte | Fase 4 (barcos/mar); cada expansión = una tierra aún detenida |
| 2 | No fuiste el único | Epílogo con otra figura congelada que despierta; hay otros que no se rindieron | Cada expansión cuenta a uno |
| 3 | La Orden no murió | Los Tejedores se refugiaron dentro del tejido (el espacio entre runas) | Arcano Espacio; una expansión entra allí |
| 4 | El cierre no se completó | Los cultistas eran solo una rama; la runa de cierre está fragmentada por el mundo | Caza de fragmentos por Bronsil |

Nota: el orquestador recomendó combinar 1 + 4; el usuario aún no ha decidido.

### 10.9 Preguntas de lore
1. **¿Qué causó la Pausa?** **Aplazada a la fase 2** (decisión del usuario): en el MVP solo se insinúa (fragmentos y
   palabras del Guardián), sin respuesta.
2. **¿A qué Tejedor perteneció el bolso** y por qué estaba donde lo encontró el protagonista?
3. **¿Por qué luchaban en el castillo** el Guardián y el protagonista aquella noche, y contra quién?
4. **¿Por qué el hechizo de Tiempo congeló al protagonista fuera del bucle** y al Guardián dentro?
5. **Papel de los asentamientos:** ¿cada uno guarda una pieza de la leyenda o un resto de la Orden? ¿Hay una facción
   o NPC recurrente (p. ej. un erudito que estudia la Pausa) que guíe la trama? (Sigue abierta: el Archivista de la
   Roca es un NPC local y candidato, no la respuesta; §10.12.)
6. **Cultistas:** ¿tienen líder con nombre? ¿Conocen la verdad sobre el protagonista?
7. **Esqueletos y no-muertos:** ¿son caídos de la noche de la Pausa, efecto del bucle o del deshilachado?
8. **¿Quién esculpió las estatuas sin rostro** y por qué sin rostro (nadie recordaba al Guardián, o era deliberado)?
9. **RESUELTA (decisión del usuario):** el final se cuenta con la **voz del Guardián liberado con subtítulos** mientras la
   cámara muestra el castillo (§7.5).
10. **RESUELTA (2026-11-25):** el dungeon sigue siendo rejugable con el jefe derrotado y botín reducido. Justificación
    [SUPUESTO]: liberar al Guardián rompe el bucle para él, pero el patio conserva un **eco** que repite la batalla (§7.4).
11. **Lengua rúnica:** ¿«Valdera» y los nombres de los Tejedores siguen sus raíces o son castellano/neutros?

### 10.10 Pendiente de sincronizar
- ✔ aplicado (2026-11-23) en `contexto/CONTEXTO_PROYECTO.md` (nombres de asentamientos, Bronsil/Valdera).
- ✔ aplicado (2026-11-26): qué lore entra en el MVP (mercader y anciano que reconocen, escena final con la voz del
  Guardián, causa de la Pausa aplazada); volcado en §5.2, §7.5 y §10.9.
- ✔ aplicado (2026-11-26): decisiones del 2026-11-25 (lore mínimo, mundo abierto tras el final, dungeon rejugable,
  Códice único, chamán fuera del MVP, mercader fijo en el Vado, bolso sin peso) volcadas en §5–§8.
- ✔ aplicado (2026-11-26): estado persistente post-final y rejuego del dungeon (§7.4, §8.4, §10.7).
- ✔ aplicado (2026-11-26): detalle del bolso mágico que pedía `docs/COMBATE.md` §2.12 (§5.3).
- ✔ aplicado (2026-11-26): un solo mercader en el MVP (D-6, §4.5, §8.2). `docs/COMBATE.md` §2.13 habla de «3 por
  mercader y día»: con un único mercader equivale a 3 tintas al día en todo el mundo (no requiere cambio).
- `docs/COMBATE.md` usa «Códice elemental» para fusiones y cuenta ≈ 40 «entradas del Códice» para XP: confirmar que
  las entradas de lore (hazañas, fragmentos) son las mismas o un apartado distinto del Códice (CONTEXTO: un solo Códice
  con dos pestañas; el reparto de XP es de fase 2).
- El **chamán goblin** (fuera del MVP, fase 2): cuando se haga su ficha en `docs/COMBATE.md` §2.14, reflejar que su magia es
  **inestable** (runas a medias), p. ej. más probabilidad de fallo.
- **Nuevo (2026-11-26) para `interfaz-ui`:** `docs/GUIA_UI.md` §2.8 dice «sin límite de huecos visible»; el bolso tiene
  casillas (12–28, §5.3). También: guardado manual en el libro, tiendas (mercader y altar), bocadillos de NPC,
  «Caíste», resumen del dungeon, esperar en el descanso, teclas de poción y de fijar objetivo, y el choque Q/E/R
  (CONTEXTO) frente a 1–3 (GUIA_UI §5.1) para los hechizos.
- **Nuevo (2026-11-26) para `disenador-combate`:** adoptar o corregir los valores propuestos en §3.3 (hit-stop,
  esquiva, cancelación) y §4.1 (recursos), los multiplicadores de zona (§6.2), la composición de oleadas (§7.4) y los
  porcentajes de mejora (§8.3) en la simulación DPS/TTK.
- ✔ aplicado (2026-11-27): diseño de la Ciudad de la Roca (`docs/CIUDAD_ROCA.md`, viñeta GDD) volcado en §4.2, §5.2,
  §6.1, §7.1, §7.6–§7.8, §8.1, §8.5, §9, §10.12.
- **Nuevo (2026-11-27) para `disenador-combate`:** ficha del jefe del subsuelo; composición de oleadas de arena por
  rango y 4 rivales con nombre (más su versión de revancha); XP de arena ≤ 290 a sumar al catálogo de M-50
  (≈ 3.780 + 290 ≈ 4.070 < 4.571); concesión por atril frente a §2.7; Planeo en biblioteca frente a §2.10;
  buff «Descansado» de la posada; objetos de rango Oro/Campeón.
- **Nuevo (2026-11-27) para `interfaz-ui`:** inscripción y cartel de la arena, contador de oleadas, aviso Perdonar/Matar,
  Fama y Estima en el libro, esperar a una hora concreta (N3 y posada), entradas de Códice de glifos, del Archivista y
  de la Tabla de las Horas, presentación de la página de conjuro.
- **Nuevo (2026-11-27) para `arquitecto` (cambios técnicos):** segunda instancia (subsuelo) con estado de puzles
  persistente; autoguardado/descanso **dentro** de una instancia (hoy el guardado manual está vedado en el dungeon);
  rivales con vida dentro de la ciudad (excepción a «NPC inmortal»); tope propio de 24 NPCs + multitud; varios
  comerciantes (rompe la regla de un único mercader del MVP: solo a partir de fase 2); guardado de Fama, Estima,
  cartel de arena y banderas `puzleA/B/C`, glifos D y etapa del Archivista.

### 10.11 Decisiones abiertas: fauna y NPCs
Decidido por el usuario: **hay animales y hay NPCs** (§5.1, §5.2).

| # | Tema | Pregunta | Estado |
|---|---|---|---|
| D-1 | Actitud de la fauna | ¿Pasivos, presas, hostiles o una mezcla según especie? | Ambiental, no hostil [SUPUESTO] (fase 3) |
| D-2 | Especies | ¿Qué animales y en qué biomas (bosque, costa, desierto, monte nevado, islas)? | Sin decidir (fase 3) |
| D-3 | Utilidad jugable | ¿Se cazan? ¿Dan materiales (p. ej. para inscripciones de fase 2)? ¿Se pueden atacar con hechizos? | Sin utilidad jugable (fase 3) |
| D-4 | Lore de la fauna | ¿El deshilachado del tejido afecta a los animales (criaturas alteradas por la magia inestable)? | Sin decidir |
| D-5 | Papeles de NPC | Además del mercader: ¿dadores de encargos, narradores de lore, guías, entrenadores de runas? | MVP: mercader + anciano (leyenda y 1 encargo) + aldeanos ambientales [SUPUESTO en el encargo]. Fase 2: servicios de la Roca y Archivista (§7.6.2, §10.12) |
| D-6 | Mercaderes en el MVP | ¿Uno fijo o uno por asentamiento? | **Decidido (2026-11-25): uno fijo, en la Aldea del Vado** |
| D-7 | NPC recurrente | ¿Hay un NPC que guíe la trama (p. ej. un erudito de la Pausa)? Enlaza con §10.9 p. 5 | Sin decidir (fuera del MVP). El Archivista de la Roca (§10.12) es local y candidato; no cierra D-7 |
| D-8 | Reconocimiento | ¿Qué NPCs «reconocen» al protagonista y cómo se muestra? | **Decidido (2026-11-26):** el **mercader de la Aldea del Vado** y **un anciano**, con una frase suelta en bocadillo **solo la primera vez** (se guarda en la partida) (§5.2) |
| D-9 | Vida de los NPCs | ¿Rutinas, se mueven, pueden morir o ser atacados? | **Decidido (2026-11-26):** rutina día/noche; **se les puede golpear, no mueren, reaccionan**; el mercader golpeado **no vende hasta el amanecer siguiente** (§5.2) |

Implicación técnica (para arquitecto/planificador, sin cambio aquí): los NPCs entran en el streaming por celdas
(rutina calculada por hora al despertar, CONTEXTO), en el sistema de interacción y en el de impactos (reciben eventos de
daño sin componente de vida). `docs/COMBATE.md` ya contempla «Aliado / NPC / montura» como destino de hechizos.

### 10.12 El secreto de la Roca y el Archivista anciano (fase 2)
- **El secreto:** la ciudad creció sobre el **archivo de la Orden de los Tejedores** sin saberlo. Los habitantes conocen
  el pozo, sus copistas y sus tumbas; nadie recuerda lo que hay debajo. El Santuario del Telar repite a diario un ritual
  de luz que en realidad es una **llave** (puzle A). La biblioteca está intacta pero **detenida**: sugiere, no explica.
- **Lo que NO responde** (aplazado, §10.9): qué causó la Pausa, adónde fue la Orden, quién es el NPC recurrente (D-7).
  La **Tabla de las Horas** con su hornacina vacía solo apunta a que el **Arcano de Tiempo** existe y se guarda en otra
  parte (trama final).
- **Archivista anciano** (decisión del usuario): copista veterano; 08–18 en la galería N1, 19–23 en el taller del
  escriba, 23–08 en su casa de las terrazas. Ha oído «la leyenda del pozo que respira» pero no sabe qué hay abajo. Da
  **una frase críptica por conversación**, repetible, según la etapa; **orienta, nunca resuelve**; no retrocede de etapa.

| Etapa (banderas) | Frase [SUPUESTO, de CIUDAD_ROCA §3b] | Orienta hacia |
|---|---|---|
| 0 · nada | «El pozo recuerda lo que la ciudad olvida. Prueba primero lo que arde y lo que hiela.» | Puzle C |
| 1 · `puzleC` | «Donde baja el agua, algo espera a que la dejen ir.» | Puzle B |
| 2 · `puzleB` | «El santuario se enciende a su hora; la luz sabe el camino mejor que yo.» | Puzle A |
| 3 · `puzleA` | «Si una puerta se abre sola, no entres con prisa.» | Preparar el jefe |
| 4 · jefe vencido | «Dicen que allí abajo se guarda todo, menos la hora que nadie encuentra.» | Eco del Arcano de Tiempo |
Cada frase nueva añade una entrada de Códice (10 XP). Comprobable: **AV-01** con `puzleB = true` y `puzleA = false` la
frase es la de la etapa 2; resolver A y hablar ⇒ etapa 3; ninguna etapa crea marcador en la brújula.

---

## 11. Fuera de alcance / futuro
| Idea | Cuándo |
|---|---|
| Sistema de runas completo, grimorio libre, mutación, nivel/XP, inscripciones, crafteo, armaduras modulares | Fase 2 (COMBATE §2) |
| Causa de la Pausa y trama completa; NPC recurrente (D-7); 2.º encargo; chamán goblin | Fase 2 |
| Piedras de paso / viaje rápido | Fase 2 (runas) |
| Habilidad o efecto jugable por liberar al Guardián | Fase 2+ (en el MVP, solo narrativo) |
| Ciudad de la Roca: servicios, arena, cadena de puzles, subsuelo, jefe y biblioteca (§7.6–§7.8) | Fase 2 (arte final en fase 3) |
| Arena: torneos por temporada, apuestas, aliados en el ruedo; rivales que te buscan por el mundo tras perdonarlos | Futuro |
| Puzle E (anillos del pozo) | Descartado |
| Arcano de Tiempo | Trama final (sin fase) |
| Martillo y arco | Reserva (COMBATE §1.2) |
| Fauna, NPCs modulares, más NPCs con rutina entre asentamientos | Fase 3 |
| Salto libre, nado, escalada | Futuro (sin fase asignada) [SUPUESTO] |
| Acceso a las islas, barcos, pesca | Fase 4 |
| Combate a caballo | Futuro |
| Más dungeons (el sistema lo admite), clima dinámico, enemigos distintos de noche | Futuro |
| Varias partidas / más ranuras de guardado, guardado en la nube | Futuro |
| Marcadores online, multijugador, móvil/táctil | Fuera del producto (CONTEXTO) |
