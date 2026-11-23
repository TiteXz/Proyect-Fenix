# Brief visual: Camino de entrada a la Aldea del Vado (escena exterior de la maqueta)

Rol director-arte. Destino: `prototipo/maqueta.src.html` (three.js r147, WebGLRenderer, composer HDR + UnrealBloomPass + ACES propio; hoy `toneMapping = NoToneMapping` y la gradación va en el composer). El patio del castillo NO se toca: la escena nueva es un `THREE.Group` aparte (`escenaVado`) que se activa con `?escena=vado` y se libera con `dispose()`.
Referencia del usuario: solo nivel de detalle y estilo; no se copia contenido de ningún juego. Estilo: fantasía realista luminosa (CLAUDE.md). Nunca low-poly ni cartoon.
Nota: `docs/GUIA_VISUAL.md` aún no tiene Paleta/Iluminación/Materiales (PENDIENTE); lo marcado [SUPUESTO] debe pasar allí cuando se apruebe. Los slugs de Poly Haven/ambientCG deben verificarse al descargar (cambian); si uno no existe, sustituir por el equivalente de la misma categoría.

## 1. Composición (≈ 120 x 120 m, bioma bosque, tarde de verano)
- Terreno: malla 128x128 segmentos (≈ 32 k tris) con heightmap procedural (fBm, semilla fija), pendiente media 6 %, y una loma al fondo (norte) de +14 m con talud de roca (pendiente > 55°).
- Camino de tierra: spline Catmull-Rom de 7 puntos, ancho 3,2 m (±0,4 de ruido). Entra por el sur (0,+55), sube en S suave (curva a la izquierda hacia z=+15, contracurva a la derecha hacia z=-15) y remata en la puerta de la aldea sobre la loma (0,-45). Pendiente máxima 12 %. Se pinta en una máscara (splat map 1024², R = camino, G = roca/talud, B = barro de bordes).
- Muros de piedra seca: bajos (0,9 a 1,2 m, grosor 0,5 m), a ambos lados del camino con separación 1,6 m del borde, discontinuos (huecos y tramos caídos; 70 % de longitud cubierta), con musgo en la cara norte y la coronación. Siguen el terreno (muestreo de altura cada 0,5 m).
- Loma y aldea: en la cima 5 edificios (2 casas de entramado, 1 casa de piedra con tejado a cuatro aguas, 1 almacén, 1 torre de piedra de 11 m con tejado cónico), tejados empinados (45-55°), humo fino de 2 chimeneas. Talud de roca bajo la cima con 6-8 rocas grandes y escalones de roca.
- Vegetación: hierba alta densa en los lados del camino (zona 0-25 m del eje) con flores moradas y naranjas (parches de 2-5 m); arbustos; 18-25 árboles frondosos (3 especies) en 3 anillos: cercanos al camino (4), medios (10-12), fondo (6-8 como impostores).
- Props: 6-8 postes de madera con cuerda (vallado de 2 tramos), un carro roto o carretilla, 1 farol/cartel en la entrada. El caballero a caballo (GLB ya incrustado) en primer plano sobre el camino, orientado hacia la aldea.
- Cámara inicial: (-3,2 ; 1,7 ; +46) mirando a (2 ; 5 ; -30), FOV 42°, a la altura de un jinete; leve picado de 4°.
- 3 encuadres de referencia (para `prototipo/exterior/capturas/`, 1920x1080):
  - C1 «Entrada»: la de arriba. Camino en curva en el tercio inferior, caballero a la derecha, loma y torre en el tercio superior izquierdo.
  - C2 «Muro»: (+2,5 ; 0,9 ; +20) mirando a (-2 ; 0,8 ; +8), FOV 35°, plano medio del muro con musgo, hierba y flores en primer plano, desenfoque de profundidad ligero (opcional).
  - C3 «Aldea»: (0 ; 3 ; -10) mirando a (0 ; 12 ; -45), FOV 50°, contrapicado hacia el talud de roca, tejados y torre con perspectiva aérea y cielo.

