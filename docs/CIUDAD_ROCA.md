# Ciudad de la Roca: diseño arquitectónico

Autor: director-arte. Estado: borrador v2 (integra las respuestas del usuario). Marcado [SUPUESTO] = decisión mía, revisable.
Fuentes: `docs/GDD.md` (zona 3, este/sureste, §10 lore), `docs/GUIA_VISUAL.md` (paleta, presupuestos), `contexto/CONTEXTO_PROYECTO.md`.
Decisión del usuario: estilo **tallado en la roca** (fachadas esculpidas en arenisca, escaleras y puentes en el cañón, ciudad antigua del desierto).
Diseño propio: evoca la sensación de las ciudades rupestres en general, sin copiar ningún monumento real ni nada de otros juegos.

Decisiones del usuario integradas: ciudad **grande y habitada**; **subsuelo oculto** con sala de jefe y biblioteca gigante (conjuros como recompensa); **servicios** completos y una **arena**; fachada mayor replanteada; **puzles decididos**: cadena C → B → A hacia la sala escondida, D opcional, E descartado (§10); duelos de arena con elección matar/perdonar (§3c); subsuelo en instancia aceptado (§2, §3b); conjuros del archivo decididos (§3d); NPC guía del secreto además de pistas ambientales (§3b).

## 1. Concepto y fantasía del lugar

El jugador cruza un desierto de dunas ocres y de pronto el suelo se abre: una grieta estrecha entre muros de roca de 50 m. Tras un kilómetro de sombra fresca y luz rebotada, el cañón se ensancha y aparece, tallada en la propia pared, una ciudad entera: fachadas de columnas y frontones de varios pisos, terrazas con ropa tendida, humo de forjas, el rumor de un anfiteatro. La sensación es de **asombro sereno y bullicio**: una ciudad que no se construyó sobre la montaña sino que se *extrajo* de ella, y que sigue viva. Es un lugar luminoso y habitable (toldos, mercados, aves en los nichos), no una ruina lúgubre.

La escala es el recurso emocional: el personaje es diminuto frente a órdenes de columnas de 18 m; escaleras y puentes dan verticalidad y vértigo controlado. La ciudad es el gran **centro de servicios y de vida social** del desierto (comercio, descanso, arena de combate) y, a la vez, guarda un secreto: bajo ella, más allá del gran pozo que todos conocen, hay un nivel que nadie recuerda.

Relación con el lore (GDD §10): el **archivo de la Orden de los Tejedores** está bajo la ciudad [SUPUESTO del GDD]. La ciudad creció sobre el archivo y los habitantes actuales ya no saben que existe: solo conocen el pozo, sus galerías de copistas y sus tumbas. Se evita responder qué causó la Pausa y dónde fue la Orden (aplazado a fase 2); la biblioteca está intacta pero detenida, y sus glifos sugieren sin explicar. Los glifos de la Orden son sutiles y ambiguos.

## 2. Emplazamiento y escala

| Elemento | Dimensión [SUPUESTO] | Notas |
|---|---|---|
| Macizo de arenisca | ≈ 768 × 640 m en planta, 90-110 m sobre el suelo del cañón | Meseta superior plana con miradores y cisternas expuestas |
| Cañón de acceso (desfiladero) | ≈ 900 m de largo, 10-30 m de ancho, muros de 40-60 m, giros suaves | Entrada desde el desierto, oeste a este |
| Cañón principal / plaza | ≈ 160 × 200 m de suelo, muros de 60-80 m | Anfiteatro-arena tallado en el lado norte |
| Fachada mayor (Santuario del Telar) | 48 m de ancho × 38 m de alto, profundidad interior ≈ 30 m | Único edificio de máximo detalle |
| Terrazas de viviendas y servicios | 4 niveles de 6 m, bandas de 200 m en ambos lados del cañón | Unidas por escaleras talladas |
| Gran pozo central (parte pública del subsuelo) | 60 m de diámetro, 90 m de profundidad, 5 niveles | En la meseta; rampa helicoidal y galerías |
| Subsuelo oculto | Sala del jefe a 100-118 m; biblioteca a 118-170 m de profundidad bajo la meseta | Ver §3b; **instancia aparte (decidido)**, con pantalla de carga al cruzar el pasaje N6 |
| Puentes | 4-6, luces de 12-35 m, altura 20-45 m | Piedra de un arco; uno colgante de madera y cuerda |

**Encaje en celdas de 128 m (streaming):** el conjunto superficial ocupa un bloque alineado de **6 × 5 celdas (768 × 640 m)** más **7 celdas lineales** para el desfiladero [SUPUESTO]. Cada celda guarda datos de geometría y props; el macizo son piezas por celda con una malla lejana única (§7). El pozo público (N1-N5) cae en 1-2 celdas centrales como interior contiguo. **La sala del jefe y la biblioteca son una instancia aparte** (patrón del dungeon del GDD): ahorran memoria en el mundo abierto y permiten iluminación propia; el acceso es el pasaje oculto desde el fondo del pozo. La zona es de dificultad 3 (GDD §5): grupos mixtos de 4-5 en el desfiladero, el pozo bajo y la periferia; plaza, terrazas y servicios son zona segura.

## 3. Recorrido y distritos

