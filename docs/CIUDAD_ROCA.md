# Ciudad de la Roca: diseño arquitectónico

Autor: director-arte. Estado: borrador v1 para validar con el usuario. Marcado [SUPUESTO] = decisión mía, revisable.
Fuentes: `docs/GDD.md` (zona 3, este/sureste, §10 lore), `docs/GUIA_VISUAL.md` (paleta, presupuestos), `contexto/CONTEXTO_PROYECTO.md`.
Decisión del usuario: estilo **tallado en la roca** (fachadas esculpidas en arenisca, escaleras y puentes en el cañón, ciudad antigua del desierto).
Diseño propio: evoca la sensación de las ciudades rupestres en general, sin copiar ningún monumento real ni nada de otros juegos.

## 1. Concepto y fantasía del lugar

El jugador cruza un desierto de dunas ocres y de pronto el suelo se abre: una grieta estrecha entre muros de roca de 50 m. Tras un kilómetro de sombra fresca y luz rebotada, el cañón se ensancha y aparece, tallada en la propia pared, una fachada de columnas y frontones de varios pisos, dorada por el sol bajo. La sensación es de **asombro sereno**: una ciudad que no se construyó sobre la montaña sino que se *extrajo* de ella. Es un lugar luminoso y habitable (toldos, humo de cocina, ropa tendida, aves en los nichos), no una ruina lúgubre.

La escala es el recurso emocional: el personaje es diminuto frente a órdenes de columnas de 18 m; las escaleras y los puentes dan verticalidad y vértigo controlado. Se llega por un solo camino (el desfiladero), y la ciudad se revela por capas: plaza, terrazas, fachada mayor, y por último el pozo, un vacío circular que desciende hacia la penumbra.

Relación con el lore (GDD §10): la ciudad aloja el **archivo de la Orden de los Tejedores** en el gran pozo central [SUPUESTO del GDD]. La arquitectura sugiere que la Orden fue su patrona y la ciudad creció a su alrededor, pero **no se responde** qué causó la Pausa ni dónde fue la Orden (preguntas aplazadas a fase 2). La ciudad está viva pero menguada (comerciantes, copistas, guardas), con signos de que el archivo fue saqueado o sellado a medias. Los glifos son sutiles y ambiguos.

## 2. Emplazamiento y escala

| Elemento | Dimensión [SUPUESTO] | Notas |
|---|---|---|
| Macizo de arenisca | ≈ 768 × 640 m en planta, 90-110 m sobre el suelo del cañón | Meseta superior plana con miradores y cisternas expuestas |
| Cañón de acceso (desfiladero) | ≈ 900 m de largo, 10-30 m de ancho, muros de 40-60 m, giros suaves | Entrada desde el desierto, orientación oeste a este |
| Cañón principal / plaza | ≈ 120 × 160 m de suelo, muros de 60-80 m | Teatro tallado en un lado |
| Fachada mayor (templo) | 48 m de ancho × 38 m de alto, profundidad interior ≈ 30 m | Único edificio de máximo detalle |
| Terrazas de viviendas | 4 niveles de 6 m de alto, banda de 200 m de largo | Unidas por escaleras talladas |
| Gran pozo central | 60 m de diámetro, 80-90 m de profundidad, 5 niveles descendentes | En la meseta; se baja por rampa helicoidal y galerías |
| Puentes | 4-6, luces de 12-35 m, altura 20-45 m sobre el suelo | Piedra de un arco; uno colgante de madera y cuerda |

**Encaje en celdas de 128 m (streaming):** el conjunto ocupa un bloque alineado de **6 × 5 celdas (768 × 640 m)** más **7 celdas lineales** para el desfiladero y la aproximación [SUPUESTO]. Cada celda guarda sus datos de geometría y props; el macizo es un conjunto de piezas por celda con una malla lejana única (§7). El pozo interior cae en 1-2 celdas centrales y se trata como interior contiguo (sin carga separada); si el presupuesto no alcanza, se acepta una instancia como el dungeon (decisión del arquitecto). La zona es de dificultad 3 (GDD §5): grupos mixtos de 4-5 enemigos en el desfiladero y el pozo; la plaza y las terrazas son zona tranquila.

