# GDD — Proyecto Fénix

Documento del rol `disenador-juego`. Fija mecánicas, reglas, progresión, niveles y mundo. Todo lo marcado
**[SUPUESTO]** es una propuesta del diseñador pendiente de validar; lo demás es decisión del usuario. Los
valores ajustables vivirán como datos en `juego/src/config/` (nunca dentro de los sistemas). Combate,
magia y balance viven en `docs/COMBATE.md`; aquí solo se referencian.

---

## 1. Resumen y pilares — PENDIENTE (se rellena en /iniciar)

## 2. Bucle principal (30 s / 5 min / sesión) — PENDIENTE

## 3. Controles y sensación (game feel) — PENDIENTE

## 4. Mecánicas (reglas exactas y números iniciales) — PENDIENTE

## 5. Entidades y objetos (incl. bolso mágico) — PENDIENTE

Resto de la sección pendiente. Decisiones del usuario ya tomadas sobre habitantes del mundo:

### 5.1 Animales (fauna) — decidido que existen; detalle pendiente
- **Decisión del usuario:** Valdera tiene **animales** como fauna del mundo abierto.
- **Fase:** según la hoja de ruta de `contexto/CONTEXTO_PROYECTO.md`, los animales llegan en la **fase 3**; no entran en
  el MVP salvo que el usuario lo cambie. (El caballo del MVP es montura del jugador, no fauna.)
- **Supuesto mínimo [SUPUESTO]:** la fauna es **ambiental y no hostil por defecto** (da vida al mundo y no sustituye a
  los enemigos de `docs/COMBATE.md`). Sin especies, comportamientos, caza, botín ni domesticación fijados.
- Todo lo demás queda abierto en §10.11 (D-1 a D-4).

### 5.2 NPCs (habitantes) — decidido que existen; papel pendiente
- **Decisión del usuario:** Valdera tiene **NPCs**, habitantes de los asentamientos y caminos con los que el jugador
  **interactúa**.
- **Ya decidido en otros documentos (no se cambia aquí):**
  - **Comercio:** existe un **mercader fijo en un asentamiento** en el MVP [SUPUESTO de `CONTEXTO_PROYECTO.md`], y
    `docs/COMBATE.md` §2.12–2.13 usa **mercaderes** con stock diario de pociones y tinta (3 por mercader y día).
    El mercader es, por tanto, el primer papel confirmado de un NPC.
  - **Encargos:** el MVP admite como mucho **1–2 encargos simples** de «ve y limpia»; sin diálogos complejos.
  - **Lore (§10.4):** algunos NPCs **parecen reconocer** al protagonista (insinuación de que fue un héroe).
  - **Fase:** los **NPCs modulares** (variedad de aspecto por piezas) llegan en la **fase 3**; en el MVP solo los
    NPCs imprescindibles (mercader y, si se hacen, quien dé los encargos) [SUPUESTO].
- **Interacción mínima [SUPUESTO]:** acercarse + tecla de interactuar abre la función del NPC (tienda o texto breve).
  El protagonista es mudo, así que el NPC habla y el jugador no elige frases.
- El resto (otros papeles, número, rutinas) queda abierto en §10.11 (D-5 a D-9).

## 6. Progresión y dificultad — PENDIENTE

## 7. Niveles, escenas y mundo jugable — PENDIENTE

## 8. Economía, victoria/derrota y puntuación — PENDIENTE

## 9. Feedback — PENDIENTE

---

## 10. Mundo y lore

### 10.1 Nombres
- **Bronsil**: el mundo. Nombre en la lengua rúnica: *Bron* (tierra) + *Sil* (aire); raíces en `docs/COMBATE.md` §2.6.
- **Valdera**: la región jugable (el mapa del juego).
- Los lugares concretos mantienen nombre en castellano:

| Lugar | Bioma / zona | Papel en el lore |
|---|---|---|
| Aldea del Vado | Bosque, junto a un vado de río [SUPUESTO] | Primer asentamiento; origen de la leyenda del «Guardián de la Pausa» [SUPUESTO] |
| Puerto Gaviota | Costa | Puerto; rumores de tierras «detenidas» al otro lado del mar [SUPUESTO] |
| Caleta | Costa / frente a las islas [SUPUESTO] | Pueblo pesquero; acceso a las islas en fase 4 [SUPUESTO] |
| Oasis de Arenal | Desierto | Parada de caravanas; ruinas de una piedra de viaje caída de la Orden [SUPUESTO] |
| Refugio del lago | Monte nevado, lago glaciar | Refugio de montaña; estatua sin rostro [SUPUESTO] |
| Ciudad de la Roca | Zona rocosa del desierto (mesetas y cañones) | Maravilla excavada en un macizo; archivo de la Orden en el gran pozo central [SUPUESTO] |
| Dungeon del castillo («Patio del castillo en ruinas») | Por determinar | Lugar de la noche de la Pausa, atrapado en un bucle temporal |
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
1. Leyendas en las aldeas sobre **«el Guardián de la Pausa»**.
2. **Estatuas sin rostro** del Guardián.
3. NPCs y el **caballero no-muerto** parecen **reconocerle**.
4. Entradas del **Códice** con hazañas que encajan con el protagonista.
5. **Runas que «recuerda»** antes de aprenderlas.