```
 DESIERTO (oeste)
      |
 [1] DESFILADERO  ~900 m, sombra, giros (combate)
      |
 [2] PLAZA  --- mercados bajo toldos, fuente, descanso
      |   \---- [2b] ANFITEATRO-ARENA (norte) + Casa de la Arena
      |         \
      |          [3] TERRAZAS: viviendas y SERVICIOS (herrero, posada...)
      |                \--- puentes ---\
 [4] SANTUARIO DEL TELAR (fachada mayor) <--/  conducto de luz al pozo
      |
 [5] ESCALERA MONUMENTAL -> MESETA (cisternas, miradores)
      |
 [6] GRAN POZO  (parte publica del subsuelo)
      N1 copistas -> N2 tumbas -> N3 mapas -> N4 cisterna profunda -> N5 fondo "sin salida"
      puzle C (superficie + N1-N3) -> puzle B (N3-N4) -> puzle A (rayo del Santuario
      por el conducto, espejos N3-N5, abre N6); D: glifos opcionales por la ciudad
      ·· · · · · · · · · · · · · · · · · · · · · · · · · · · · ·
      OCULTO (se encuentra explorando, sin señalizar)
      N6 pasaje y antecámara -> N7 SALA DEL JEFE -> N8 BIBLIOTECA GIGANTE (conjuros)
```

### 3a. Distritos de superficie y servicios

| Zona | Función de juego | Lugares de interés / descanso | NPCs y servicios [SUPUESTO] |
|---|---|---|---|
| 1 Desfiladero | Aproximación, combate, revelado | Nicho-altar de viaje (descanso), grafitis de caravanas, vistazo previo de la ciudad | Sin NPC fijo; patrullas, caravaneros ocasionales |
| 2 Plaza | Hub social | Fuente, mercado bajo toldos, **punto de descanso**, tablón de encargos, cambista | Mercader general, mercader de telas/tintes, vendedor de comida, cambista, guardas |
| 2b Anfiteatro-arena | Combate organizado con recompensa | Ver §3c | Maestro de la arena, inscriptor, entrenadores, presentador, público |
| 3 Terrazas (4 niveles) | Exploración vertical, servicios, secundarias | Viviendas visitables, tendederos, huertos en macetas, mirador al atardecer | **Herrero/armero**, **posada** (cama, descanso completo y guardado), **alquimista/curandero**, **sastre/peletero**, **establo** (caballos), **escriba/copista** (venta de pergaminos), taberna, gremio de cazadores (encargos) |
| 4 Santuario del Telar | Hito y lore de superficie | Sala hipóstila, ranura solar, conducto de luz, relieves | Sacerdote-custodio, acólitos |
| 5 Puentes y escaleras | Conexión y vértigo | Vistas, atajos | Ninguno |
| 6 Pozo (N1-N5) | Subsuelo público, riesgo creciente | Descanso en N1 y N3 | Archivista (N1), enemigos desde N3 |

Puntos de descanso: **plaza, posada, nicho del desfiladero, pozo N3** (4) [SUPUESTO]. La ciudad requiere un límite de NPCs activos superior al de aldea (GDD: ≤ 12): propongo **≤ 24 activos + multitud de fondo en impostores** [SUPUESTO] (ver §7). El erudito recurrente (D-7 del GDD) sigue sin decidir; el Archivista es candidato.

### 3b. Subsuelo: niveles, pistas, sala del jefe y biblioteca

**Niveles del subsuelo [SUPUESTO]:**

| Nivel | Profundidad | Carácter | Visibilidad |
|---|---|---|---|
| N1 Galería de copistas | 0-18 m | Estantes vacíos, mesas, archivista; luz de óculo | Público |
| N2 Tumbas y nichos | 18-38 m | Hileras de nichos funerarios, relieves | Público |
| N3 Sala de mapas | 38-58 m | Mapas tallados, descanso, primeros enemigos | Público |
| N4 Cisterna profunda | 58-78 m | Agua, compuertas, plataformas; enemigos | Público (peligroso) |
| N5 Fondo del pozo | 78-90 m | Cámara circular de aspecto sellado, «aquí acaba el pozo» | Público; aparente callejón sin salida |
| N6 Pasaje y antecámara | 90-100 m | Pasadizo estrecho, glifos de umbral, trampas ligeras | **Oculto**: se llega resolviendo la cadena de puzles (§10). **Pantalla de carga al cruzar el umbral de N6** hacia la instancia |
| N7 Sala del jefe | 100-118 m | Arena circular de combate | Oculto, **instancia (decidido)** |
| N8 Biblioteca gigante | 118-170 m | Archivo de la Orden, recompensa de conjuros (§3d) | Oculto, misma instancia; se abre al derrotar al jefe |

**Pistas ambientales (sin flechas ni marcadores):** la exploración se guía por el mundo, nunca por la interfaz.
- **Corrientes de aire:** llamas de antorcha que se inclinan, polvo y telas que se mueven hacia la pared oculta en N4-N5.
- **Desgaste:** peldaños y suelo más pulidos hacia el punto de paso; marcas de arrastre de estantes en N5.
- **Glifo de umbral:** variante del glifo de la Orden (un dintel con una línea abierta) que aparece en 3-4 sitios de la ciudad antes de repetirse en N5; el Códice lo anota la primera vez que se ve.
- **Luz:** un haz fino de luz solar con polvo que cae donde no debería (N4/N5), por una grieta del conducto del santuario.
- **Sonido:** eco distinto y viento grave en la pared hueca (para `audio`); goteo de agua que corre hacia una rendija.
- **Rastros narrativos:** esqueleto de un explorador con un cuaderno con un dibujo; arañazos en una pared; una vasija con la marca del santuario fuera de su sitio.
- **Pista humana (decidido: pistas ambientales Y un NPC):** el **Archivista anciano** [SUPUESTO] da frases crípticas por etapas (ver abajo). Las pistas ambientales funcionan solas; el NPC solo orienta, nunca da la solución.

**NPC guía: el Archivista anciano [SUPUESTO].** Copista veterano que trabaja de día en la galería N1 y de noche en el taller del escriba de las terrazas. Ha oído «la leyenda del pozo que respira» pero no sabe qué hay abajo. **No cierra el NPC recurrente D-7 del GDD**: es un NPC local de la ciudad; si D-7 se decide más adelante, puede absorber o no este papel.