## 3. Recorrido y distritos

```
 DESIERTO (oeste)
      |
 [1] DESFILADERO  ~900 m, sombra, giros, cuellos de botella (combate)
      |
 [2] PLAZA Y TEATRO  --- fuente/cisterna, mercado bajo toldos, descanso
      |         \
      |          [3] TERRAZAS DE VIVIENDAS (4 niveles, escaleras talladas)
      |                \--- puentes ---\
 [4] TEMPLO / FACHADA MAYOR  <----------/ (vista dominante de la plaza)
      |
 [5] ESCALERA MONUMENTAL -> MESETA SUPERIOR (cisternas, miradores)
      |
 [6] GRAN POZO CENTRAL  (rampa helicoidal)
      N1 galería de copistas -> N2 tumbas/nichos -> N3 sala de mapas
      -> N4 cisterna profunda -> N5 cámara del archivo (fondo, luz rúnica)
```

| Zona | Función de juego | Lugares de interés / descanso | NPCs [SUPUESTO] |
|---|---|---|---|
| 1 Desfiladero | Aproximación, combate, revelado | Nicho-altar de viaje (descanso), grafitis de caravanas, vistazo previo de la fachada | Ninguno; patrulla de enemigos |
| 2 Plaza y teatro | Hub social, primer asombro | Teatro tallado (aforo ~600), fuente, mercado bajo toldos, **punto de descanso** (hoguera junto al teatro) | Mercader del desierto, guarda de la puerta |
| 3 Terrazas | Exploración vertical, cofres, misiones secundarias | Casas rupestres visitables, tendederos, huertos en macetas, mirador al atardecer | Residentes ambientales (≤ 6 activos) |
| 4 Templo | Fachada mayor, hito | Portal central, sala hipóstila interior, relieves | Sacerdote-custodio (misión/lore) |
| 5 Puentes y escaleras | Conexión y vértigo | Vistas, atajos, un puente que se activa/desbloquea | Ninguno |
| 6 Pozo y archivo | Dungeon-like descendente, clímax | 1 punto de descanso por 2 niveles, estantes, mapas, glifos que reaccionan a la runa | Archivista (anciano) en N1; texto de lore en el fondo |

Puntos de descanso: 3 [SUPUESTO] (plaza, terrazas, pozo N3), dentro del rango de 20-25 del mundo del GDD. NPCs alineados con el límite del GDD (≤ 12 activos por asentamiento). Un erudito recurrente (D-7 del GDD) queda sin decidir: se deja un hueco en el Archivista.

## 4. Lenguaje arquitectónico

**Regla maestra:** *todo lo monumental está tallado (sustractivo); lo cotidiano y reversible está construido (aditivo).* Se lee en el material: lo tallado tiene la veta y erosión de la roca madre; lo construido es madera, adobe revocado y sillares sueltos.

| Aspecto | Regla |
|---|---|
| Proporciones | Módulo base 1 m; altura de piso 6 m (vivienda) / 9 m (monumental); columna = 9 diámetros de alto; fachada mayor 4 × 3 módulos de 12 m |
| Órdenes de columnas (propios) | **Orden Telar:** fuste liso con cinco acanaladuras y capitel de haces entrelazados (alude a «tejer»). **Orden Veta:** fuste ancho y corto con anillos que imitan estratos, capitel de volutas planas. Ninguno copia un orden clásico ni un monumento concreto |
| Frontones | Triangulares bajos (pendiente ≈ 12°) con tímpano profundo (≥ 1,2 m) para sombras duras; frontones partidos en niveles altos |
| Cornisas | Escalonadas en 3-5 gradas, voladizo de 0,6-1,2 m: generan sombra marcada y rompen el contorno |
| Nichos | Arcos de medio punto o rectos de 1,2 × 2,4 m, en filas; sirven de altares, tumbas o ventanas ciegas; reducen triángulos si son huecos planos con normal map |
| Portales | Puerta monumental 4 × 9 m con jambas trapezoidales (estrechas arriba); puertas de vivienda 1,2 × 2,2 m |
| Ventanas | Huecos pequeños, a veces con celosía de piedra; la luz interior cálida de noche las hace legibles a distancia |
| Relieves y glifos de la Orden | Sutiles: bandas bajas de 5-8 cm con runas inspiradas en los glifos del juego en dinteles, cornisas y umbrales. Nunca decoración gigante. Algunos reaccionan (brillo tenue) al hechizo de runas |
| Estratos y erosión | Bandas horizontales de 0,3-3 m con alternancia de color; zonas de desprendimiento, cavernas pequeñas, arena acumulada en cornisas, manchas oscuras de agua bajo canalones, grietas verticales |
| Silueta | Fachadas de líneas verticales fuertes, escaleras diagonales, puentes horizontales: lectura clara de rutas para el jugador |

