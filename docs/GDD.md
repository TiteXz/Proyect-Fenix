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
| Desierto y zona rocosa | Este y sureste | Oasis de Arenal, Ciudad de la Roca |
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

## 8. Economía, victoria/derrota y puntuación

### 8.1 Fuentes de monedas (`economia.ts`) [SUPUESTO; ×multiplicador de zona §6.2]
| Fuente | Monedas |
|---|---|
| Esqueleto / goblin / cultista | 5 / 4 / 8 |
| Cofre común / de ruina | 20–40 / 40–60 (+ reliquia 50 %) |
| Encargo del anciano | 40 + escudo |
| Dungeon | §7.4 |
| Venta de botín | §5.4 |

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
| Ciudad de la Roca | Zona rocosa del desierto (mesetas y cañones) | Maravilla excavada en un macizo; archivo de la Orden en el gran pozo central [SUPUESTO] |
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
   o NPC recurrente (p. ej. un erudito que estudia la Pausa) que guíe la trama?
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

### 10.11 Decisiones abiertas: fauna y NPCs
Decidido por el usuario: **hay animales y hay NPCs** (§5.1, §5.2).

| # | Tema | Pregunta | Estado |
|---|---|---|---|
| D-1 | Actitud de la fauna | ¿Pasivos, presas, hostiles o una mezcla según especie? | Ambiental, no hostil [SUPUESTO] (fase 3) |
| D-2 | Especies | ¿Qué animales y en qué biomas (bosque, costa, desierto, monte nevado, islas)? | Sin decidir (fase 3) |
| D-3 | Utilidad jugable | ¿Se cazan? ¿Dan materiales (p. ej. para inscripciones de fase 2)? ¿Se pueden atacar con hechizos? | Sin utilidad jugable (fase 3) |
| D-4 | Lore de la fauna | ¿El deshilachado del tejido afecta a los animales (criaturas alteradas por la magia inestable)? | Sin decidir |
| D-5 | Papeles de NPC | Además del mercader: ¿dadores de encargos, narradores de lore, guías, entrenadores de runas? | MVP: mercader + anciano (leyenda y 1 encargo) + aldeanos ambientales [SUPUESTO en el encargo] |
| D-6 | Mercaderes en el MVP | ¿Uno fijo o uno por asentamiento? | **Decidido (2026-11-25): uno fijo, en la Aldea del Vado** |
| D-7 | NPC recurrente | ¿Hay un NPC que guíe la trama (p. ej. un erudito de la Pausa)? Enlaza con §10.9 p. 5 | Sin decidir (fuera del MVP) |
| D-8 | Reconocimiento | ¿Qué NPCs «reconocen» al protagonista y cómo se muestra? | **Decidido (2026-11-26):** el **mercader de la Aldea del Vado** y **un anciano**, con una frase suelta en bocadillo **solo la primera vez** (se guarda en la partida) (§5.2) |
| D-9 | Vida de los NPCs | ¿Rutinas, se mueven, pueden morir o ser atacados? | **Decidido (2026-11-26):** rutina día/noche; **se les puede golpear, no mueren, reaccionan**; el mercader golpeado **no vende hasta el amanecer siguiente** (§5.2) |

Implicación técnica (para arquitecto/planificador, sin cambio aquí): los NPCs entran en el streaming por celdas
(rutina calculada por hora al despertar, CONTEXTO), en el sistema de interacción y en el de impactos (reciben eventos de
daño sin componente de vida). `docs/COMBATE.md` ya contempla «Aliado / NPC / montura» como destino de hechizos.

---

## 11. Fuera de alcance / futuro
| Idea | Cuándo |
|---|---|
| Sistema de runas completo, grimorio libre, mutación, nivel/XP, inscripciones, crafteo, armaduras modulares | Fase 2 (COMBATE §2) |
| Causa de la Pausa y trama completa; NPC recurrente (D-7); 2.º encargo; chamán goblin | Fase 2 |
| Piedras de paso / viaje rápido | Fase 2 (runas) |
| Habilidad o efecto jugable por liberar al Guardián | Fase 2+ (en el MVP, solo narrativo) |
| Martillo y arco | Reserva (COMBATE §1.2) |
| Fauna, NPCs modulares, más NPCs con rutina entre asentamientos | Fase 3 |
| Salto libre, nado, escalada | Futuro (sin fase asignada) [SUPUESTO] |
| Acceso a las islas, barcos, pesca | Fase 4 |
| Combate a caballo | Futuro |
| Más dungeons (el sistema lo admite), clima dinámico, enemigos distintos de noche | Futuro |
| Varias partidas / más ranuras de guardado, guardado en la nube | Futuro |
| Marcadores online, multijugador, móvil/táctil | Fuera del producto (CONTEXTO) |