| Etapa (según flags de la cadena) | Frase críptica [SUPUESTO] | Qué orienta |
|---|---|---|
| 0. Antes de C | «El pozo recuerda lo que la ciudad olvida. Prueba primero lo que arde y lo que hiela.» | Probar hechizos sobre toldos y agua |
| 1. C resuelto | «Donde baja el agua, algo espera a que la dejen ir.» | Compuertas y cisternas (B) |
| 2. B resuelto | «El santuario se enciende a su hora; la luz sabe el camino mejor que yo.» | Rayo solar y espejos (A) |
| 3. A resuelto | «Si una puerta se abre sola, no entres con prisa.» | Preparación para el jefe |
| 4. Jefe vencido | «Dicen que allí abajo se guarda todo, menos la hora que nadie encuentra.» | Eco de la reserva del Arcano de Tiempo (§3d) |

Reglas: una frase por conversación, repetible, sin marcador de misión ni flecha; el estado de etapa lo marca la cadena de puzles; si el jugador ya la superó, el Archivista no «retrocede». Entradas de Códice opcionales por frase.

**Sala del jefe (N7). Solo el espacio; la ficha del jefe es de `disenador-combate`:**
| Aspecto | Diseño [SUPUESTO] |
|---|---|
| Forma y tamaño | Cámara circular de 48 m de diámetro y 18 m de altura; suelo útil plano de 40 m de diámetro (movimiento direccional, esquivas y hechizos de área con margen) |
| Legibilidad | Suelo liso con anillos concéntricos grabados que delimitan zonas (centro / anillo medio / borde) útiles para telegrafiar ataques; sin desniveles ni obstáculos que corten la cámara |
| Cobertura | 6 pilares de Ø 2,4 m en el anillo exterior (cobertura parcial, destructibles o no según el jefe); nichos laterales de 4 m de profundidad como refugios |
| Acceso | Puerta de bronce y piedra de 6 × 9 m desde N6, que se sella al entrar; punto de reaparición cercano fuera de la sala |
| Salida | Muro este de 14 m que se retrae al derrotar al jefe y revela una rampa descendente a la biblioteca |
| Iluminación | Luz fría azulada desde un óculo cenital cerrado por un vidrio rúnico (tenue) + 8 braseros rúnicos cálidos en el borde como acentos; el suelo nunca queda negro cerrado; el color del brasero cambia con la fase del combate |
| Atmósfera | Polvo suspendido, eco largo, sin viento; temperatura de color más fría que la superficie |
| Presupuesto | Instancia ≤ 25 draw calls; ≤ 6 luces dinámicas incluyendo hechizos |

