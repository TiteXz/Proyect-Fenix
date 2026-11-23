# Créditos de assets: escena exterior (Camino de entrada a la Aldea del Vado)

Todo es **CC0** (dominio público) de Poly Haven (https://polyhaven.com/license: CC0). Página de cada asset: `https://polyhaven.com/a/<slug>`. Descargado el 2026-11-23 vía la API pública `https://api.polyhaven.com` (sin claves). ambientCG no se ha usado: Poly Haven cubría todo.
Sin compresión de malla (GLTFLoader r147 sin Draco/Meshopt); texturas WebP (GLTFLoader r147 soporta `EXT_texture_webp`).

## Texturas PBR (`<nombre>_Diffuse.webp`, `_nor_gl.webp` normal OpenGL, `_arm.webp` AO/rugosidad/metal)
Conversión: JPG de Poly Haven a WebP (diffuse q78, normal q66, ARM q68; ARM a media resolución en las de 2K). Script: `fetch_texturas_cielo.py`.
| Fichero | Slug Poly Haven (brief) | Autor | Res. |
|---|---|---|---|
| camino | `stony_dirt_path` (brief: dirt_path/brown_mud_leaves_01) | eye-candy.xyz | 2K |
| hierba | `leafy_grass` | Charlotte Baglioni | 2K |
| roca_talud | `rock_face` | Greg Zaal, Dario Barresi | 2K |
| barro | `brown_mud` | Rob Tuytel | 1K |
| muro_piedra | `rock_wall_08` | Amal Kumar | 2K |
| madera | `weathered_planks` | Dario Barresi, Dimitrios Savva | 1K |
| revoco | `white_plaster_rough_01` (brief: plaster_grey_02) | Rob Tuytel | 1K |
| teja | `roof_tiles_14` | Rob Tuytel | 2K |

## Cielo
`cielo_kloofendal_1k.hdr` (RGBE 1024x512): `kloofendal_48d_partly_cloudy_puresky`, Greg Zaal, Jarod Guest. Sin cambios (1K, tal cual).

## Modelos GLB (1 unidad = 1 m, origen en los pies y centrado en XZ)
Reducción con meshoptimizer (simplify/sloppy) y submuestreo; texturas redimensionadas a WebP. Script: `herramientas/procesar_modelos.mjs` + `modelos.json`. Fuente 1K del glTF de Poly Haven (alfa fusionado en el diffuse: `fetch_modelos.py`).
| Fichero | Origen (slug) | Autor | Tris | Cambios |
|---|---|---|---|---|
| arbol_isla2_lod0/lod1 | `island_tree_02` | Rob Tuytel, Rico Cilliers | 5,4 k / 1,6 k | tronco y ramas simplificados; copa rehecha con tarjetas de ramillo (atlas propio `follaje_isla`) sobre posiciones de las hojas originales; escalado a 7 m |
| arbol_isla1_lod0/lod1 | `island_tree_01` | Rob Tuytel, Rico Cilliers | 5,6 k / 1,6 k | ídem, 8,5 m |
| arbol_jacaranda_lod0/lod1 | `jacaranda_tree` | Rob Tuytel, Rico Cilliers | 5,8 k / 1,6 k | ídem (atlas `follaje_jacaranda`), 13 m |
| arbusto_02, arbusto_03 | `shrub_02`, `shrub_03` | Rico Cilliers | 7,4 k / 6,7 k (4 variantes c/u) | hojas submuestreadas y ampliadas; cada variante centrada (nodos `*_v0..3`) |
| helecho_02 | `fern_02` | Rob Tuytel, Rico Cilliers | 4,8 k (4 variantes) | ídem |
| roca_musgo_set | `rock_moss_set_01` | Kless Gyzen | 5,4 k (6 rocas, nodos `_v0..5`) | simplificado, rocas centradas |
| roca_07, roca_09, piedra_01 | `rock_07`, `rock_09`, `stone_01` | Jenelle van Heerden; Dario Barresi, Rico Cilliers | 1,2 k / 1,2 k / 0,4 k | simplificado |
| talud_roca_01, talud_roca_02 | `rock_face_01`, `rock_face_02` | Dario Barresi (+Rico Cilliers) | 3,0 k c/u | simplificado (módulos de talud) |
| barriles | `wooden_barrels_01` | James Ray Cock | 2,8 k | simplificado |
| cajon, cubo, farol | `wooden_crate_01`, `wooden_bucket_01`, `wooden_lantern_01` | James Ray Cock | 1,5 k / 1,0 k / 1,8 k | simplificado; farol conserva cristal translúcido |
| tronco_caido, tocon | `dead_tree_trunk_02`, `tree_stump_01` | Jenelle van Heerden, Rico Cilliers; Rob Tuytel | 2,5 k / 1,5 k | simplificado |
| hierba_mechones | atlas propio (hojas de `grass_medium_02`, Rico Cilliers) | derivado CC0 | 8 nodos `mechon_i` 12 tris + 8 `mechon_lod_i` 4 tris | tarjetas cruzadas con 2 segmentos en altura (viento); UV v=altura |
| flores_matas | atlas propio (flores de `periwinkle_plant`, Amal Kumar, teñidas) | derivado CC0 | 16 nodos `flor_<morada\|naranja\|blanca\|amarilla>_<0..3>` 12 tris | morada ~0x7a4fb5, naranja ~0xe07a20, blanca, amarilla; hojas basales de la misma planta |

Atlas generados (procedurales, semilla fija; `crear_atlas.py` + `herramientas/crear_cartas.mjs`) van incrustados en los GLB. Materiales de alfa: `MASK` (corte 0,45-0,5), doble cara.

## Sustituciones respecto al brief
- `dirt_path`, `brown_mud_leaves_01`, `Ground054` -> `stony_dirt_path`; `Grass004`/`aerial_grass_rock` -> `leafy_grass`; `plaster_grey_02` -> `white_plaster_rough_01`.
- `tree_small_02` y `pine_*`: descartados (hojas con fondo opaco / 10+ M polígonos); 3 especies = isla_01, isla_02 y jacaranda.
- `shrub_01`/`shrub_04`: descartados (muy ralos tras reducir). `rock_moss_set_01` en lugar de `rock_boulder_02`; `boulder_01` descartado (la reducción deformaba el UV).
- No existen vallado ni carro CC0 en Poly Haven: se entregan cajón, cubo, barriles, farol, tocón y tronco; poste/cuerda/carro deben hacerse con primitivas + `madera`.
- Edificios: sin modelos (el brief los construye con primitivas + las texturas `muro_piedra`, `revoco`, `madera`, `teja`).
- Nubes/humo: no se descargó nada (sprites de vfx.js).

## Ronda 2 (2026-11-23): hierba fina, flores, cielo 4K, acantilados
Todo **CC0** de Poly Haven (https://polyhaven.com/license), descargado de la API publica (sin claves). Script: `fetch_ronda2.py <cache>`; atlas: `crear_atlas_ronda2.py <cache> <out>`; GLB: `herramientas/crear_cartas_ronda2.mjs <atlas> <out>`, `herramientas/procesar_acantilados.mjs <cache> <out>`; cielo: `crear_cielo.py`. Hoja de prueba: `herramientas/sheet_ronda2.js`.
| Fichero | Origen (slug) | Autor | Tris | KB | Cambios |
|---|---|---|---|---|---|
| hierba_briznas.glb | `grass_medium_01` y `grass_medium_02` (diffuse+alpha 4K y `dry_diff`), `dandelion_01` (hojas) + dibujo procedural (treboles) | Rob Tuytel, Rico Cilliers (modelado); Poly Haven | 16 nodos `briznas_<i>_<nombre>` x 24 | 650 | Atlas 2048x1024 WebP, 16 teselas de 256x512: 12 de hierba (macollas finas reales + briznas largas curvadas + espigas + tallos secos) y 4 de hoja ancha (treboles, trebol con flor, hojas de diente de leon). Color desaturado, base oscurecida (AO falso). 3 tarjetas cruzadas x 2 segmentos, cara delantera y trasera como geometria propia (sin DoubleSide: three voltea la normal y la cara trasera se veia negra), normales mezcladas 85 % hacia arriba, v del UV = altura |
| hierba_lod.glb | mismo atlas (a 1024x512) | idem | 16 nodos `lod_<i>_<nombre>` x 4 | 212 | 1 tarjeta por variante (2 caras), 15 % mas ancha |
| flores_prado.glb | atlas procedural propio (sin fotos) | CC0 propio | 12 nodos `flor_<morada\|blanca\|amarilla\|naranja>_<n>` x 24 | 168 | Atlas 2048x1536 WebP, 12 teselas 512x512 (1 px = 0,6 mm; tarjeta 0,31 m): petalos con gradiente centro oscuro -> punta clara, venas, centro oscuro/estambres, tallos finos (2-3 mm), hojas basales, capullos; cabezas de 2,2-4 cm. Colores suaves (sat x0,8) |
| cielo_4k.webp | `kloofendal_48d_partly_cloudy_puresky` 4K .hdr | Greg Zaal, Jarod Guest | - | 275 | Equirectangular 4096x2048 LDR sRGB (curva Reinhard extendida, sol recortado). Sol en azimut ~216 deg desde u=0,6, elevacion ~49 deg. Es el mismo cielo que `cielo_kloofendal_1k.hdr`, que sigue siendo la luz/PMREM |
| acantilado_01 | `mountainside` | Dario Barresi (foto), Rico Cilliers | 5,8 k | 1687 | Simplificado (meshopt) de 288 k tris, 6 x 6,2 x 3,1 m; diffuse/normal 2K, ARM 1K (WebP). Origen en la base, centrado |
| acantilado_02 | `namaqualand_cliff_01` | Jenelle van Heerden (foto), Rico Cilliers | 5,8 k | 1022 | de 177 k tris, 5 x 3 x 2,65 m; resto igual |
| acantilado_03 | `boulder_01` | Rico Cilliers | 5,0 k | 1595 | de 124 k tris, 4 x 3,2 x 5,8 m (penasco con liquen) |
| acantilado_04 | `namaqualand_boulder_02` | Greg Zaal (foto), Rico Cilliers | 5,2 k | 1530 | de 184 k tris, 3,6 x 1,3 x 1,75 m (peñasco bajo) |
Nota: no hay textura `roca_talud` nueva (`rock_face` 2K sigue siendo adecuada para triplanar). Ronda 2 anade 6,9 MB netos a `assets/`.
**Obsoletos (siguen en la carpeta para no romper la escena en curso; borrar al migrar, -1,3 MB):** `hierba_mechones.glb`, `flores_matas.glb`, `talud_roca_01.glb`, `talud_roca_02.glb`.