## 2. Iluminación y atmósfera
- Sol de tarde: DirectionalLight, elevación 28°, azimut 235° (viene del suroeste, de izquierda-atrás respecto a C1 para modelar volúmenes y alargar sombras hacia el espectador-derecha). Color 0xffd9a8 (≈ 4500 K), intensidad 3,2 en lineal (ajustar para que el albedo medio de la hierba quede en ~0,35 tras ACES). 
- Relleno: HemisphereLight cielo 0x9fc4ff / suelo 0x6b5a3a (verde-tierra), intensidad 0,55; mejor sustituir por `scene.environment` (PMREM del HDRI) con intensidad 0,6 para el reflejo en piedra y tejas.
- Cielo: HDRI CC0 de Poly Haven, 1k para fondo y PMREM (≈ 1,5 MB .hdr/.exr; convertir a RGBE/webp-equivalente no está soportado, usar `.hdr` 1k, ≤ 2 MB). Candidatos: «kloofendal_48d_partly_cloudy_puresky» (cielo azul con nubes claras, muy cercano a la referencia) o «kiara_1_dawn»/«syferfontein_6d_clear» como alternativa. Fallback sin descarga: `THREE.Sky` (examples/js/objects/Sky.js, r147) con turbidity 3, rayleigh 1,6, mieCoefficient 0,005, mieDirectionalG 0,8 y la posición del sol igual a la luz. Se usa el HDRI solo si cabe en presupuesto; el Sky analítico no pesa nada.
- Exposición: 0,85-1,0 antes de ACES; gradación suave cálida en luces (+3 % rojo) y verdes ligeramente desaturados en sombras; bloom de umbral alto (0,92, fuerza 0,25 en esta escena; la maqueta nocturna usa 0,6).
- Perspectiva aérea: `FogExp2` color 0xbcd0e6 (el del horizonte del cielo), densidad 0,0065 (a 120 m ≈ 54 % de niebla), más una capa de bruma baja en el valle (plano con gradiente, opacidad 0,18, solo bajo y = 1,5). Los impostores y la loma deben recibir niebla (fog: true); el cielo no.
- Sombras: mapa 4096 en Alto (2048 Medio, 1024 Bajo), cascada manual de 2 niveles (CSM no está en el core de r147; usar 2 DirectionalLight de sombra: cerca 40x40 m seguido a la cámara y lejos 140x140 m a 2048 con actualización cada 4 frames). `shadow.bias = -0.0004`, `normalBias = 0.04` (cerca) y 0,08 (lejos), `radius = 2`. Árboles y muros proyectan; hierba NO proyecta (recibe) para no pagar draw calls.
- Oclusión ambiental: SAOPass de r147 (`examples/js/postprocessing/SAOPass.js`), radio 0,6 m, intensidad 0,018, bias 0,5, blur 4 px, a mitad de resolución en Alto (omitido en Bajo/Medio). Alternativa barata y siempre activa: AO bakeado en el canal R de la textura ARM + decals de contacto (ver §4). 
- Contacto: cada muro lleva un decal de sombra/suciedad de 0,6 m en la base y la hierba oscurece su color en los vertices cercanos a muros/rocas (AO pintado en `instanceColor`).