## 5. Tipologías de edificio

| Tipología | Descripción | Tallado/construido | Tamaño típico [SUPUESTO] |
|---|---|---|---|
| Fachada monumental | Columnas, frontón, portal y nichos esculpidos | 100 % tallado, con puertas de madera y bronce | 48 × 38 m (mayor); 18-24 m (secundarias) |
| Vivienda rupestre | Puerta y 1-2 ventanas en pared, interior excavado | Tallado; añadidos de madera, toldo, tendedero | 6 × 6 m de fachada, interior 5 × 8 m |
| Tumba / nicho | Hileras de nichos funerarios; cámaras pequeñas con relieve | Tallado | 1,2 × 2,4 m el nicho; cámara 4 × 4 m |
| Cisterna | Depósito excavado con canales y escalones de acceso | Tallado, revoque impermeable pálido | 10 × 15 × 6 m; superficie de agua con shader simple |
| Mercado bajo toldos | Puestos adosados a la pared bajo telas tensadas | Construido (madera, tela) sobre suelo tallado | Franja de 40 × 12 m |
| Puente de piedra | Arco único con parapeto bajo | Construido en sillar (mismo tono, menos erosión) o tallado si deja un puente natural | Luz 12-35 m, ancho 4 m |
| Escaleras talladas | Tramos de 12-30 peldaños con descansos y muretes | Tallado; peldaños desgastados al centro | Peldaño 0,22 × 0,32 m, ancho 2-4 m |
| Galerías del pozo | Pasarelas y rampa helicoidal con balaustres y nichos de estantes | Tallado; pasarelas añadidas de madera | Rampa ancho 4 m; galerías 5 m de alto |

## 6. Materiales y color

Paleta base (GUIA_VISUAL): arenisca cálida **#c79a62** (luz), **#a87444** (media), **#6e5438** (sombra y estrato oscuro). Colores añadidos [SUPUESTO] para variedad controlada: revoque pálido #d9c29a, estrato rojizo #9a5f3c, óxido de bronce #7a8a6a (verdín discreto).

| Material | Uso | Notas PBR |
|---|---|---|
| Arenisca por estratos | Toda la roca tallada | Triplanar de roca de la biblioteca + máscara de estratos por altura mundial; rugosidad alta (0,85-0,95), detail normal granular; capa de arena en superficies horizontales (por normal Y) |
| Revoque | Interior de viviendas, fachadas añadidas | Blanco-crema, desconchado por albedo/máscara; rugosidad 0,8 |
| Madera | Puertas, vigas, pasarelas, andamios | Reutiliza la madera de la biblioteca; tono más seco y gris |
| Telas | Toldos, tendederos | Colores saturados controlados (ocre, rojo teja, azul añil, verde oliva); translucidez falsa por emisivo bajo; movimiento por vértice con viento |
| Metal envejecido | Herrajes, faroles, bronce de puertas | Metalizado medio, verdín en recesos |