### 10.5 El Guardián y el jefe
- El **Guardián de la leyenda es el caballero no-muerto** (jefe del castillo, 2 fases): el héroe real de esa noche,
  que luchó junto al protagonista y quedó atrapado en el bucle.
- Al vencerlo, el jugador **lo libera** (no lo «mata»).

### 10.6 Revelación final y tema
- El protagonista **no era nadie**: simplemente alguien que no dejó de luchar. Sin nombre ni título al final.
- Línea de referencia: **«No eras nadie. Simplemente, no te rendiste.»**
- **Tema:** la grandeza no viene del destino, sino de no rendirse. Encaja con la regla de magia **«sin bloqueos por
  nivel»**: cualquiera puede lanzar cualquier receta; solo cuesta más.

### 10.7 Estructura narrativa
- **Trama principal** con el final de 10.6.
- **Fragmentos** de historias pasadas repartidos por el mundo: entradas del Códice, ruinas, POI, santuarios y objetos.
- **Mundo abierto tras el final:** sin punto de no retorno; se sigue explorando y **las expansiones se juegan con la
  misma partida**.
- Implicación técnica (para arquitecto/planificador): el guardado debe registrar «final visto» sin cerrar la partida,
  y el castillo debe tener un estado posterior a la liberación del Guardián [SUPUESTO].

### 10.8 Ganchos de expansión (opciones futuras; NINGUNO elegido)
| # | Gancho | Idea | Enlace |
|---|---|---|---|
| 1 | La Pausa no empezó aquí | Las últimas palabras del caballero revelan que vino de más allá del mar; escena final con una grieta en el cielo en el horizonte | Fase 4 (barcos/mar); cada expansión = una tierra aún detenida |
| 2 | No fuiste el único | Epílogo con otra figura congelada que despierta; hay otros que no se rindieron | Cada expansión cuenta a uno |
| 3 | La Orden no murió | Los Tejedores se refugiaron dentro del tejido (el espacio entre runas) | Arcano Espacio; una expansión entra allí |
| 4 | El cierre no se completó | Los cultistas eran solo una rama; la runa de cierre está fragmentada por el mundo | Caza de fragmentos por Bronsil |

Nota: el orquestador recomendó combinar 1 + 4; el usuario aún no ha decidido.

### 10.9 Preguntas abiertas de lore (sin decidir)
1. **¿Qué causó la Pausa?** ¿Un hechizo de la propia Orden, un ataque de los cultistas, un error al usar la runa de cierre?
2. **¿A qué Tejedor perteneció el bolso** y por qué estaba donde lo encontró el protagonista?
3. **¿Por qué luchaban en el castillo** el Guardián y el protagonista aquella noche, y contra quién?
4. **¿Por qué el hechizo de Tiempo congeló al protagonista fuera del bucle** y al Guardián dentro?
5. **Papel de los asentamientos:** ¿cada uno guarda una pieza de la leyenda o un resto de la Orden? ¿Hay una facción
   o NPC recurrente (p. ej. un erudito que estudia la Pausa) que guíe la trama?
6. **Cultistas:** ¿tienen líder con nombre? ¿Conocen la verdad sobre el protagonista?
7. **Esqueletos y no-muertos:** ¿son caídos de la noche de la Pausa, efecto del bucle o del deshilachado?
8. **¿Quién esculpió las estatuas sin rostro** y por qué sin rostro (nadie recordaba al Guardián, o era deliberado)?
9. **Cómo se cuenta el final** con un protagonista mudo y sin diálogos complejos en el MVP: ¿texto en pantalla,
   voz del Guardián liberado, inscripción?
10. **¿Qué pasa con el bucle del castillo tras liberar al Guardián?** ¿Se rompe, o el dungeon sigue siendo rejugable
    (y cómo se justifica)?
11. **Lengua rúnica:** ¿«Valdera» y los nombres de los Tejedores siguen sus raíces o son castellano/neutros?