## 3. Assets CC0 por prioridad (todo Poly Haven CC0, ambientCG CC0; registrar en `juego/public/assets/CREDITOS.md`)
Formato: tris por instancia LOD0/LOD1; texturas 1k salvo indicación; webp/KTX2 en la maqueta (webp incrustado en base64 como hoy). Todo con meshopt-compresión vía gltf-transform si se carga como GLB.
| P | Asset | Fuente (slug orientativo) | Uso | Tris | Textura |
|---|---|---|---|---|---|
| 1 | Camino de tierra con piedras | Poly Haven `dirt_path` / `brown_mud_leaves_01` / `gravel_embedded_concrete`, ambientCG `Ground054`, `Gravel022` | splat camino | plano | 2k diff+nor+ARM |
| 1 | Hierba (suelo) | Poly Haven `aerial_grass_rock`, `leafy_grass`; ambientCG `Grass004` | base del terreno, tiling + variación | plano | 2k |
| 1 | Roca del talud | Poly Haven `rock_face`, `rock_boulder_cracked`, `cliff_side` | triplanar en talud | plano | 2k |
| 1 | Piedra de muro | Poly Haven `rock_wall_08`, `stone_wall`, ambientCG `Rocks011` | muros de piedra seca | plano | 2k |
| 1 | Árboles frondosos | Poly Haven `tree_small_02`, `island_tree_01..03`, `pine_sapling_small` (verificar disponibles) | 3 especies, 4 variantes | LOD0 8 k / LOD1 2,5 k / impostor 2 quads | tronco 1k + hojas atlas 1k alfa |
| 1 | Arbustos | Poly Haven `shrub_01..04`, `fern_02`, `bush_01` | relleno del camino, bordes | 1,5 k / 400 | atlas 1k |
| 2 | Rocas sueltas | Poly Haven `rock_moss_set_01`, `rock_boulder_02`, `boulder_01` | piedras del camino y del talud | 1,2 k / 300 | 1k |
| 2 | Flores silvestres | Poly Haven `dandelion_01`, `celandine_01`, `fern_02`; las moradas/naranjas se hacen con quad cruzado y atlas propio | parches | 24 tris/mata | atlas 1k RGBA |
| 2 | Madera de entramado | Poly Haven `wood_planks`, `weathered_planks`, `wood_trunk_wall` | postes, vigas, puertas | plano | 1k |
| 2 | Revoco | Poly Haven `plaster_grey_02`, ambientCG `Plaster003` | muros entre vigas | plano | 1k |
| 2 | Teja | Poly Haven `roof_tiles_14`, `roof_tiles`, ambientCG `RoofingTiles` | tejados | plano | 2k |
| 3 | Postes, cuerda, carro, barril | Poly Haven `wooden_fence_01` (si existe), `wooden_crate_01`, `barrel_03`, `wooden_cart` (o primitivas) | props | 600-3 k | 1k |
| 3 | Nube/cúmulo, humo | sprites procedurales ya existentes en vfx.js | cielo / chimeneas | quad | 256 |
- Edificios: no hay kit modular medieval CC0 fiable en Poly Haven (hay `medieval_*` sueltos, pocos y sin entramado) ni en Kenney (low-poly, descartado por estilo); Quaternius «Medieval Village MegaKit» es CC0 pero de estilo estilizado: usar solo como referencia de proporciones. Decisión: construirlos con primitivas + PBR, módulos en JS:
  - Planta: caja con zócalo de piedra 0,8 m (textura de muro, triplanar), pared de revoco 2,6 m por planta.
  - Entramado: vigas como cajas 0,14x0,14 (textura madera, dirección de veta correcta, UV por metro) en cuadros de 1,2 m con arriostres diagonales; las vigas sobresalen 2 cm del revoco y el revoco lleva normal map y una textura de manchas de humedad; segundo piso volado 0,3 m con vigas de apoyo.
  - Tejado: prisma a dos aguas 48° con 3 filas de teja instanciadas en los bordes (alero doble, cumbrera con remate), el resto con normal map de teja 2k (y parallax/bump); aleros de 0,45 m. Lucernas y chimenea de piedra. Ventanas con marcos, postigos y cristal oscuro con envmap.
  - Contra el aspecto low-poly: biseles reales de 1-2 cm en vigas y esquinas, ruido de vértices ±1,5 cm en los aleros y zócalos, desviación de plomada ≤ 0,5°, diferentes tamaños por edificio y suciedad/humedad por máscara (vértices) en la base y bajo aleros.
  - Presupuesto: casa 6-9 k tris, torre 12 k, aldea completa ≤ 55 k tris, 6 materiales compartidos (madera, revoco, teja, piedra, hierro, cristal).

## 4. Técnicas de detalle (r147, WebGL2)
- Hierba: `InstancedMesh` de mechones (2 quads cruzados + 1 diagonal, 14 tris, atlas alfa con `alphaTest 0,45` y `alphaToCoverage` si hay MSAA) en 3 celdas de 20x20 m (chunking para frustum culling). Presupuesto: 120 k mechones visibles en Alto. Densidad por máscara: splat (camino = 0, borde = 0,25, prado = 1), menos cerca de muros (0,5 m de huelga), y ruido blue-noise (Poisson por rejilla con jitter, semilla fija).
- Viento en vertex shader (`onBeforeCompile` sobre MeshStandardMaterial para conservar PBR): desplazamiento X/Z = amp * (altura_uv)^2 * (sin(t*1,6 + dot(pos.xz, (0,13 ; 0,07)) * 1,4) + 0,35 sin(t*4,1 + pos.x*2,3)); amp 0,07 m; la base fija. Un uniform `uTime` global, sin asignaciones por frame. Los árboles usan el mismo shader con amp 0,03 y fase por instancia.
- Variación de color: `instanceColor` HSV ±6 % de matiz y ±12 % de brillo, más un tinte de gran escala (ruido 60 m) que mezcla verde-oliva y verde-amarillo, y degradado de base oscura (AO falso) a punta clara. Flores: 3 colores (morado 0x7a4fb5, naranja 0xe07a20, blanco 0xf4efe2) en parches con ruido.
- LOD: hierba 0-18 m mechón completo (14 tris), 18-45 m quad cruzado simple (4 tris), > 45 m solo el color del terreno con textura de hierba. Árboles: LOD0 < 25 m, LOD1 < 60 m, impostor > 60 m (2 quads cruzados con atlas pre-renderizado de 8 vistas 512²; se renderiza en el arranque). Hojas y hierba se desvanecen por dithering entre LOD para evitar saltos. `frustumCulled` real por chunk.
- Terreno: shader de mezcla con 4 capas (hierba, camino, roca triplanar, barro) por splat map, mezcla por altura: `mix` ponderado por el canal de altura de la textura (height blending) para que las piedras del camino asomen entre la hierba; ruido de 8 m para romper el tiling; el borde del camino lleva franja de transición de 0,6 m con hierba corta y tréboles.
- Decals de suciedad en muros: 1 plano con textura de suciedad/humedad (gradiente vertical, alfa) con `polygonOffset` o geometría inclinada; usa `DecalGeometry` (examples/js/geometries/DecalGeometry.js) solo al construir, fusionando todo en una malla por material. Alternativa más barata: color de vértice (suciedad en los 0,4 m inferiores) y musgo por normal Y > 0,6 en el shader del muro.
- Muros: piedra irregular con displacement de vértices ±3 cm y normal map; piedras de remate instanciadas (rocas pequeñas sobre la cima), hiedra y musgo como quads alfa en tramos.
- Detalles de vida: mariposas/polen (partículas), pájaros lejanos, polvo en el aire iluminado por el sol (nueva `Points`, 300), humo de chimeneas.