**Luz y atmósfera:**
- **Día:** sol alto ilumina solo la parte alta del cañón; el fondo recibe luz rebotada cálida (aporta ambiente con probe/hemisférica, sin GI real). Sombras en cascada con casi todo el contraste en cornisas.
- **Atardecer:** el momento estrella: la fachada mayor, orientada al oeste, se enciende en #c79a62 saturado; bruma dorada por altura.
- **Noche:** luna fría en lo alto, el cañón en azul oscuro legible; antorchas y faroles en nichos y portales (sprites emisivos + bloom, ≤ 4 luces dinámicas visibles, según GUIA_VISUAL); ventanas con luz cálida.
- **Polvo y viento:** partículas de polvo en haces de luz (billboard barato), arena arrastrada por el suelo del desfiladero, telas y ropa moviéndose; bruma exponencial por altura enlazada al cielo.

## 7. Kit modular para producción

Grid: **1 m** de snap fino, **3 m** de snap de módulo (muros), **6 m** de piso; rotación de 90° (y 45° en escaleras). Todas las piezas con origen en la base centrada y +Y arriba (GUIA_VISUAL). Texturas: **un atlas de kit de 2K (Bajo-Medio) / 4K (Alto-Ultra)**, KTX2, más el triplanar de roca compartido; 1-2 materiales de kit en total.

| Pieza | Tamaño (m) | Variantes | Tris LOD0 / LOD1 / LOD2 | Textura |
|---|---|---|---|---|
| Panel de pared tallada lisa (acantilado) | 12 × 12 × 3 | 4 | 1 500 / 600 / 200 | Triplanar roca |
| Módulo de fachada (pared + cornisa) | 12 × 9 × 2 | 3 | 2 500 / 1 000 / 300 | Atlas kit |
| Columna Telar / Veta (con capitel) | Ø 1,6 × 14 | 2 + 2 | 2 000 / 800 / 250 | Atlas kit |
| Frontón con tímpano | 12 × 3 × 1,5 | 3 | 1 800 / 700 / 250 | Atlas kit |
| Cornisa escalonada | 3 × 1,2 × 1,2 | 3 | 700 / 300 / 100 | Atlas kit |
| Nicho (simple / doble / arco) | 1,2-2,4 × 2,4 | 3 | 500 / 250 / 80 | Atlas kit |
| Portal monumental | 4 × 9 × 2 | 2 | 3 000 / 1 200 / 400 | Atlas kit |
| Puerta/ventana de vivienda | 1,2 × 2,2 | 5 | 500 / 250 / 80 | Atlas kit |
| Tramo de escalera | 3 × 3 × 6 | 3 | 1 000 / 400 / 150 | Atlas kit |
| Arco de puente (luz 12 / 24 / 35) | 4 × variable | 3 | 2 500 / 1 000 / 300 | Atlas kit |
| Barandilla / balaustre | 3 × 1 | 2 | 600 / 250 / 80 | Atlas kit |
| Pieza del pozo (anillo de pared con nichos) | 60 Ø × 6 (en 8 segmentos) | 2 | 3 000 / 1 200 / 400 cada segmento | Atlas kit |
| Roca de transición/derrumbe | 3-8 | 6 | 1 000-3 000 / 600 / 200 | Triplanar roca (instancing) |
| Toldo y tendedero | 3-6 | 6 (tinte) | 500 / 250 / 80 | Atlas props |
| Props (jarras, barriles, faroles, estantes) | 0,3-2 | 15+ | 400-2 000 / 50 % / — | Atlas de props compartido |

**Presupuesto (conjunto visible):** ≤ **40 draw calls** (GUIA_VISUAL): ≈ 8 por material/atlas de kit con instancing por tipo de pieza, ≈ 6 para roca triplanar, ≈ 6 para props y telas, ≈ 8 para el pozo y puentes, margen ≈ 10 para partículas/agua/cielo. Tris orientativos en pantalla: ≤ 1,2 M en Ultra, ≤ 400 k en Bajo [SUPUESTO]. Para llegar a la cifra se fusionan los paneles en `BatchedMesh` por celda.

