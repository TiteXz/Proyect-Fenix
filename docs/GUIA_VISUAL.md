# Guía visual

Documento del rol **director-arte**. Estilo: **fantasía realista luminosa** (referencias de sensación, no de copia: tono Ghost of Tsushima / Dragon's Dogma 2),
materiales PBR, ciclo día/noche e iluminación cinematográfica. Nunca low-poly ni cartoon en el arte final. Ver `CLAUDE.md` y `contexto/CONTEXTO_PROYECTO.md`.

Estado: solo está redactada la sección de glifos rúnicos. El resto está pendiente.

## Paleta

PENDIENTE

## Tipografía (compartida con la UI)

PENDIENTE

## Iluminación

PENDIENTE

## Materiales PBR

PENDIENTE

## Postproceso y presets de calidad

PENDIENTE

## Lenguaje de formas y feedback visual

Resto de la sección PENDIENTE. Apartados ya definidos (origen: `docs/COMBATE.md` §1.1, §1.3):

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

Resto de la sección PENDIENTE (presupuesto general por preset Bajo/Medio/Alto/Ultra). `docs/ARQUITECTURA.md` aún no existe: valores [SUPUESTO] hasta que fije presupuestos globales.

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

Resto de la sección PENDIENTE. Requisitos ya definidos para el escudo y los sets de animación (C-18):

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
