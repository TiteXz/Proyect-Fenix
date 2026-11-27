# Guía visual

Documento del rol **director-arte**. Estilo: **fantasía realista luminosa** (referencias de sensación, no de copia: tono Ghost of Tsushima / Dragon's Dogma 2),
materiales PBR, ciclo día/noche e iluminación cinematográfica. Nunca low-poly ni cartoon en el arte final. Ver `CLAUDE.md` y `contexto/CONTEXTO_PROYECTO.md`.

Estado (2026-11-26): completa para el MVP. Lo marcado **[SUPUESTO]** lo fija esta guía por defecto; el usuario puede corregirlo. Los presupuestos globales salen de `contexto/CONTEXTO_PROYECTO.md` (no se duplican valores distintos: si difieren, manda el contexto y luego `docs/ARQUITECTURA.md`).
Principio: el realismo sale de **iluminación, materiales, atmósfera y postproceso**, no de más polígonos. Referencia visual de maqueta (r147/GLSL, no es el juego): `prototipo/exterior/` (Aldea del Vado) y `prototipo/vfx/vfx.js` (hechizos).

## Paleta

Natural y saturada, nunca apagada ni sucia. Hex orientativos [SUPUESTO], para albedo medio de materiales y para UI; el tinte final lo da la luz.

| Uso | Hex | Nota |
|---|---|---|
| Acento del jugador (escudo, capa, UI) | #e0a82e (oro cálido) + #1f4e79 (azul heráldico) | Silueta legible sobre los 4 biomas |
| Sol de día / atardecer / luna | #fff1d6 / #ffb25a / #9bb8ff | Color de la luz direccional, ver Iluminación |
| Cielo cénit día / horizonte | #3f86d6 / #cfe6f7 | Lo calcula el cielo físico; solo referencia |
| Bosque | #2f7a2c, #5da03a (hierba), #6b4a2b (tronco), #e8c84a (luz filtrada) | Verdes intensos |
| Costa / islas | #2bb5b0 (agua), #f0e2c0 (arena), #e8e4da (roca clara) | Turquesa y arena |
| Desierto | #d9a441, #b8692e (ocre), #efd9a6 | Dorados y ocres; sombras azul-violeta suaves |
| Monte nevado | #f4f8fb, #b9cde0 (sombra nieve), #7f8a96 (roca) | Blanco limpio, nunca #fff puro |
| Ciudad de la Roca | #c79a62, #a87444, #6e5438 | Arenisca cálida (luz / media / sombra y estrato oscuro) |
| Ciudad de la Roca (añadidos [SUPUESTO]) | #d9c29a (revoque pálido), #9a5f3c (estrato rojizo), #7a8a6a (verdín de bronce), #8a6a4c (roca profunda del subsuelo, más fría) | Fachadas encaladas, vetas de estrato, bronces y remates, subsuelo N6-N8; detalle en `docs/CIUDAD_ROCA.md` §6 |
| Biblioteca de la Roca (luz de cristal) | #e6d3a3 (cálida), #9fb8d9 (fría) | Luz difusa de cristales en la instancia; atriles con halo rúnico más cálido |
| Metal enemigo no-muerto | #6f6a60 (óxido deslucido), #8d9a8a (verdín) | Contraste con el acero brillante del jugador |
| Dungeon (más sombrío por contraste) | #3a4150, #6a5a7a, antorcha #ff9a3c | El único espacio permitido en baja saturación |
| Peligro / imparable / vida | #d63a2e | Chevron rojo, barra de vida |
| Elementos | Ver tabla «Colores por elemento» (emisivos de la lámina de glifos); fuego naranja, hielo cian, luz dorada | Mandan esos hex |

Reglas: albedo no puro (negro ≥ #1a1a1a, blanco ≤ #f0f0f0); contraste de silueta jugador/enemigo/terreno comprobable en escala de grises; los enemigos no usan el acento del jugador.

## Tipografía (compartida con la UI)

Una fuente **display serif de inspiración rúnica/caligráfica** para títulos, nombres de hechizo y «?» de runa no aprendida, y una **sans humanista legible** para HUD, subtítulos y menús [SUPUESTO]. Familias concretas, tamaños y escala: las fija `docs/GUIA_UI.md`; aquí solo se exige: licencia OFL/CC0 (alojadas en `juego/public/assets/fuentes/`, no CDN, con entrada en `CREDITOS.md`), `font-display: swap`, subconjunto latino con acentos y ñ, y **subtítulos del Guardián ≥ 24 px** con fondo semitransparente (contraste ≥ 4.5:1 sobre día y noche).

## Iluminación

Sol/luna como **única luz direccional con sombra** (límite duro del contexto), cielo analítico y bruma ligera.

- **Ciclo** ≈ 24 min reales/día [SUPUESTO de contexto]. Franjas (hora del juego): amanecer 05-07, día 07-17, atardecer 17-19, noche 19-05. Transiciones suaves por curvas (no saltos).
- **Cielo físico:** scattering analítico (Preetham/Hosek o nodo TSL propio), sol y luna como discos; estrellas y Vía Láctea de noche (textura pequeña); nubes: capa barata (textura ruido en TSL, sin volumétrico) [SUPUESTO].
- **Sol:** elevación según la hora; temperatura ≈ 5800 K a mediodía, ≈ 3000 K al ponerse, color en la Paleta. **Luna:** direccional débil azulada, noches **claras** (el jugador debe ver a ≥ 25 m sin antorcha).
- **Sombras:** `CSMShadowNode`: 3 cascadas en Alto/Ultra, 2 en Medio, 1 en Bajo; mapas 2048/1536/1024; solo el jugador, enemigos cercanos y estructuras proyectan en cascadas lejanas; vegetación lejana no proyecta. Sombras de contacto/AO bakeadas en terreno cuando sea posible.
- **IBL/entorno:** cubemap derivado del cielo actualizado de forma **escalonada** (cada ~30-60 s de juego o al cambiar de franja, repartido en varios frames), no por frame.
- **Luces puntuales:** antorchas/faroles de noche; ≤ 4 dinámicas visibles; el resto son sprites emisivos + bloom (falso glow), priorizadas por distancia. Parpadeo por ruido con semilla.
- **Bruma:** exponencial por altura, color enlazado al cielo (no gris plano); densidad por bioma/zona fija; oculta el cambio de LOD. Niebla volumétrica solo en Alto/Ultra y limitada (dungeon, amanecer en valle).
- **Dungeon:** ambiente más frío y sombrío; luz direccional tenue o ausente, antorchas y runas como protagonistas; sigue siendo legible (nunca negro cerrado).
- **Escena final (Guardián):** luz de atardecer fija dorada con rayos; ver «Escena final».
- Coste: ver Postproceso; la iluminación se mide con `renderer.info` y el presupuesto de contexto.

## Materiales PBR

Biblioteca compartida en `juego/src/render/` (un material por *tipo*, no por objeto; instancias con tinte por atributo/uniform). Texturas KTX2: albedo (sRGB, BC7/ASTC), normal (BC5/ASTC) y **ORM** empaquetado (AO-R-M).

| Material | Rugosidad | Notas |
|---|---|---|
| Piedra / roca | 0,75-0,95 | **Triplanar** para roca y acantilados; detail normal; capa de musgo/humedad por pendiente |
| Madera | 0,6-0,85 | Veta visible; desgaste en cantos |
| Cuero | 0,45-0,65 | Costuras, brillo en uso |
| Acero | 0,25-0,45, metal 1 | Jugador: pulido con arañazos; enemigo: óxido/deslucido |
| Tela | 0,8-0,95 | Normal fino; sheen opcional en Alto/Ultra |
| Piel | 0,5-0,6 | Subsurface falso (tinte cálido en bordes) |
| Suelo (splat 4 capas máx.) | Varía | Hierba, tierra, arena, roca/nieve; blend por altura/pendiente |
| Follaje | 0,6-0,8 | Alfa MASK (corte 0,45-0,5), doble cara, translucidez falsa, viento por vértice |

Capas comunes (nodo TSL reutilizable): **suciedad** (AO/cavidad), **humedad** (oscurece albedo, baja rugosidad; mayor de noche/junto al agua), **detail normal** a corta distancia, **nieve/arena** por orientación. Shaders propios solo en TSL. Texturas 1K por defecto, 2K en Alto/Ultra para protagonistas (jugador, Guardián, caballo), 4K solo piezas protagonistas.

## Postproceso y presets de calidad

Pipeline de nodos de Three.js (WebGPU; mismo grafo TSL en el respaldo WebGL 2). Orden: escena HDR → GTAO → niebla/bruma → bloom → TRAA/SMAA → tonemapping → gradación → viñeta.

| Efecto | Bajo | Medio | Alto | Ultra |
|---|---|---|---|---|
| Tonemapping | AgX (por defecto) o ACES, uno solo [SUPUESTO] | = | = | = |
| Antialiasing | SMAA | SMAA | TRAA | TRAA + nitidez |
| AO | Apagado (AO bakeado) | GTAO medio | GTAO | GTAO alto |
| Bloom | Apagado o mip-chain mínimo | 5 mips | 6 mips | 6 mips |
| Sombras (cascadas / mapa) | 1 / 1024 | 2 / 1536 | 3 / 2048 | 3 / 2048 + distancia mayor |
| Resolución de render | 0,75× adaptativa | 0,9-1× | 1× | 1× |
| Bruma volumétrica | No (exp. simple) | No | Limitada | Limitada+ |
| Gradación / viñeta | LUT 3D barata, viñeta muy ligera | = | = | = |
| Texturas | 1K | 1K-2K | 2K | 2K (4K protagonistas) |
| Vegetación / densidad | 50 % | 75 % | 100 % | 125 % |
| IBL | Estática por franja | Escalonada lenta | Escalonada | Escalonada rápida |

- Coste esperado de postproceso [SUPUESTO, a medir]: Bajo ≤ 1,5 ms, Medio ≤ 3 ms, Alto ≤ 5 ms, Ultra ≤ 7 ms en la GPU de referencia de cada preset.
- **Escalado dinámico de resolución** para mantener FPS (límite inferior 0,6×); el postproceso baja por orden: bruma, GTAO, bloom.
- **Profundidad de campo solo** en menús, grimorio y escena final.
- **Respaldo WebGL 2:** mismo grafo TSL; si falta una característica (GTAO de calidad, TRAA), cae a SSAO/SMAA y se avisa en ajustes. Cada preset define el respaldo; WebGL 2 arranca por defecto en Medio como máximo [SUPUESTO].
- **Accesibilidad:** opción de reducir bloom/flashes y de desactivar viñeta y movimiento de cámara (coherente con movimiento reducido de `GUIA_UI.md`).

## Cámara

Tercera persona sobre el hombro derecho [SUPUESTO]. FOV 60° a pie (65° a caballo, 55° en escena final); distancia 3,2 m a pie, 4,5 m a caballo; colisión de cámara contra terreno/muros con suavizado. Sin orbitar mientras se mantiene un botón de combate (stick virtual con ratón, ver contexto); fijar enemigo desplaza el encuadre sin marear. **Hit-stop 60-90 ms** y sacudida corta con intensidad escalada (desactivable). Cinemática final: cámaras de raíl con DOF. Sin cámara lenta general.

## Lenguaje de formas y feedback visual

Proporciones humanas realistas (≈ 7,5 cabezas). **Jugador:** silueta cargada arriba (capa y escudo con acento de paleta), tonos claros con acento oro/azul. **Enemigos:** silueta propia por tipo: esqueleto guerrero (delgado, hueso marfil sucio, escudo deslucido), goblin arquero (bajo y encorvado, verde oliva), cultista mago (túnica con capucha, **luz de runa** violeta como foco), caballero no-muerto (el más grande, armadura ennegrecida con brillo frío en los ojos; en fase 2 aura rojiza). **NPCs:** ropa de colores cálidos naturales, sin acento oro/azul; leen como civiles (sin armas visibles).

### Feedback de combate
- Impacto cuerpo a cuerpo: chispas o polvo según material, **flash blanco de 1-2 frames** en el golpeado, retroceso y hit-stop. Bloqueo/parada perfecta: ver abajo.
- Daño recibido por el jugador: viñeta roja breve y desaturación leve (respetando accesibilidad). Muerte enemiga: disolución a polvo/huesos, monedas con destello dorado.
- **Outlines:** solo contorno suave (post por profundidad/ID) para el enemigo fijado y objetos interactuables (F); no para todos los enemigos. Opcional en ajustes.

### VFX de hechizos (MVP: Bola de fuego, Lanza de escarcha, Destello sagrado)
- Base: `prototipo/vfx/vfx.js` (partículas con tamaño/alfa por partícula, humo fBm, círculos de runas, proyectiles con estela, impactos). **Reescribir en TSL/GPU** (no copiar GLSL r147); billboards y *instancing*, máx. **1 draw call por tipo de efecto**.
- Cada hechizo: carga (círculo de runas en el suelo/mano) → proyectil con estela y luz → impacto. Color = emisivo del elemento (tabla de colores). Legibles a simple vista sin saturar: bloom contenido, alfa moderado, duración corta.
- Fuego: núcleo blanco-amarillo, borde #ff7a2a, humo; luz puntual breve (cuenta en el límite de 4). Hielo: cristales instanciados, vaho cian #8fdcff, congelación con material escarchado sobre el enemigo. Luz: haz dorado #ffd27a, anillo de curación en el jugador.
- Presupuesto: ≤ 2 000 partículas activas en Alto (1 000 Bajo), ≤ 1 luz dinámica por hechizo con vida < 0,4 s; las partículas usan *pooling*, sin asignar por frame. Respetar movimiento reducido (sin parpadeo).

### NPCs: rutina día/noche y reacción al golpe
Mercader de la Aldea del Vado, anciano y aldeanos (MVP, pocos). Cuerpo y animaciones: reutilizar el esqueleto del caballero con **variantes de ropa y proporciones** [SUPUESTO] (hasta la fase 3 de NPCs modulares).
- **Rutina por hora** (calculada al despertar la celda; ver contexto): día = trabajo/pasear/puesto del mercader abierto; atardecer = recogen; **noche = dentro de casa o junto a hoguera** (desaparecen de la calle: se ocultan al cruzar la puerta, sin teletransporte visible); amanecer = vuelven. Animaciones mínimas: `reposo`, `andar`, `trabajar` (mercader/aldeano, 1-2 bucles), `sentarse` (anciano), `hablar_gesto`.
- **Reacción al ser golpeado** (no mueren): `golpeado` (reusar), `quejarse` (manos arriba), `huir` (correr a su casa) o `cubrirse`; sin sangre ni daño visible; sin efecto de muerte. Mercader golpeado: cierra el puesto (toldo/cartel de «cerrado» visible) y no vende **hasta el amanecer**; el estado visual es legible a distancia.
- **Reconocimiento (D-8/D-9):** solo mercader y anciano, una vez: bocadillo DOM sobre la cabeza (UI en `GUIA_UI.md`), el NPC se gira al jugador y hace un gesto breve (`sorpresa`). Sin cinemática ni cámara.
- Presupuesto NPC: ≤ 8 000 tris LOD0, 1 material (atlas de ropa) + 1 de piel, LOD1 ≈ 3 000, LOD2 ≈ 1 000; ≤ 12 NPCs activos en una aldea [SUPUESTO]. Cada variante = tinte/atlas, no malla nueva.

### Escena final: Guardián liberado
- Al derrotar al jefe: el caballero no-muerto **se disuelve en luz cálida** (partículas doradas/blancas, armadura que pierde su ennegrecimiento y se vuelve acero claro); se muestra su forma «recordada», sin rostro nítido [SUPUESTO, deja abierto GDD §10.9].
- **Voz con subtítulos:** unas líneas; subtítulos DOM abajo (≥ 24 px, fondo semitransparente, nombre «El Guardián» en color propio #ffd27a). Sin sincronía labial (no habla en cámara). Activos siempre en esta escena aunque estén apagados en ajustes [SUPUESTO].
- **Cámara sobre el castillo:** raíl lento de aproximación/elevación desde el jugador al castillo, **luz de atardecer dorada**, DOF activo, bruma ligera, aves como detalle; el castillo en **estado posterior** (sin brumas oscuras ni resplandor rojizo; versión LOD alta cargada solo para esta escena). Duración ≈ 20-30 s, saltable con Esc [SUPUESTO]. Al terminar, vuelve el control con el mundo abierto.
- Debe lucir bien con el castillo en el preset Bajo: marca de plano medio/largo, no depende de detalle fino.

### Escudo y silueta del jugador (EP / EE)
- Con escudo la silueta debe seguir leyéndose: el escudo es la mayor masa nueva del jugador, así que lleva un **acento de paleta** propio (borde o emblema en el color de acento del jugador, [SUPUESTO] hex al definir la Paleta) y no se confunde con el escudo del esqueleto guerrero (enemigo: metal deslucido, óxido, sin emblema luminoso).
- Estilo: **fantasía realista luminosa**, no oscura ni cartoon. Escudo heráldico redondo u oval [SUPUESTO] de madera reforzada con cuero y borde/umbo de acero, desgaste creíble (arañazos, pintura gastada), sin picos ni calaveras. Diámetro ≈ 0,6 m [SUPUESTO]; debe cubrir los 4 sectores de guardia sin atravesar el cuerpo.
- Colgado a la espalda/cadera con EP (visible, mismo modelo, sin duplicar geometría) y en el antebrazo izquierdo con EE; el gesto de colgar/descolgar dura 0,6 s [SUPUESTO] (COMBATE).

### Poses legibles de guardia y dirección (sin HUD)
- Guardia en bucle, 4 direcciones + neutra: EP con hoja cruzada, EE con escudo alzado. Arriba = arma/escudo sobre la cabeza; abajo = bajo y adelantado; izq./der. = cruzado a ese lado. Las cuatro poses deben distinguirse en silueta a distancia de cámara de juego (comprobar en vista de silueta plana).
- Feedback: chispa metálica en bloqueo normal; destello más grande y frío + onda corta en parada perfecta; golpe de escudo del contraataque con onda de empuje. El escudo nunca tapa la vista del jugador (cámara por encima del hombro) [SUPUESTO].

### Telegrafiado de la dirección enemiga (pauta para `interfaz-ui` y `programador-motor`)
- **Animación primero:** la anticipación lleva el arma claramente al lado de origen (≥ 0,55 s; jefe fase 2 ≥ 0,5 s); el modelado exagera la pose de anticipación (rotación de torso y cadera) para que se lea en silueta.
- **Chevrón de ataque entrante:** en el lado de entrada, alrededor del enemigo fijado (o en el borde de pantalla si está fuera de cuadro). Forma distinta por dirección (no solo color): punta hacia el centro, con muescas distintas arriba / abajo / izq. / der. [SUPUESTO]. Blanco cálido con borde oscuro fino para contraste sobre día y noche; opacidad tenue al aparecer y **destello** al abrirse la ventana (200 ms EE / 250 ms EP). El destello respeta la opción de movimiento reducido (sin parpadeo, solo subida de brillo).
- **Imparable (jefe):** chevrón **rojo** con forma propia (doble/relleno, no hueco) [SUPUESTO]; además brillo rojizo en el arma.
- **Arco de escudo (guardia enemiga):** arco fijo y tenue en el lado protegido, forma y color distintos del chevrón (azul-acero frío, trazo fino), el chevrón siempre tiene prioridad visual. Se desliza al cambiar de lado (0,30 s esqueleto).
- **Finta del jefe (fase 2):** destello frío en filo y yelmo en el giro, chevrón del lado falso **hueco** que se desliza y se rellena al fijarse la dirección real (≥ 0,40 s antes del activo).
- Accesibilidad: indicador ampliado opcional; nunca depender solo del color (forma + posición + animación).

## Presupuesto por asset y por preset

Globales por preset (FPS, draw calls, triángulos, memoria GPU, tamaño y carga): **tabla de `contexto/CONTEXTO_PROYECTO.md` «Rendimiento»**, no se repite; `docs/ARQUITECTURA.md` los fija en un único fichero de config. Los valores por asset de abajo son [SUPUESTO] y se ajustan al medir con `renderer.info`.

### Presupuesto por tipo de asset [SUPUESTO]
| Asset | Tris LOD0 / LOD1 / LOD2 | Texturas (Bajo-Medio / Alto-Ultra) | Draw calls | Peso en disco |
|---|---|---|---|---|
| Jugador (cuerpo+armadura+yelmo+capa) | 40 k / 15 k / 5 k | 1K-2K / 2K-4K, 3 sets (cuerpo, armadura, accesorios) | ≤ 5 | ≤ 6 MB |
| Enemigo común (esqueleto, goblin, cultista) | 15 k / 6 k / 2 k | 1K / 2K, 1-2 sets | ≤ 3 | ≤ 2 MB |
| Jefe (caballero no-muerto) | 40 k / 15 k / 5 k | 2K / 4K | ≤ 5 | ≤ 5 MB |
| NPC | 8 k / 3 k / 1 k | atlas 1K / 2K | ≤ 2 | ≤ 1 MB |
| Caballo | 25 k / 10 k / 3 k | 1K-2K | ≤ 3 | ≤ 3 MB |
| Edificio de aldea (casa/granero) | 6 k / 2,5 k / 800 (+ impostor) | atlas de kit 2K compartido | 1-3 | ≤ 0,5 MB (geometría; atlas compartido aparte) |
| Castillo / Ciudad de la Roca (MVP) | por kit modular: pieza 500-3 000; conjunto lejano en 1 malla simplificada | atlas de kit 2K-4K | ≤ 40 (conjunto visible); instancias: sala del jefe ≤ 25, biblioteca ≤ 30 | arte final en fase 3; MVP proxy (desglose en `docs/CIUDAD_ROCA.md` §7) |
| Árbol | 5 k / 1,6 k / impostor (2 tris) | atlas de follaje 1K-2K | 1 por especie (instancing) | ≤ 0,3 MB |
| Roca / acantilado | 1-3 k / 600 / 200 | triplanar (set compartido) | 1 por set (instancing) | ≤ 0,2 MB |
| Prop (barril, cajón, farol) | 0,4-2 k / 50 % / — | atlas de props | instanciado | ≤ 0,1 MB |
| Arma pequeña (espada) | 6 k / 2,5 k / 800 | 1K-2K | 1 | ≤ 0,5 MB |
| Hierba / flores | tarjetas 12 tris / 4 tris | atlas | instanciado por celda | — |

Nota: la katana del prototipo ronda 42 k tris; **no cabe** en el presupuesto de arma y debe decimarse o sustituirse por una espada propia.

### LOD e impostores
- Cambio por distancia con **histéresis** y *dithering* de fundido (sin pop); distancias por preset (Bajo = 0,6× las de Ultra). LOD0 ≤ 30 m (props) / 60 m (enemigos, NPCs) [SUPUESTO]; LOD1 hasta 120 m; LOD2 hasta 250 m; **impostores** (octaedrales o 8 vistas, atlas pre-bakeado) para árboles y edificios sueltos de 250 m al horizonte; terreno lejano por clipmaps/quadtree con bruma.
- **Excepción monumental [SUPUESTO]:** piezas monumentales justificadas (fachada mayor, anfiteatro de la Ciudad de la Roca) pueden extender LOD0 a 90 m; no aplica a props ni a otros assets.
- **Multitud:** NPCs activos con modelo propio dentro del límite de la zona (aldea ≤ 12; Ciudad de la Roca ≤ 24); el resto (público, fondo de plaza) son instancias animadas de 3-4 variantes a ≈ 400-1 000 tris y, de lejos, impostores con los mismos materiales y escala.
- Vegetación y rocas con `InstancedMesh`/`BatchedMesh`; geometría de celda como datos, no mallas (ver contexto).
- En preset Bajo se salta LOD0 de props y se acorta el horizonte; los enemigos y el jugador mantienen su LOD1 mínimo.

### Escudo del jugador [SUPUESTO]
| Concepto | Presupuesto |
|---|---|
| Triángulos | LOD0 ≈ 3 000, LOD1 ≈ 1 200, LOD2 ≈ 400 (sin LOD en preset Bajo: se usa LOD1) |
| Material | 1 material PBR compartido de la biblioteca (`juego/src/render/`), texturas 1024² (Bajo/Medio) / 2048² (Alto/Ultra): albedo, normal, ORM |
| Draw calls | 1 (malla única, sin submallas); el mismo modelo sirve para colgado (EP) y en mano (EE) |
| Peso | ≤ 0,5 MB en disco tras meshopt + KTX2 |
| Esqueleto | Rígido, sin huesos propios: se parenta al hueso de antebrazo izquierdo (EE) o al de espalda/cadera (EP), con un socket de ajuste por configuración |
| Variante enemiga | El escudo del esqueleto guerrero reutiliza el material y se reestiliza por textura/tinte, no por geometría nueva |

### Animaciones del jugador
- Un solo esqueleto humanoide, sin duplicar el modelo. Presupuesto de clips [SUPUESTO]: ≤ 40 clips por set, muestreo a 30 fps, curvas simplificadas (gltf-transform `resample`/`prune`), **≤ 1,5 MB** por set tras compresión; solo huesos de animación del jugador (≈ 65 [SUPUESTO]).

## Pipeline de assets (Blender, glTF/GLB, gltf-transform, KTX2)

### Cadena general
Blender (o procedural en script) → GLB (+ texturas PBR) → `gltf-transform` (`dedup`, `prune`, `weld`, `simplify` para LOD, **meshopt** para geometría/animación; **Draco** solo si el modelo es estático y mucho más pequeño que con meshopt [SUPUESTO]; texturas a **KTX2/Basis**: ETC1S para albedo secundario y UASTC/ASTC para normal y ORM) → `juego/public/assets/<categoría>/` → entrada en `CREDITOS.md`. Los scripts de generación viven en `juego/tools/` (ya existen `blender/` y `assets/`). El cargador usa `MeshoptDecoder` y `KTX2Loader` (transcoders en Worker, ver ADR del arquitecto). Los assets ya existentes (`caballero_soldado.glb`, `caballo_pinto.glb`, `katana.glb`) usan WebP y sin meshopt: **recomprimir con este pipeline** antes de la versión final.
Unidades: metros; origen en los pies (personajes/props) o centro de la base (edificios); +Y arriba; escala 1; normales y tangentes MikkTSpace.

### Nomenclatura de ficheros [SUPUESTO]
- Carpetas: `personajes/`, `enemigos/`, `npcs/`, `animales/`, `armas/`, `props/`, `edificios/`, `vegetacion/`, `terreno/`, `vfx/`, `fuentes/`, `ui/`, `audio/`, `cielo/`.
- Ficheros en `snake_case` minúscula sin acentos: `<categoria>_<nombre>[_<variante>][_lod<N>].glb` (p. ej. `edificio_casa_piedra_lod1.glb`, `npc_mercader.glb`, `arbol_jacaranda_lod0.glb`). Texturas: `<material>_<albedo|normal|orm>.ktx2` (alias en proyecto: `_Diffuse/_nor_gl/_arm` del prototipo → renombrar). Impostores: `<nombre>_imp.ktx2`. Animaciones: ver «Sets de animaciones».
- Nodos: `socket_*` para anclajes, `col_*` para colisión, `lod0/1/2` hijos nombrados; clips en `snake_case` español (`ataque_ligero_izq`).

### Licencias y créditos
- Solo **CC0** o creación propia por defecto; **CC-BY** admitido si se atribuye. Todo asset lleva su entrada en `juego/public/assets/CREDITOS.md` (asset, fichero, origen/URL, autor, licencia, modificaciones); lo verifica `scripts/verificar.sh`.
- **Pantalla de créditos obligatoria en el juego** (menú principal), generada desde un `creditos.json` derivado de `CREDITOS.md` (el arquitecto lo automatiza) con título, autor, licencia y enlace de cada asset CC-BY (y CC0 como cortesía). Los edificios Sketchfab CC-BY del prototipo exigen atribución antes de publicar.
- **Bloqueo:** `caballero_soldado.glb` y `caballo_pinto.glb` vienen de zips del usuario con **licencia por confirmar**; no publicar con ellos hasta confirmarlo. Fallback: `caballero.glb`/`caballo.glb`, que son CC0/propios.
- Prohibido: assets extraídos de otros juegos, o NC/ND. Packs low-poly solo como placeholder de gameplay, nunca como arte final.

### Requisitos ya definidos para el escudo y los sets de animación (C-18)

### Modelo de escudo (para `artista-3d`)
1. Blender: modelado high-poly + bake a LOD0/1/2 con la cuenta de triángulos de «Presupuesto». Unidades en metros, origen en el centro del asa/agarre, eje +Y arriba. Texeles consistentes con el resto del equipo.
2. Materiales: usar la biblioteca PBR compartida (madera, cuero, acero) con ORM empaquetado; sin materiales sueltos por objeto.
3. Exportar GLB → `gltf-transform` (meshopt + KTX2) → `juego/public/assets/`. Nombre propuesto: `escudo_jugador.glb`; registrar licencia/origen en `CREDITOS.md` (CC0 o creación procedural/propia).
4. Empties/sockets nombrados: `socket_escudo_mano` y `socket_escudo_espalda`.

### Sets de animaciones del jugador (EP y EE, referencia C-18)
- **Esqueleto único:** los dos sets (`EP` solo espada; `EE` espada + escudo) se **retargetean al mismo esqueleto** del jugador (mismos nombres de huesos y misma pose T/A). Se entregan como GLB de animaciones por set (`jugador_anim_EP.glb`, `jugador_anim_EE.glb`) o como un solo GLB con prefijo `EP_` / `EE_` en cada clip [SUPUESTO: lo decide el arquitecto, ver ADR]. El motor elige el set por el identificador de configuración (`'espada' | 'espadaEscudo'`).
- **Lista mínima por set** (nombre de clip → direcciones; duraciones y fases en `docs/COMBATE.md` «Animaciones mínimas», no se repiten aquí):
  - `ataque_ligero` × 4 (izq., der., arriba, abajo)
  - `guardia` en bucle × 5 (4 direcciones + neutra), con transición de entrada
  - `parada_perfecta` × 4
  - `bloqueo_impacto` × 4
  - `defensa_proyectil` × 1 (EP: desvío de flecha con la hoja; EE: bloqueo con el escudo)
  - `contraataque` × 1 (EE incluye golpe de escudo + tajo)
  - `habilidad` × 1 (EP: Estocada de quiebre; EE: Embestida)
  - `remate_humanoide` y `remate_jefe` (sincronizados con las animaciones de víctima «recibir remate» de cada enemigo, una variante por set)
  - `guardia_rota` y `tambaleo`
  - Solo EP/EE respectivamente: `colgar_escudo` / `descolgar_escudo` (0,6 s).
- **Requisitos técnicos:** las fases (anticipación/activo/recuperación) se marcan con eventos o marcadores en el clip para que el motor las lea (frames exactos coherentes con COMBATE); movimiento de raíz sin deriva y con raíz alineable para remates (encaje ≤ 0,15 s); las 4 direcciones deben diferenciarse en silueta; los clips de enemigo (esqueleto, jefe, cultista, goblin) se retargetean igual a su esqueleto y se entregan con las dos variantes de «recibir remate».
- **Verificación visual:** revisión de silueta plana en las 4 direcciones y de que el escudo no atraviesa el cuerpo ni la espada en guardia ni en ataque (visualizar con la maya de colisión del escudo en Blender).

## Lista de assets del MVP (estado a 2026-11-26)

Estados: **existe** (en `juego/public/assets/`), **candidato** (en `prototipo/`, reutilizable tras pasar por el pipeline y confirmar licencia), **pendiente** (hay que conseguirlo/generarlo). Responsable: `artista-3d`. Prioridad P1 = bloquea gameplay, P2 = bioma/ambiente, P3 = pulido.

| Asset | Estado | Notas / prioridad |
|---|---|---|
| Jugador (caballero) | existe `caballero.glb` (CC0/propio); `caballero_soldado.glb` licencia por confirmar | P1: elegir y recomprimir; sets EP/EE de animación pendientes |
| Animaciones EP/EE (lista de «Sets de animaciones») | pendiente (base: reposo, guardia, tajo, golpeado, morir) | P1 |
| Espada (la katana existe, 42 k tris) | existe, **fuera de presupuesto** | P1: decimar o hacer espada europea propia |
| Escudo del jugador y variante enemiga | pendiente | P1 |
| Caballo | existe `caballo.glb` (propio) y `caballo_pinto.glb` (licencia por confirmar) | P1 |
| Esqueleto guerrero, goblin arquero, cultista mago | pendiente (+ clips y «recibir remate») | P1 |
| Caballero no-muerto (jefe, 2 fases) | pendiente | P1 |
| NPCs: mercader, anciano, aldeanos (2-3 variantes) | pendiente (base: esqueleto del caballero + ropa) | P2; animaciones `trabajar`, `sentarse`, `quejarse`, `huir` |
| Puesto del mercader (toldo abierto/cerrado) | pendiente | P2 |
| Edificios de la aldea (casa entramado/piedra/rústica/tudor, granero, pozo, torre, carro) | candidato: `prototipo/exterior/assets/edificios/` (Sketchfab CC-BY, atribución obligatoria) | P2: decimar a presupuesto, atlas de kit, LOD+impostor |
| Terreno, texturas de suelo (camino, hierba, roca, barro, muro, madera, revoco, teja) | candidato: Poly Haven CC0 del prototipo (WebP) | P2: pasar a KTX2 ORM; faltan arena, nieve y roca desértica |
| Vegetación: árboles (isla, jacaranda), arbustos, helecho, hierba, flores, troncos, rocas | candidato: `prototipo/exterior/assets/` (CC0 Poly Haven + atlas propios) | P2; faltan **pinos/robles de bosque, palmeras de costa, cactus, árboles de nieve** y vegetación de oasis |
| Props (barril, cajón, cubo, farol) | candidato (CC0) | P2; faltan antorcha de pared/soporte, cofre, hoguera, estatua sin rostro del Guardián |
| Cielo | candidato: `cielo_kloofendal_1k.hdr` (solo referencia/IBL de prueba) | P2: cielo físico procedural en TSL; estrellas/luna |
| Agua (plano con shader) | pendiente | P2: shader TSL propio, sin texturas pesadas |
| Castillo en ruinas (exterior lejano + estado posterior) | pendiente | P1 para el dungeon; versión «liberada» para escena final |
| Dungeon «Patio del castillo en ruinas» (kit: muros, arcos, suelo, puerta, antorchas, pilares) | pendiente | P1 |
| Ciudad de la Roca (maravilla) | pendiente; kit modular + proxy en MVP, arte final en fase 3; detalle y presupuestos en `docs/CIUDAD_ROCA.md` (§6-§7) | P3 |
| Fuente rúnica, runas, círculos de conjuro | procedural en código (glifos) | P1; sin descarga |
| VFX de hechizos (atlas de partículas: humo, chispas, cristales, haz) | candidato: lógica en `prototipo/vfx/vfx.js` | P1: reescribir en TSL; texturas procedurales |
| Fuentes (display + sans) | pendiente | P1 (UI); licencia OFL |
| Iconos de runas, hechizos y HUD | pendiente (`interfaz-ui`) | Fuera del alcance de arte 3D |
| Audio | fuera de esta guía (agente `audio`) | — |

Mínimo para empezar P1 sin bloqueo: jugador con EP/EE, espada y escudo, esqueleto + goblin + cultista + jefe, caballo, kit del dungeon, terreno y vegetación de bosque, cielo procedural.

---

## Glifos rúnicos procedurales

Decisión del usuario: los glifos de las runas son **procedurales**, no dibujados uno a uno. Salen de una gramática de trazos sobre una rejilla, con un rasgo fijo por familia y una variación por semilla.
Estado: **aprobado por el usuario** (glifos y colores de la lámina). Implementación de referencia: lámina HTML `runas_bronsil.html` (objetos `E`, `F`, `C` y función `glyph`). Esta sección transcribe esa gramática; si difieren, manda esta sección.

### Rejilla y sistema de coordenadas

- Rejilla de **3 columnas** (x = -1, 0, 1) por **4 filas** (y = 0, 1, 2, 3). **y = 0 es la cabeza y y = 3 el pie** (y crece hacia abajo, como en canvas). Se admiten valores intermedios (p. ej. 2.1, 0.75) y salidas puntuales de la rejilla (el gancho de Disparador llega a y = 3.35).
- Tallo vertical central: `STEM = línea (0,0)-(0,3)`.
- Escala para un glifo de lado `size`: unidad horizontal `u = 0.2·size`, unidad vertical `rh = 0.24·size`. El glifo mide por tanto `0.4·size` de ancho y `0.72·size` de alto, y se centra verticalmente desplazando `-1.5·rh`.
- Primitivas: `l` polilínea (lista de pares x,y), `c` círculo (cx, cy, radio en unidades `u`), `q` curva cuadrática (inicio, control, fin), `d` punto (cx, cy).
- Constantes: `CAP = l(-0.7,0)-(0.7,0)` (barra de cabeza); `BODY = l(0,1.6)-(0.8,0.95)` (diagonal de muestra para las clases).

### Capa 1: Clase (qué tipo de runa es)

| Clase | Marca | Primitivas (además de `BODY` en la lámina de clases) |
|---|---|---|
| Forma | barra en la cabeza | `CAP` + `STEM` |
| Elemento | tallo limpio | `STEM` |
| Modificador | punto al pie | tallo corto `l(0,0)-(0,2.7)` + `d(0,3.2)` |
| Control | tallo doble | `l(-0.14,0)-(-0.14,3)` + `l(0.14,0)-(0.14,3)` |
| Disparador | gancho al pie | `STEM` + `l(0,3)-(0.55,3.35)` |

La lámina de clases dibuja cada marca con la diagonal `BODY` solo como ejemplo. Los elementos son runas con tallo limpio; las formas, con barra.

### Capa 2: Rasgo fijo por familia (lo único que hay que memorizar)

Elementos (id = semilla canónica). `libres` son los huecos declarados donde la variación puede poner marcas.

| Familia | id | Rasgo | Primitivas | Huecos libres |
|---|---|---|---|---|
| Fuego | 101 | dos diagonales ascendentes escalonadas | `STEM`, `l(0,2.1)-(-0.95,1.05)`, `l(0,1.2)-(0.95,0.2)` | (0.85,2.5) (-0.85,2.7) (-0.8,0.3) |
| Hielo | 102 | simétrico: barra cruzada y raíces gemelas | `STEM`, `l(-1,1)-(1,1)`, `l(0,2)-(-0.8,2.85)`, `l(0,2)-(0.8,2.85)` | (-0.75,0.25) (0.75,0.25) (0.7,1.75) |
| Luz | 103 | sol en la cabeza y rayos que no tocan el tallo | `l(0,0.75)-(0,3)`, `c(0,0.38,r0.36)`, `l(-0.75,1.45)-(-0.3,1.45)`, `l(0.3,1.45)-(0.75,1.45)` | (0.8,2.4) (-0.8,2.4) (0.75,0.2) |
| Rayo | 104 | zigzag, sin tallo recto (`noStem`) | `l(0,0)-(0.8,1)-(-0.8,2)-(0,3)` | (-0.85,0.45) (0.85,2.5) (0.8,2.0) |
| Tierra | 105 | basa ancha con patas | `STEM`, `l(-1,2.35)-(-1,3)-(1,3)-(1,2.35)` | (-0.8,0.7) (0.8,0.7) (0.75,1.6) |
| Sombra | 106 | ganchos que caen | `l(0,0)-(0,2.35)-(-0.7,3)`, `l(0,0.8)-(0.9,0.8)-(0.9,1.85)` | (-0.85,1.1) (0.8,2.75) (-0.8,0.3) |
| Aire | 107 | **única familia con curvas**: dos ráfagas | `STEM`, `q(0,0.9; 1.05,0.55; 0.85,1.5)`, `q(0,1.95; 1.05,1.6; 0.85,2.55)` | (-0.8,1.2) (-0.8,2.4) (-0.75,0.3) |

Regla de diseño: ninguna otra familia usa curvas ni círculos de rasgo (el círculo del Sol de Luz es la excepción acotada a la cabeza y no se confunde con el círculo de Área, que lleva barra de cabeza y va en el tallo medio).

Formas (todas con `CAP` + rasgo):

| Forma | id | Rasgo | Primitivas | Huecos libres |
|---|---|---|---|---|
| Proyectil | 201 | punta de flecha | `CAP`, `STEM`, `l(-0.9,2)-(0,1)-(0.9,2)` | (-0.8,0.7) (0.8,0.7) (0.8,2.7) |
| Cono | 202 | abanico | `CAP`, `l(0,0)-(0,1.2)`, `l(-0.9,3)-(0,1.2)-(0.9,3)` | (-0.8,0.7) (0.8,0.7) (0,2.6) |
| Área | 203 | círculo | `CAP`, `STEM`, `c(0,2,r0.72)` | (-0.8,0.7) (0.8,0.7) (-0.9,3) |
| Muro | 204 | dos hiladas | `CAP`, `STEM`, `l(-1,1.2)-(1,1.2)`, `l(-1,2.2)-(1,2.2)` | (-0.75,0.6) (0.75,0.6) (0.75,2.8) |
| Zona | 205 | cuenco | `CAP`, `STEM`, `l(-0.9,2.15)-(-0.9,3)-(0.9,3)-(0.9,2.15)` | (-0.8,0.7) (0.8,0.7) (0.75,1.5) |
| Yo | 206 | rombo en el pecho | `CAP`, `STEM`, `l(0,1.1)-(0.5,1.65)-(0,2.2)-(-0.5,1.65)-(0,1.1)` | (-0.8,0.7) (0.8,0.7) (0.8,2.7) |

Raíces de nombre de hechizo por elemento (de la lámina): Fuego Ash-/-is-, Hielo Ysk-/-ys-, Luz Ilen-/-el-, Rayo Tar-/-ar-, Tierra Bron-/-od-, Sombra Vesh-/-um-, Aire Sil-/-av-.

### Capa 3: Variación por semilla (nunca tapa el rasgo)

Algoritmo exacto de `glyph` (orden de consumo del RNG relevante para el determinismo):

1. `R = mulberry32(semilla)`. Temblor `j = 0.022` celdas en el glifo canónico, `j = 0.075` en variantes.
2. **Solo en variantes** (y si la definición declara huecos libres), en este orden:
   1. Elegir un hueco `s` de la lista; `kind = R()`. Si `kind < 0.5`: un **punto** en `s`; si no, una **muesca**: línea horizontal de 0.4 celdas que parte de `s` hacia el centro (dx = -0.4 si x > 0, +0.4 si x <= 0).
   2. Si la familia no es `noStem` y `R() < 0.5`: **serifa al pie**, `l(-0.22,3)-(0.22,3)`.
   3. Con probabilidad 0.35 (y más de un hueco): un segundo **punto** en otro hueco distinto.
3. Se calcula la geometría **una sola vez**: cada punto de cada primitiva recibe `x + (R()-0.5)·2j`, `y + (R()-0.5)·2j`, y esa geometría se reutiliza en las pasadas de halo y núcleo (el RNG solo se consume ahí).
4. Los huecos libres se declaran por familia precisamente para que las marcas no crucen el rasgo. Una familia nueva debe declarar los suyos.

El glifo canónico **no lleva marcas**, solo el temblor mínimo; las variantes añaden marcas y más temblor.

### Semillas

- **Canónico:** semilla = id de la runa (elementos 101-107, formas 201-206; marcas de clase 300 + índice de clase). Estable para siempre; es el que se ve en el HUD y en el libro de runas.
- **Variante:** otra semilla. Solo rellena las **bandas decorativas** de los círculos de conjuro y cambia con cada hechizo según `semillaHechizo`. Valores de la lámina: tabla de variantes `id·97 + i·7919`; banda de círculo `id·31 + k·104729` (k = índice del glifo en la banda). Fórmula definitiva por fijar (ver preguntas abiertas).
- RNG: mulberry32 sobre `seed >>> 0`. Nunca `Math.random`.

### Render

- **Trazo:** extremos y uniones redondeados. Grosor `lw = max(1.6 px, 0.062·size)` (~6 %). Puntos con radio `0.75·` del grosor de la pasada.
- **Tema claro (libro/UI):** tinta, color oscuro del elemento (`ink`). Formas y clases en el color de texto (`--fg`).
- **Oscuro y en el juego:** trazo emisivo con halo en dos pasadas: halo (grosor `2.6·lw`, alpha 0.22, blur `0.16·size`) y núcleo (grosor `lw`, alpha 1, blur `0.05·size`). Color del elemento = emisivo de la tabla de colores de abajo (el de la lámina). Las formas usan el color del hechizo o neutro.
- **Runa no aprendida:** silueta **punteada** (`setLineDash [0.9·lw, 1.9·lw]`), gris (`--muted`), alpha 0.75, sin halo, con un «?» (fuente display, 600, 22 px) sobre el hombro derecho del glifo. Los separadores entre runas de una inscripción son rombos pequeños (alpha 0.7).
- **Círculo de conjuro (referencia):** tres anillos concéntricos (0.47 / 0.355 / 0.2 del ancho, 2 / 1.5 / 1.2 px), hexagrama inscrito en el segundo anillo, banda de 20 glifos variantes de la familia en el radio 0.413 con rombos entre ellos, runas del hechizo a 0.27 del radio y la runa canónica del elemento en el centro. Glifos de la banda orientados hacia fuera (`rot = ángulo + π/2`).

Colores por elemento (hex):

| Elemento | Tinta (claro) | Emisivo lámina | `KINDS` (juego) |
|---|---|---|---|
| Fuego | #b4430d | #ff7a2a | #ff6a1a |
| Hielo | #1f6f96 | #8fdcff | #8fdcff (alias `escarcha`) |
| Luz | #9a6a00 | #ffd27a | #ffd27a |
| Rayo | #5a45b8 | #b9a8ff | #b9a8ff |
| Tierra | #7a5426 | #c99a5a | #b0884e |
| Sombra | #5b2f93 | #a874ea | #8a4fd0 |
| Aire | #2f7a68 | #bff0e0 | #cfeee2 |

Los glifos están **aprobados por el usuario** tal como figuran en la lámina. Mandan los colores de la lámina (tinta y emisivo), no los de `KINDS`. La columna `KINDS` es solo el estado actual de la maqueta y debe ajustarse (ver Pendiente de definir).

### Reglas de legibilidad

- **Tamaño mínimo en el HUD: 24 px de lado (`size`)**, es decir, glifo de ~17 px de alto y ~10 px de ancho. Por debajo, se muestra el icono del elemento en vez del glifo. En el libro, de 64 px (tabla) a 110 px (ficha).
- Grosor relativo ~6 % de `size`, con suelo de **1.6 px** (a 24 px sale ~1.6 px). No bajar de ahí ni en bandas decorativas: las bandas se hacen más grandes (≥ 0.085·ancho del círculo), no más finas.
- Temblor limitado a 0.075 celdas: la familia debe reconocerse. Las variantes decorativas no se usan para comunicar información al jugador.
- Contraste mínimo 4.5:1 de la tinta sobre el fondo de la hoja; en oscuro, el halo no sustituye al núcleo (el núcleo siempre alpha 1).
- Nunca depender solo del color: el rasgo de familia (forma) identifica la runa. Los glifos llevan `aria-label` («Glifo de Fuego»).

### Diferencias con el generador libre actual de la maqueta

`drawGlyph` en `prototipo/vfx/vfx.js` (líneas ~247-270) es el generador **libre**: tallo central más 1 a 3 ramas elegidas al azar (diagonal arriba/abajo, rama con gancho, chevron) en una rejilla 3x4 con filas repartidas en [-h/2, h/2], y un punto suelto con probabilidad 0.35. No tiene familias ni clases, y el glifo depende solo de la semilla de la banda, así que no es legible como lenguaje ni reproducible por runa. Comparte con la gramática nueva: rejilla 3x4, tallo central, marca de punto y uso de RNG con semilla. Se sustituye por el generador de esta sección. `glyphBand` (bandas con separador rombo y rotación radial) se conserva como idea.

### Implementación (nota para programadores)

- El generador debe ser **lógica pura y determinista**: `(definición, semilla, variante) -> lista de primitivas en coordenadas de rejilla`, sin tocar canvas, DOM ni Three.js. Sin `Math.random`, sin estado global. Testeable: mismo input produce misma salida; el canónico no tiene marcas; las marcas de una variante caen siempre en huecos libres declarados.
- **Una sola fuente** compartida por dos renderizadores: el canvas 2D del libro/HUD (DOM) y las **texturas de los círculos de conjuro** (canvas 2D a `CanvasTexture`/atlas en Three.js, con halo en el shader o con bloom). La geometría se cachea por (runa, semilla); las texturas de círculo se generan una vez por hechizo, no por frame.
- Ubicación sugerida: lógica en `juego/src/` (módulo sin dependencias de render) y rasterizado en `juego/src/render/`. La decisión final es del arquitecto.
- Presupuesto: las bandas de glifos se bakean en una textura por círculo (p. ej. 512 o 1024 px según preset); coste por hechizo = 1 textura y 1 draw call, a medir con `renderer.info`.

### Pendiente de definir

- **Ajustar `KINDS` en `prototipo/vfx/vfx.js`** para que coincida con los emisivos de la lámina: Fuego #ff7a2a (hoy #ff6a1a), Tierra #c99a5a (hoy #b0884e), Sombra #a874ea (hoy #8a4fd0), Aire #bff0e0 (hoy #cfeee2). Hielo, Luz y Rayo ya coinciden. Aún no editado.
- Glifos concretos de **Modificadores, Control y Disparadores**: hoy solo existe la marca de clase (punto al pie, tallo doble, gancho al pie). Falta su rasgo propio, igual que las familias de elemento.
- Glifos de las **18 runas del contenido A** (según el GDD/COMBATE), asignación de ids y huecos libres.

### Preguntas abiertas

1. ¿Fórmula definitiva de semilla de variante y de `semillaHechizo`? Debe ser entera, estable entre sesiones y sin colisiones entre bandas.
2. ¿Los modificadores/control/disparadores se componen con el rasgo del elemento al que modifican (glifo compuesto) o son runas independientes con su marca de clase?
3. ¿Tamaño mínimo de 24 px en HUD válido con la tipografía y la escala de UI de `docs/GUIA_UI.md`? Revisar con interfaz-ui.
4. ¿Los glifos de Hielo y Luz se confunden a 24 px (barra cruzada frente a rayos cortos)? Probar en el navegador.
5. ¿El «?» de runa no aprendida y el punteado cumplen accesibilidad (daltonismo, movimiento reducido en el halo)?