### 10.10 Pendiente de sincronizar
- ✔ aplicado (2026-11-23) en `contexto/CONTEXTO_PROYECTO.md` (nombres de asentamientos, Bronsil/Valdera). Original: `contexto/CONTEXTO_PROYECTO.md` no nombra los asentamientos (Aldea del Vado, Puerto Gaviota, Caleta, Oasis de
  Arenal, Refugio del lago) ni Bronsil/Valdera; solo habla de «6–7 asentamientos». Añadir los nombres allí.
- `CONTEXTO_PROYECTO.md` deja fuera del MVP «misiones/diálogos complejos» (máx. 1–2 encargos simples): la trama
  principal, los NPCs que «reconocen» al protagonista y la escena final necesitan decidir **qué parte del lore entra en
  el MVP** y cuál se aplaza a fase 2/3 (NPCs modulares llegan en fase 3).
- `CONTEXTO_PROYECTO.md` describe la salida del dungeon como «victoria tras el jefe»; el lore pide un **estado
  persistente post-final** (Guardián liberado, mundo abierto) y aclarar si el dungeon se rejuega (pregunta 10).
- `docs/COMBATE.md` usa «Códice elemental» para fusiones y cuenta ≈ 40 «entradas del Códice» para XP: confirmar que
  las entradas de lore (hazañas, fragmentos) son las mismas o un apartado distinto del Códice.
- El **chamán goblin** ya existe en `docs/COMBATE.md` §2.14 (lanzador de runas), pero no en la lista de enemigos del MVP de
  `CONTEXTO_PROYECTO.md`, y su ficha está pendiente (COMBATE pregunta 9). El lore añade que su magia es **inestable**
  (runas a medias): reflejarlo en esa ficha (p. ej. más probabilidad de fallo) cuando se haga.
- `docs/COMBATE.md` §2.12 remite al GDD el detalle del **bolso mágico**: queda pendiente en la sección 5 de este documento.
- `CONTEXTO_PROYECTO.md` habla de **un** mercader fijo en el MVP y `docs/COMBATE.md` de **mercaderes** (stock por
  mercader y día): confirmar cuántos mercaderes hay en el MVP (D-6).

### 10.11 Decisiones abiertas: fauna y NPCs
Decidido por el usuario: **hay animales y hay NPCs** (§5.1, §5.2). Pendiente:

| # | Tema | Pregunta | Supuesto mínimo actual |
|---|---|---|---|
| D-1 | Actitud de la fauna | ¿Pasivos, presas, hostiles o una mezcla según especie? | Ambiental, no hostil [SUPUESTO] |
| D-2 | Especies | ¿Qué animales y en qué biomas (bosque, costa, desierto, monte nevado, islas)? | Sin decidir |
| D-3 | Utilidad jugable | ¿Se cazan? ¿Dan materiales (p. ej. para inscripciones de fase 2)? ¿Se pueden atacar con hechizos? | Sin utilidad jugable |
| D-4 | Lore de la fauna | ¿El deshilachado del tejido afecta a los animales (criaturas alteradas por la magia inestable)? | Sin decidir |
| D-5 | Papeles de NPC | Además del mercader: ¿dadores de encargos, narradores de lore/leyendas del Guardián, guías, entrenadores de runas? | Mercader confirmado; resto sin decidir |
| D-6 | Mercaderes en el MVP | ¿Uno fijo (CONTEXTO) o uno por asentamiento (lectura de COMBATE)? ¿En qué asentamiento? | Uno fijo [SUPUESTO de CONTEXTO] |
| D-7 | NPC recurrente | ¿Hay un NPC que guíe la trama (p. ej. un erudito de la Pausa)? Enlaza con §10.9 pregunta 5 | Sin decidir |
| D-8 | Reconocimiento | ¿Qué NPCs «reconocen» al protagonista (§10.4) y cómo se muestra sin diálogos complejos? | Sin decidir |
| D-9 | Vida de los NPCs | ¿Rutinas con el ciclo día/noche, se mueven entre asentamientos, pueden morir o ser atacados? | Quietos en su asentamiento, no atacables [SUPUESTO] |

Implicación técnica (para arquitecto/planificador, sin cambio aquí): NPCs y fauna son entidades nuevas que deberán
entrar en el streaming por celdas y, si son interactuables o atacables, en el sistema de interacción y de objetivos de
hechizos (`docs/COMBATE.md` ya contempla «Aliado / NPC / montura» como destino).

---

## 11. Fuera de alcance / futuro — PENDIENTE