## 5. Presupuesto global (preset Alto, solo escena Vado; sin contar jugador/caballo ya existentes)
| Concepto | Objetivo | Máximo |
|---|---|---|
| Draw calls | ≈ 140 | 200 (incluye sombras: ≈ 60 más en 2ª pasada) |
| Triángulos en pantalla | ≈ 1,6 M | 2,0 M (hierba 1,0 M, árboles 0,3 M, aldea 55 k, terreno 32 k, resto 150 k) |
| Peso añadido a `maqueta.html` | ≈ +22 MB | +30 MB |
| Texturas (webp base64, 2k) | ≈ +14 MB | |
| Modelos (GLB meshopt) | ≈ +5 MB | |
| HDRI 1k | ≈ +1,5 MB (o 0 con Sky) | |
| Memoria GPU | ≤ 350 MB | |
| Objetivo de FPS | 60 en GPU integrada moderna a 1080p en Medio; 60 en GPU dedicada media en Alto | |
- Medio: sombras 2048, hierba 60 %, sin SAO, árboles LOD1 desde 40 m. Bajo: sombras 1024, hierba 25 %, sin viento en árboles, sin bruma. Ultra: sombras 4096 + 2ª cascada 4096, hierba 150 %.
- Medir con `renderer.info` (calls, triangles, geometries, textures) antes y después, y anotar el resultado en `prototipo/README.md` al integrar.

## 6. Criterios de aceptación visual (captura 1920x1080, estado `?test=1`, sin HUD)
1. C1: ningún píxel de suelo desnudo (sin textura de hierba) en el tercio inferior y los 8 m más cercanos a la cámara; la hierba cubre ≥ 90 % de las zonas no camino y la altura media es 35-60 cm con mechones sueltos y flores visibles (≥ 15 flores nítidas).
2. El camino se lee como una curva continua que guía a la aldea, con piedras sueltas que asoman, bordes que se mezclan con la hierba sin línea recta de corte y sin repetición de textura evidente (tiling visible = fallo).
3. Sombras de contacto: cada muro tiene franja oscura y suciedad en la base (≥ 20 cm), y proyecta una sombra de dirección coherente con el sol; sin «peter-panning» (separación) ni acné (bandas) en muros ni terreno.
4. Perspectiva aérea: el horizonte y la loma son un 30-50 % más pálidos y azulados que el primer plano (medir luminancia/saturación por bandas), con contraste de silueta de la torre contra el cielo preservado.
5. Luz: sombras alargadas hacia la derecha-delante en C1; luces cálidas y sombras ligeramente azuladas; histograma sin recorte (< 1 % píxeles en blanco o negro), exposición media ≈ 0,35-0,45 de luminancia.
6. Aldea: tejados empinados y muros con vigas visibles y relieve (sombra propia de vigas en el revoco); ningún edificio parece una caja lisa; sin bordes ni aristas duras a 3 m de distancia.
7. Vegetación: viento visible en hierba y copas (con `step(n)` determinista); sin recortes cuadrados de alfa ni aureolas blancas; los árboles no «saltan» al cambiar de LOD (comparar capturas a 58 y 62 m).
8. Estilo: sin aspecto low-poly o cartoon (se comprueba con una captura ampliada al 200 % de muro, tejado y árbol); coherencia con la paleta: verdes 0x5f8a3c-0x8fae4a, tierra 0x8a6a45, piedra 0x9a948a, cielo 0x6fa8e8 [SUPUESTO].
9. Rendimiento: `renderer.info` dentro de §5 y ≥ 50 FPS medios en la ruta de cámara C1→C3 (10 s); `dispose()` devuelve `geometries` y `textures` al valor inicial al salir de la escena.
10. El patio del castillo y su combate siguen idénticos (comparación de captura previa y posterior con el mismo estado, diferencia < 1 %).