**LOD e impostor del conjunto lejano:**
- LOD0 ≤ 60 m, LOD1 hasta 120 m, LOD2 hasta 250 m (pautas de GUIA_VISUAL; piezas monumentales pueden extender LOD0 a 90 m [SUPUESTO]).
- **Conjunto lejano (> 250 m):** **1 malla simplificada del macizo ≈ 12-20 k tris** con textura de 2K baked (albedo + normal), más impostor de 8 vistas para la fachada mayor. Fundido con *dithering* y bruma; sin pop.
- Interiores (pozo, templo) solo se cargan al acercarse; oclusión por distancia y por celda.

## 8. Proxy del MVP vs. arte final (fase 3)

| Aspecto | MVP (proxy) | Fase 3 (arte final) |
|---|---|---|
| Macizo y cañón | Cajas y cuñas extruidas con material triplanar de roca (arenisca) y máscara de estratos; geometría de celda por datos | Mallas esculpidas con el kit modular completo, erosión y variantes |
| Fachada mayor | Una pared plana con columnas cilíndricas, frontón triangular y portal rectangular; sin detalle fino | Fachada con órdenes Telar/Veta, nichos, relieves y glifos |
| Escaleras y puentes | Rampas escalonadas simples y arcos de caja, colisión correcta y recorrido jugable | Kit tallado con desgaste, balaustres, madera añadida |
| Pozo y archivo | Cilindro con rampa helicoidal y 5 niveles señalados, luz rúnica en el fondo | Segmentos con nichos y estantes, props de archivo, glifos reactivos |
| Vegetación, NPCs, props | Pocos props instanciados, 2-3 NPCs genéricos | Mercado completo, telas animadas, ambiente de vida |
| Lejano | Silueta única baked sencilla | Malla + impostor de 8 vistas |
| Coste | ≤ 12 draw calls, ≤ 100 k tris | ≤ 40 draw calls, presupuesto de §7 |

Prioridad del MVP: que el **recorrido y la escala** funcionen (desfiladero, plaza, pozo con 5 niveles) con luz y atmósfera correctas; el detalle va a fase 3.

## 9. Referencias de sensación y preguntas abiertas

**Referencias de sensación (genéricas):**
- Ciudades y necrópolis rupestres de arenisca en general: fachadas monumentales emergiendo del acantilado, luz rebotada en cañones estrechos.
- Atardeceres sobre roca rojiza, haces de polvo, sombras duras bajo cornisas.
- Mercados de zoco con toldos de colores en un entorno monocromático.
- Pozos y cisternas excavadas, escaleras que descienden hacia la penumbra fresca.

**Preguntas abiertas para el usuario (máx. 5):**
1. ¿La ciudad está **habitada y viva** (comercio, NPCs, mercader) o **casi abandonada** con ocupantes hostiles? Se asumió viva y menguada.
2. ¿El **pozo con el archivo** es un dungeon instanciado (carga aparte, como el castillo) o un interior continuo del mundo?
3. ¿Quieres que haya **un segundo mercader** o servicios (herrero, posada/descanso con cama) en la ciudad, o solo puntos de descanso?
4. ¿La **fachada mayor** es un templo de la Orden, un tribunal o una biblioteca? Cambia los relieves y el tono (se asumió templo-archivo).
5. ¿Hay un **puzle ambiental** (por ejemplo, un puente que se activa con runas) o la ciudad es solo exploración y combate?

## Pendiente de sincronizar (otros documentos; no modificados aquí)

- `docs/GDD.md` §5/§9: añadir los 3 puntos de descanso, el mercader del desierto y la zona del pozo si se aceptan.
- `docs/GUIA_VISUAL.md`: añadir los colores nuevos #d9c29a, #9a5f3c, #7a8a6a a la paleta de la Ciudad de la Roca y las distancias de LOD extendidas para piezas monumentales.
- `docs/ARQUITECTURA.md`: decidir si el pozo es interior continuo o instancia, y registrar el bloque de 6 × 5 celdas más 7 del desfiladero.
- `estado/feature_list.json`: si se planifica el proxy de la ciudad, crear la feature (hito fase 1-2) y su verificación.