**Biblioteca gigante (N8):**
| Aspecto | Diseño [SUPUESTO] |
|---|---|
| Escala | Cavidad ovoide de 160 × 100 m y 60 m de altura; sensación de catedral invertida |
| Estanterías talladas | Muros cubiertos de nichos-estante de 0,6 × 3 m en 12 niveles de galerías (5 m cada una); rollos y libros como props instanciados; solo 3-4 galerías con detalle real |
| Circulación | Rampa en espiral por el perímetro, escaleras talladas y 5 puentes de piedra que cruzan el vacío central |
| Centro | «Pozo de luz» de 20 m con cristales de conjuro que cuelgan y dan luz difusa fría; plataforma central de lectura |
| Conjuros (recompensa) | **1 atril central garantizado + 5 atriles/capillas opcionales** escondidos en galerías; reparto decidido en §3d (pendiente solo de ficha detallada en COMBATE.md §2) |
| Luz | Tono dorado frío: luz difusa de cristales (#e6d3a3 / #9fb8d9), motas de polvo, rayos suaves desde lucernarios muy altos; atriles con halo rúnico más cálido para guiar la mirada |
| Ambiente | Silencio, reverberación, páginas moviéndose con corriente tenue; sin enemigos (zona de recompensa y descanso) |
| Presupuesto | Instancia ≤ 30 draw calls; geometría por segmentos con LOD y *culling* por galería |

### 3c. Anfiteatro-arena (ex teatro)

Decisión: **el teatro tallado se convierte en anfiteatro-arena**. Es el mismo gesto arquitectónico (gradas esculpidas) y evita duplicar un edificio grande. Queda en el lado norte de la plaza.

| Elemento | Diseño [SUPUESTO] |
|---|---|
| Ruedo | Elíptico de **40 × 32 m**, suelo de arena compactada con anillos; combate direccional con rodar, bloqueo y hechizos (sobra espacio sin perder presión) |
| Muro del podio | 3,5 m de alto, con parapeto; impide salir y protege al público; vallas de madera decorativas |
| Gradas | 14 filas talladas en semicírculo, aforo ≈ 1 200 (público en impostores y multitud instanciada) |
| Palco | Balcón de 12 m con toldo en el eje de la fachada del anfiteatro; presentador y notables |
| Jaulas y fosos | 6 jaulas de reja de bronce bajo las gradas con **compuertas de madera** al ruedo; 2 fosos de 3 m con rejilla para monstruos grandes; corredores de servicio |
| Accesos | Dos túneles opuestos: uno de combatientes (con enfermería y rack de armas) y uno de monstruos |
| Inscripción | **Casa de la Arena**: edificio-fachada en la plaza con mostrador de inscripción, tablón de rangos y vendedor de entradas |
| Ambiente | Banderolas, brasas de brasero, luz de tarde cenital; de noche antorchas en el podio |

**Reglas de la arena (propuesta [SUPUESTO] para el diseñador de juego, no vinculante):** inscripción gratis o con cuota; **rondas** de 3-5 oleadas con descanso entre oleadas; **rangos** Bronce, Plata, Oro y Campeón desbloqueados al completar el anterior; enemigos: monstruos del bestiario más duelos con NPCs (humanos o no-muertos); recompensas: oro, experiencia, objeto de rango y título; sin penalización de muerte más allá de perder la ronda; límite de intentos por día opcional.

**Duelos contra NPCs: el jugador elige matar o perdonar (decisión del usuario).** Al ganar, el rival cae de rodillas, el público guarda silencio y aparece la elección **Perdonar / Matar** (aviso DOM de `interfaz-ui`; el presentador y las gradas reaccionan, aclamación o abucheo). Consecuencias [SUPUESTO, a definir por GDD]:

| Elección | Consecuencias propuestas |
|---|---|
| Perdonar | Sube la **reputación en la Casa de la Arena**; el rival conserva su lugar en el cartel y **puede volver más fuerte** (un rango de dificultad superior, equipo mejorado) |
| Matar | **Botín extra** (el equipo del rival); el rival **desaparece del cartel**; **baja la reputación** con algunos NPCs de la ciudad (los vinculados a él y facciones pacíficas, p. ej. sacerdotes) |

Notas de producción: la elección no afecta al ruedo ni al kit; sí requiere una ventana de interacción y animaciones breves de remate y de piedad (coordinar con `programador-gameplay` y `artista-3d`). Los monstruos de jaula no ofrecen esta elección.

### 3d. Conjuros del archivo (DECIDIDO por el usuario; pendiente solo la ficha detallada en COMBATE.md §2)

Coherente con `docs/COMBATE.md` §2 (nombres de §2.3, §2.5, §2.7 y §2.10). El archivo recompensa **explorar**: lo esencial es corto de obtener y lo demás está escondido en las 12 galerías. Numeración: G1 a nivel del suelo, G12 junto al techo.

| Recompensa | Tipo (COMBATE §2) | Galería y presentación [SUPUESTO] | Tiempo añadido |
|---|---|---|---|
| **Arcano de Espacio** (garantizado) | Núcleo Arcano (Aire+Sombra+Tierra); destinos de Espacio, p. ej. **Piedra de paso** | **Atril central** de la plataforma de lectura, tras vencer al jefe. Una página de luz se compone en el aire a partir de motas, gira y se funde con la runa del jugador (estilo visor del grimorio). La Orden lo usaba para moverse por el archivo | 0-2 min tras la ruta principal; además 1-2 esquirlas rúnicas junto al atril para estrenar Piedra de paso [SUPUESTO] |
| **Llama sagrada** (Fuego+Luz) | Receta de la Orden (§2.5, fusión 2) | **G5**: capilla de brasero con atril lateral; la página se forma al encender el brasero con fuego | 3-5 min |
| **Aurora** (Aire+Luz) | Receta de la Orden (§2.5, fusión 18) | **G8**: balcón bajo un lucernario; la página aparece al incidir la luz del lucernario en el atril | 3-5 min |
| **Crepúsculo** (Luz+Sombra) | Receta de la Orden (§2.5, fusión 12) | **G2**: rincón oscuro tras estantes (pista por corriente de aire); la página es visible solo en penumbra y se forma al acercarse | 4-6 min |
| **Planeo** | Runa de movimiento (§2.10) | **G11**: mirador cerca del techo alcanzable por puentes; página flotante junto al vacío central, ideal para estrenarlo | 4-6 min |
| **Ancla** | Runa de control (§2.3: −15 % potencia, −20 inestabilidad) | **G3**: mesa de «correcciones» del copista, con un atril entre rollos | 3-4 min |
| **Arcano de Tiempo** | **No incluido**: reservado al final de la trama (la Pausa) | **G6**: mural «Tabla de las Horas» con una hornacina vacía; 2-3 **entradas de lore en el Códice** (pistas, sin respuestas), y el atril central deja un hueco con marca de reloj | 2-3 min de lectura |

Total de exploración opcional ≈ **20-30 min** (más 8-10 min de ruta principal hasta el atril central). Los opcionales se descubren con las mismas pistas ambientales (luz, corrientes, polvo); ninguno tiene marcador.

Puntos a cuadrar con COMBATE (anotados en «Pendiente de sincronizar»): (1) las fusiones y arcanos se descubren lanzándolos una vez (§2.7); falta decidir si el atril concede directamente la receta; (2) las zonas de anulación (§2.10) bloquean Planeo en dungeons y salas de jefe: la biblioteca, como zona de recompensa, no debería bloquear Planeo, o Planeo se usaría solo fuera (en el pozo y la meseta); (3) Piedra de paso no se puede crear dentro de la instancia.

## 4. Lenguaje arquitectónico

**Regla maestra:** *todo lo monumental está tallado (sustractivo); lo cotidiano y reversible está construido (aditivo).* Se lee en el material: lo tallado tiene la veta y erosión de la roca madre; lo construido es madera, adobe revocado y sillares sueltos.

| Aspecto | Regla |
|---|---|
| Proporciones | Módulo base 1 m; piso de 6 m (vivienda) / 9 m (monumental); columna = 9 diámetros; fachada mayor 4 × 3 módulos de 12 m |
| Órdenes de columnas (propios) | **Orden Telar:** fuste liso con cinco acanaladuras y capitel de haces entrelazados (alude a «tejer»). **Orden Veta:** fuste ancho y corto con anillos que imitan estratos, capitel de volutas planas. Ninguno copia un orden clásico ni un monumento concreto |
| Frontones | Triangulares bajos (≈ 12°) con tímpano profundo (≥ 1,2 m); partidos en niveles altos |
| Cornisas | Escalonadas en 3-5 gradas, voladizo de 0,6-1,2 m |
| Nichos | Arcos de medio punto o rectos de 1,2 × 2,4 m, en filas: altares, tumbas, estantes o ventanas ciegas |
| Portales | Monumental 4 × 9 m con jambas trapezoidales; vivienda 1,2 × 2,2 m |
| Ventanas | Huecos pequeños, a veces con celosía; la luz cálida de noche las hace legibles a distancia |
| Relieves y glifos de la Orden | Sutiles: bandas de 5-8 cm en dinteles, cornisas y umbrales. Algunos reaccionan al hechizo de runas; el **glifo de umbral** (§3b) es una variante recurrente |
| Estratos y erosión | Bandas horizontales de 0,3-3 m con alternancia de color; desprendimientos, arena en cornisas, manchas de agua bajo canalones, grietas |
| Silueta | Fachadas verticales, escaleras diagonales, puentes horizontales: lectura clara de rutas |

### Fachada mayor: Santuario del Telar (replanteada)

**Uso elegido:** un **santuario de superficie, activo y venerado** (templo-observatorio solar de la Orden) cuyos custodios mantienen un ritual diario de luz sin saber que **su eje arquitectónico está alineado con el acceso sellado del subsuelo**. Una ranura solar en el tímpano deja entrar un rayo de luz que recorre la sala hipóstila y cae en un **conducto vertical** hacia el pozo; la ciudad cree que es una liturgia, pero es una llave.

**Por qué:** (1) es coherente con una ciudad habitada: tiene vida, sacerdotes y fieles, y justifica los servicios sagrados (sanación, descanso, Códice); (2) liga la fachada con el subsuelo sin convertirla en entrada obvia, lo que respeta que el secreto se encuentre explorando; (3) cumple la fantasía de «hito visible» y da peso al ciclo día/noche (el rayo existe solo a una hora del día); (4) la Orden queda presente pero sin respuestas (no aclara la Pausa); (5) soporta la propuesta de puzle A (§10) sin cambiar la arquitectura.

## 5. Tipologías de edificio

| Tipología | Descripción | Tallado/construido | Tamaño típico [SUPUESTO] |
|---|---|---|---|
| Fachada monumental (Santuario) | Columnas Telar/Veta, frontón con ranura solar, portal y nichos | 100 % tallado; puertas de madera y bronce | 48 × 38 m (mayor); 18-24 m (secundarias) |
| Anfiteatro-arena | Gradas talladas, podio, palco, jaulas y túneles | Tallado; vallas, toldos y rejas construidos | Ruedo 40 × 32 m; gradas hasta 20 m de radio |
| Casa de la Arena | Fachada de inscripción en la plaza | Tallado con añadidos de madera | 14 × 12 m |
| Vivienda rupestre | Puerta y 1-2 ventanas, interior excavado | Tallado; madera, toldo, tendedero | 6 × 6 m fachada, interior 5 × 8 m |
| Taller/servicio (herrería, posada, alquimista, sastre, establo, escriba, taberna) | Vivienda ampliada con rótulo y objeto distintivo (yunque, cama, frascos) | Tallado + añadidos reconocibles | 8-12 m de fachada; interiores visitables según servicio |
| Tumba / nicho | Hileras de nichos; cámaras pequeñas | Tallado | Nicho 1,2 × 2,4 m; cámara 4 × 4 m |
| Cisterna | Depósito con canales y escalones | Tallado, revoque impermeable | 10 × 15 × 6 m; agua con shader simple |
| Mercado bajo toldos | Puestos adosados a la pared bajo telas | Construido sobre suelo tallado | Franja 40 × 12 m |
| Puente de piedra | Arco único con parapeto | Sillar o puente natural tallado | Luz 12-35 m, ancho 4 m |
| Escaleras talladas | Tramos de 12-30 peldaños con descansos | Tallado; peldaños desgastados al centro | Peldaño 0,22 × 0,32 m, ancho 2-4 m |
| Galerías del pozo (N1-N5) | Pasarelas, rampa helicoidal, nichos | Tallado; pasarelas de madera | Rampa 4 m de ancho; galerías 5 m de alto |
| Pasaje y antecámara (N6) | Pasadizo estrecho con glifos y puerta de umbral | Tallado | 3 × 4 m de sección; antecámara 12 m |
| Sala del jefe (N7) | Cámara circular con pilares y braseros | Tallado | Ø 48 × 18 m |
| Biblioteca gigante (N8) | Estantes en muros, galerías, puentes, pozo de luz | Tallado; lámparas y atriles | 160 × 100 × 60 m |

## 6. Materiales y color

Paleta base (GUIA_VISUAL): arenisca cálida **#c79a62** (luz), **#a87444** (media), **#6e5438** (sombra y estrato oscuro). Añadidos [SUPUESTO]: revoque pálido #d9c29a, estrato rojizo #9a5f3c, verdín de bronce #7a8a6a, luz de cristal de biblioteca #e6d3a3 / #9fb8d9.

| Material | Uso | Notas PBR |
|---|---|---|
| Arenisca por estratos | Toda la roca tallada | Triplanar de roca de la biblioteca + máscara de estratos por altura mundial; rugosidad 0,85-0,95, detail normal granular; arena en superficies horizontales (por normal Y) |
| Roca profunda (subsuelo) | N6-N8 | Misma arenisca, más fría y con menos polvo (#8a6a4c base), pulida en estantes y suelo de sala |
| Revoque | Interiores y fachadas añadidas | Crema, desconchado; rugosidad 0,8 |
| Madera | Puertas, vigas, pasarelas, andamios, compuertas | Madera de la biblioteca, tono seco y gris |
| Telas | Toldos, tendederos, banderolas | Ocre, rojo teja, azul añil, verde oliva; translucidez falsa por emisivo bajo; movimiento por vértice con viento |
| Metal envejecido | Herrajes, rejas, espejos, braseros | Bronce con verdín en recesos; los espejos del puzle A pulidos (rugosidad baja) |

**Luz y atmósfera:**
- **Día:** el sol solo ilumina la parte alta del cañón; el fondo recibe luz rebotada cálida (hemisférica/probe). Sombras en cascada con casi todo el contraste en cornisas.
- **Atardecer:** la fachada mayor, orientada al oeste, se enciende en #c79a62 saturado; bruma dorada por altura; ranura solar activa.
- **Noche:** luna fría, cañón en azul legible; antorchas y faroles en nichos y portales (sprites emisivos + bloom, ≤ 4 luces dinámicas visibles); ventanas cálidas; la arena se ilumina con braseros.
- **Subsuelo:** más frío y sombrío que la superficie pero legible, sin negro cerrado (GUIA_VISUAL, dungeon); luz rúnica y braseros protagonistas; biblioteca más cálida y luminosa para la recompensa.
- **Polvo y viento:** partículas en haces de luz, arena arrastrada en el desfiladero, telas movidas por el viento.

## 7. Kit modular para producción

Grid: **1 m** de snap fino, **3 m** de snap de módulo, **6 m** de piso; rotación de 90° (45° en escaleras). Origen en la base centrada, +Y arriba. Texturas: **atlas de kit 2K (Bajo-Medio) / 4K (Alto-Ultra)**, KTX2, más el triplanar de roca compartido; 1-2 materiales de kit.

| Pieza | Tamaño (m) | Variantes | Tris LOD0 / LOD1 / LOD2 | Textura |
|---|---|---|---|---|
| Panel de pared tallada lisa | 12 × 12 × 3 | 4 | 1 500 / 600 / 200 | Triplanar roca |
| Módulo de fachada (pared + cornisa) | 12 × 9 × 2 | 3 | 2 500 / 1 000 / 300 | Atlas kit |
| Columna Telar / Veta | Ø 1,6 × 14 | 2 + 2 | 2 000 / 800 / 250 | Atlas kit |
| Frontón con tímpano (y variante con ranura solar) | 12 × 3 × 1,5 | 3 + 1 | 1 800 / 700 / 250 | Atlas kit |
| Cornisa escalonada | 3 × 1,2 × 1,2 | 3 | 700 / 300 / 100 | Atlas kit |
| Nicho (simple / doble / arco) | 1,2-2,4 × 2,4 | 3 | 500 / 250 / 80 | Atlas kit |
| Portal monumental | 4 × 9 × 2 | 2 | 3 000 / 1 200 / 400 | Atlas kit |
| Puerta/ventana de vivienda y servicio | 1,2 × 2,2 | 5 | 500 / 250 / 80 | Atlas kit |
| Tramo de escalera | 3 × 3 × 6 | 3 | 1 000 / 400 / 150 | Atlas kit |
| Arco de puente (luz 12 / 24 / 35) | 4 × variable | 3 | 2 500 / 1 000 / 300 | Atlas kit |
| Barandilla / balaustre | 3 × 1 | 2 | 600 / 250 / 80 | Atlas kit |
| Segmento de gradas (6 filas) | 6 × 3 × 4 | 2 | 1 200 / 500 / 150 | Atlas kit |
| Muro de podio con parapeto | 6 × 3,5 × 1 | 2 | 900 / 400 / 120 | Atlas kit |
| Jaula/compuerta de arena (reja + madera) | 4 × 3,5 × 2 | 3 | 2 000 / 800 / 250 | Atlas kit |
| Palco | 12 × 4 × 4 | 1 | 3 000 / 1 200 / 400 | Atlas kit |
| Rótulos y fachadas de servicio (kits de oficio) | 4 × 3 | 8 | 800 / 350 / 100 | Atlas props |
| Pieza del pozo (anillo con nichos, 8 segmentos) | Ø 60 × 6 | 2 | 3 000 / 1 200 / 400 por segmento | Atlas kit |
| Compuerta y canal de cisterna (puzle B) | 3 × 3 × 1 | 2 | 1 200 / 500 / 150 | Atlas kit |
| Plataforma flotante de piedra (puzle B) | 4 × 0,6 × 4 | 2 | 700 / 300 / 100 | Atlas kit |
| Espejo de bronce giratorio (puzle A) | Ø 1,5 × 2 con soporte | 2 | 1 500 / 600 / 200 | Atlas kit + metal |
| Pilar de glifos (puzle D, opcional; sin anillos giratorios, E descartado) | Ø 2 × 5 | 2 | 2 500 / 1 000 / 300 | Atlas kit |
| Toldo/cuerda quemable y agua congelable (puzle C) | 3 × 4 / 4 × 4 | 2 + 2 | 500 / 250 / 80 · 400 / 200 / 60 | Atlas props |
| Pared de glifos reactivos y puerta oculta de N6 (puzles C y A) | 4 × 6 × 1 | 2 | 1 800 / 700 / 250 | Atlas kit |
| Estantería tallada (módulo muro) | 3 × 5 × 1 | 3 | 1 500 / 600 / 200 | Atlas kit |
| Galería con balaustrada (biblioteca) | 6 × 5 × 3 | 3 | 1 800 / 700 / 250 | Atlas kit |
| Atril/capilla de conjuro | 2 × 3 × 2 | 4 | 2 000 / 800 / 250 | Atlas kit |
| Pilar de sala del jefe y brasero rúnico | Ø 2,4 × 18 / 1,2 × 1,5 | 1 + 2 | 2 500 / 1 000 / 300 · 600 / 250 / 80 | Atlas kit |
| Roca de transición/derrumbe | 3-8 | 6 | 1 000-3 000 / 600 / 200 | Triplanar roca (instancing) |
| Toldo y tendedero | 3-6 | 6 (tinte) | 500 / 250 / 80 | Atlas props |
| Props (jarras, barriles, faroles, rollos, libros) | 0,3-2 | 20+ | 400-2 000 / 50 % / — | Atlas de props |

**Presupuesto de superficie (conjunto visible):** ≤ **40 draw calls** (GUIA_VISUAL): ≈ 10 atlas de kit por tipo con instancing, ≈ 6 roca triplanar, ≈ 8 props/telas/servicios, ≈ 6 anfiteatro y puentes, margen ≈ 10 para partículas, agua y cielo. Tris en pantalla orientativos: ≤ 1,3 M en Ultra, ≤ 450 k en Bajo [SUPUESTO]. Paneles fusionados en `BatchedMesh` por celda.

**Subsuelo (instancia):** sala del jefe ≤ 25 draw calls; biblioteca ≤ 30; el pozo N1-N5 se cuenta en la superficie.

**Multitud y NPCs:** ≤ 24 NPCs activos con modelo propio (≤ 8 000 tris LOD0, GDD); público del anfiteatro y fondo de plaza como instancias animadas de 3-4 variantes a ≈ 400-1 000 tris, y a distancia como impostores (sin cartoon: mismos materiales y escala).

**LOD e impostor del conjunto lejano:**
- LOD0 ≤ 60 m, LOD1 hasta 120 m, LOD2 hasta 250 m; piezas monumentales con LOD0 extendido a 90 m [SUPUESTO].
- **Conjunto lejano (> 250 m):** **1 malla simplificada del macizo ≈ 12-20 k tris** con textura baked 2K, más impostor de 8 vistas de la fachada mayor y del anfiteatro. Fundido con *dithering* y bruma.
- Interiores (pozo, santuario, subsuelo) solo cargados al acercarse; *culling* por galería.

## 8. Proxy del MVP vs. arte final (fase 3)

| Aspecto | MVP (proxy) | Fase 3 (arte final) |
|---|---|---|
| Macizo y cañón | Cajas y cuñas extruidas con triplanar arenisca y máscara de estratos; geometría de celda por datos | Mallas esculpidas con el kit completo, erosión y variantes |
| Fachada mayor | Pared plana con columnas cilíndricas, frontón triangular, portal y **ranura solar funcional** (si se elige puzle A) | Órdenes Telar/Veta, nichos, relieves y glifos |
| Anfiteatro-arena | Elipse 40 × 32 m con gradas escalonadas de cajas, muro de podio, 2-3 compuertas funcionales; público en columnas de impostores | Gradas talladas, jaulas, palco, multitud animada |
| Servicios | Edificios-caja con rótulo distintivo y NPC genérico por servicio (mercader, herrero, posada); interiores solo si el servicio lo exige | Interiores diferenciados, props de oficio, vida ambiental |
| Escaleras y puentes | Rampas escalonadas y arcos de caja con colisión correcta | Kit tallado con desgaste y madera añadida |
| Pozo (N1-N5) | Cilindro con rampa helicoidal y 5 niveles señalados; sin detalle fino | Segmentos con nichos, estantes y props |
| Subsuelo oculto (N6-N8) | Antecámara con pantalla de carga al cruzar, **sala circular de 40 m** con 6 pilares y puerta, **sala-biblioteca simple** con estanterías de cajas y 6 atriles (1 central garantizado + 5 opcionales en galerías, con la página de luz como efecto sencillo); luz por colores base | Biblioteca monumental completa, 12 galerías, cristales, props |
| Puzles (cadena C → B → A decidida) | C: 1 toldo quemable, 1 charca congelable y 1 pared de glifos reactiva con primitivas. B: 2 compuertas y plano de agua con altura variable y 2-3 plataformas de caja. A: ranura solar, 3 espejos como cilindros girables con 4 posiciones fijas, rayo como línea emisiva, puerta oculta. D (glifos y Códice) solo si sobra tiempo | Piezas del kit, rayo y agua finales, glifos de D, reflejos libres |
| Lejano | Silueta única baked sencilla | Malla + impostores |
| Coste | Superficie ≤ 14 draw calls y ≤ 120 k tris; instancia ≤ 10 draw calls | Presupuesto de §7 |

Prioridad del MVP: que el **recorrido, la escala y el descubrimiento** funcionen (desfiladero, plaza, arena, pozo, secreto, jefe, biblioteca) con luz y atmósfera correctas; el detalle fino va a fase 3.

## 9. Referencias de sensación y preguntas abiertas

**Referencias de sensación (genéricas):**
- Ciudades y necrópolis rupestres de arenisca en general: fachadas monumentales emergiendo del acantilado, luz rebotada en cañones.
- Atardeceres sobre roca rojiza, haces de polvo, sombras duras bajo cornisas.
- Mercados de zoco con toldos de colores y bullicio de anfiteatro en piedra.
- Bibliotecas subterráneas inmensas con luz difusa; pozos y cisternas con escaleras que descienden.

**Preguntas abiertas para el usuario (máx. 5):**
(Resueltas: puzles §10, duelos de arena §3c, instancia aparte §2, NPC guía §3b.)
(Conjuros del archivo: decidido, §3d.)
1. ¿Te parece bien que el **Archivista anciano** sea el NPC guía del secreto (sin cerrar D-7), o prefieres otro personaje?

## 10. Puzles (DECIDIDO por el usuario)

**Decisión:** cadena obligatoria de 3 puzles hacia la sala escondida: **C** (conjuros como llaves; superficie y pozo alto) → **B** (cisternas y canales; pozo medio) → **A** (espejos de sol; clave final que abre N6 y la sala del jefe). **D** (glifos de la Orden por la ciudad) como pistas opcionales que se apuntan en el Códice. **E** (anillos del pozo) **descartado**.

Valoración [SUPUESTO] de las opciones consideradas, para planificar (la fila E se conserva solo como registro):

| Id | Puzle | Dónde va | Duración | Dificultad | Piezas de kit | Riesgo de producción |
|---|---|---|---|---|---|---|
| A | **Espejos de sol:** el rayo entra por la ranura del frontón del Santuario a una hora del día; el jugador gira espejos de bronce para llevar la luz pozo abajo hasta un glifo que abre una puerta | Santuario (ranura, conducto) y pozo medio-bajo (N3-N5) | 6-10 min (+ esperar la hora del día; el jugador puede avanzar el reloj en el descanso) | Media | Frontón con ranura, conducto, 3-4 espejos giratorios, pared con glifo, puerta oculta; rayo como línea emisiva | Medio-alto: depende del ciclo día/noche, **raycast** con reflexión y feedback claro; mitigable con rayo discreto y pista de luz |
| B | **Cisternas y canales:** abrir/cerrar compuertas para vaciar o inundar niveles del pozo; el agua sube plataformas flotantes o deja al descubierto un paso | N3-N4 (cisterna profunda) | 8-12 min | Media | Compuertas, canales, plataformas flotantes, agua con altura variable, rejas | Medio: nivel de agua dinámico y colisión de plataformas; coste de shader bajo si es un plano |
| C | **Conjuros como llaves:** Lanza de escarcha congela agua para crear un paso, Bola de fuego quema toldos/cuerdas que ocultan un acceso, Destello sagrado revela glifos invisibles | Superficie (toldos y fuentes) y pozo alto (N1-N3) | 5-8 min | Baja-media | Toldos y cuerdas quemables, agua congelable, pared con glifos reactivos | Bajo-medio: reutiliza los hechizos y estados de entorno; requiere un sistema simple de interacción hechizo-objeto |
| D | **Glifos de la Orden repartidos por la ciudad:** secuencias grabadas en fachadas que hay que repetir en pilares del subsuelo (se anotan en el Códice) | Ciudad (3-5 sitios) y N5 | 10-15 min de búsqueda | Media-alta (exploración) | Relieves de glifos, pilares de glifos, entradas de Códice | Bajo en arte; riesgo de diseño: puede frustrar sin pistas, por eso es opcional |
| E | **Anillos del pozo:** estratos tallados que giran como cerradura de combinación hasta alinear un relieve | N5 (cámara circular) | 5-8 min | Media | Anillos concéntricos giratorios con relieve, pilares, mecanismos | Medio: animación y snap precisos; reutilizable como cierre del pasaje |

**Cadena adoptada (recomendación del equipo aceptada):**
1. **C** en superficie y pozo alto (N1-N3): enseña la lógica de hechizo-objeto y abre el acceso a los niveles bajos.
2. **B** en el pozo medio (N3-N4): maneja el agua y descubre la cámara N5.
3. **A** como llave final: la luz del Santuario (conducto de luz) cruza N5 y abre la puerta de la sala escondida (N6).
4. **D** como pistas opcionales: glifos de umbral repartidos que dan lore y pistas de la última puerta (sin ser obligatorios; cada glifo visto se anota en el Códice). **E** descartado.

Esta cadena aprovecha el ciclo día/noche, los hechizos del jugador y la arquitectura del pozo sin añadir sistemas nuevos pesados; el riesgo principal es el raycast de reflejos (A), con alternativa de reflejo en ángulos fijos (4 posiciones de espejo por pieza).

## Pendiente de sincronizar (otros documentos; no modificados aquí)

- **`docs/COMBATE.md` (disenador-combate):** ficha del **jefe de la sala escondida** (usar §3b: arena de Ø 40 m, 6 pilares, fases con brasero); **enemigos de la arena** y de duelos con NPCs; **rondas, rangos y recompensas** por rango (propuesta §3c); **ficha de los conjuros del archivo** en §2 (§3d): si el atril concede la receta sin lanzarla antes (§2.7), Planeo frente a zonas de anulación (§2.10), esquirlas de Piedra de paso, y que el Arcano de Tiempo queda reservado.
- **`docs/GDD.md` (disenador-juego):** reglas de la **arena** (rondas, rangos, entrada, recompensas, XP); **recompensas de conjuros** en la biblioteca (decidido §3d: Arcano de Espacio garantizado; Llama sagrada, Aurora, Crepúsculo, Planeo y Ancla opcionales; Arcano de Tiempo reservado a la trama final con solo pistas de lore en el Códice); **consecuencias de la elección matar/perdonar** en la arena (propuesta [SUPUESTO] §3c: perdonar da reputación en la Casa de la Arena y el rival puede volver más fuerte; matar da botín extra, el rival desaparece del cartel y baja la reputación con algunos NPCs); **Archivista anciano** como NPC guía del secreto con frases por etapas (§3b), sin cerrar D-7; secreto del subsuelo y archivo como parte de la historia; servicios de la ciudad (herrero, posada, alquimista, establo, escriba, gremio, cambista); puntos de descanso (plaza, posada, desfiladero, pozo N3); mercader del desierto; límite de NPCs activos para ciudad (≤ 24 propuesto); cadena de puzles decidida C → B → A (+ D opcional con entradas de Códice, §10) como parte del camino al subsuelo; decisión del NPC recurrente (D-7).
- **`docs/GUIA_VISUAL.md`:** colores nuevos (#d9c29a, #9a5f3c, #7a8a6a, #8a6a4c, #e6d3a3, #9fb8d9); LOD0 extendido a 90 m para piezas monumentales; presupuesto de multitud en impostores y de instancias (sala del jefe y biblioteca).
- **`docs/ARQUITECTURA.md` (+ ADR):** sala del jefe y biblioteca como **instancia aparte (decidido por el usuario)** con pantalla de carga al cruzar el pasaje N6 (guardado de estado de puzles y reaparición fuera de la sala), el bloque de 6 × 5 celdas más 7, estado persistente de puzles y raycast de espejos.
- **`docs/GUIA_UI.md` (interfaz-ui):** inscripción de la arena, tablón de rangos y encargos, aviso **Perdonar / Matar**, reputación en la Casa de la Arena, entradas de Códice de glifos, de las frases del Archivista y de la Tabla de las Horas, y la presentación de las páginas de conjuro.
- **Audio:** eco y viento de pistas ambientales, ambiente de arena y plaza, reverberación de la biblioteca.
- **`estado/feature_list.json` (planificador):** features de ciudad (proxy), arena, subsuelo/jefe, biblioteca y cadena de puzles, tras elegir el usuario.
