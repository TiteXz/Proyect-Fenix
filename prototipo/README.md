# Prototipo visual — Proyecto Fénix

Maqueta jugable de un solo archivo HTML para validar el **estilo** y la
**sensación de combate** antes de construir el juego de verdad en `juego/`. No es el juego: es una
referencia viva para el `director-arte`, el `artista-3d` y los programadores.

> **Estilo pendiente de actualizar.** La maqueta se hizo en fantasía oscura (patio nocturno). El proyecto ha pasado a
> **fantasía realista luminosa con ciclo día/noche** (ver `contexto/CONTEXTO_PROYECTO.md`); la iluminación y el
> ambiente de la maqueta todavía no se han adaptado.

Publicada en: https://claude.ai/artifact/YNiWbvQBq5CYroDscJQ3QA (privada; compártela desde su menú).

## Probarla en tu PC (lo más rápido)
1. Clona o descarga el repositorio (rama `main`).
2. Abre **`prototipo/maqueta.html`** con doble clic en Chrome, Edge o Firefox. Lleva dentro las texturas,
   el caballero y los efectos; solo necesita internet para cargar three.js y las fuentes desde la CDN.
3. Conecta el mando de PS5/PS4 por USB o Bluetooth y pulsa cualquier botón (o usa teclado y ratón).
   Pulsa **Jugar yo** (u OPTIONS en el mando) para tomar el control. Mientras juegas, **Esc**, **P**,
   OPTIONS o el botón ❚❚ del HUD abren el menú de pausa.

Si cambias `maqueta.src.html`, vuelve a generar `maqueta.html` con el comando de abajo.

## Qué contiene
| Ruta | Qué es |
|---|---|
| `maqueta.src.html` | Código fuente de la maqueta (three.js r147 por CDN, HUD en DOM, postproceso HDR + bloom + ACES) |
| `vfx/vfx.js` | Módulo de efectos de hechizos: partículas con tamaño/alfa por partícula, humo fBm con erosión, círculos de runas, cargas, proyectiles y estela de los 7 elementos, impactos, arcos eléctricos, rocas/pinchos, suelos persistentes, cono, aura, reacciones y estados |
| `magia/magia.js` | Reglas puras de la magia rúnica (recetas, `compilar`, inestabilidad con semilla, estados y reacciones); sin three.js. Especificación en `magia/DISENO.md` y `magia/VFX.md` |
| `vfx/test.html`, `vfx/shoot.js`, `vfx/sheet.py` | Banco de pruebas del módulo de efectos y capturas (`vfx/capturas/`) |
| `texturas/*.webp` | Texturas CC0 de Poly Haven (ver `juego/public/assets/CREDITOS.md`) |
| `build.py` | Genera el HTML final incrustando texturas, el caballero GLB, `vfx.js` y `magia/magia.js` |
| `pruebas/*.js` | Pruebas con Playwright: carga sin errores, vista de frente, combate (fuego, luz, martillo, correr atacando), hechizo de luz; `magia.js` verifica los criterios MQ-01..MQ-14 y saca las capturas `vfx/capturas/magia_*.webp` (`node prototipo/pruebas/magia.js prototipo/dist prototipo/.three/package [dirCapturas] [mq\|cap]`) |
| `capturas/` | Capturas de referencia (render en Blender, poses, combate) |
| `exterior/` | Escena exterior «Camino de la Aldea del Vado» (ver abajo): `BRIEF.md` (director-arte), `assets/` (CC0 de Poly Haven, `CREDITOS.md`), `src/{terreno,edificios,aldea}.js` (código de la escena), `capturas/*.webp` |
| `pruebas/exterior.js`, `pruebas/terreno.test.js` | Prueba de la aldea (carga, renderer.info por preset, capturas C1/C2/C3 y jinete, dispose) y prueba en Node del modelo de terreno |

Modelos que incrusta la maqueta (detalle y licencias en `juego/public/assets/CREDITOS.md`):
| Modelo | Fichero | Cómo se genera |
|---|---|---|
| Caballero (soldado) | `juego/public/assets/personajes/caballero_soldado.glb` | `juego/tools/assets/build_caballero.mjs`: re-enlaza el esqueleto del soldado con el del caballero anterior y le copia sus clips |
| Caballo pinto | `juego/public/assets/animales/caballo_pinto.glb` | `juego/tools/assets/build_caballo.mjs` |
| Katana | `juego/public/assets/armas/katana.glb` | `juego/tools/blender/katana.py` |

**Licencia pendiente:** el soldado y el caballo pinto salen de zips aportados por el usuario sin licencia. Hasta
confirmarla no se publican; si no se pueden usar, se vuelve a `caballero.glb` (generado por
`juego/tools/blender/caballero.py`, con animaciones de `retarget.py` y `poses.py`) y `caballo.glb`, que siguen en el repo.

## Generar la maqueta
```bash
python3 prototipo/build.py prototipo/maqueta.src.html prototipo/texturas prototipo/maqueta.html \
  juego/public/assets/personajes/caballero_soldado.glb vfx \
  katana=juego/public/assets/armas/katana.glb caballo=juego/public/assets/animales/caballo_pinto.glb
```
El 5º argumento `vfx` incrusta `vfx/vfx.js`; sin él se usan los efectos básicos de respaldo. Sin `katana=` y
`caballo=` la maqueta sale sin la katana ni el caballo.

**Con la escena exterior (Aldea del Vado)**: añade el argumento `exterior` (o `exterior=<dir_assets>`, por defecto `prototipo/exterior/assets`).
Incrusta los assets como mapa `nombre de fichero → base64` en el marcador `/*__EXTERIOR__*/` (los `.webp` como data URI) y el código de
`exterior/src/{terreno,edificios,aldea}.js` en `/*__ALDEA__*/`. `maqueta.html` pasa de ≈ 16 MB a ≈ 40 MB (+24,5 MB, brief: ≤ +30 MB):
```bash
python3 prototipo/build.py prototipo/maqueta.src.html prototipo/texturas prototipo/maqueta.html \
  juego/public/assets/personajes/caballero_soldado.glb vfx \
  katana=juego/public/assets/armas/katana.glb caballo=juego/public/assets/animales/caballo_pinto.glb exterior
mkdir -p prototipo/dist && cp prototipo/maqueta.html prototipo/dist/
```
Sin `exterior` el comando anterior sigue funcionando igual y la maqueta sale sin la opción «Aldea» (el botón se oculta).

## Escena exterior: Camino de la Aldea del Vado
Por defecto la maqueta abre el **patio** (las pruebas `pruebas/*.js` dependen de él). Para ver la aldea: `?escena=aldea` en la URL, el botón
**Escena: Patio / Aldea** del HUD o la opción **Escena** del menú de pausa. Al cambiar se hace `dispose()` completo de lo que creó la aldea
(geometrías, materiales, texturas, render targets del PMREM y mapas de sombra); el patio solo se oculta (`PATIO_NODES`) y se restaura tal cual
(luces, niebla, entorno, etalonaje y colisiones). En la aldea no hay oleadas ni enemigos: se anda, se monta y se galopa por el camino.
`__GAME__.escena`, `.aldea`, `.setEscena(id)`, `.escenaListo` (promesa), `.camara({x,y,z,lx,ly,lz,fov})`, `.render()`, `.colocar(s, lado)` sirven a las pruebas;
en `?test=1` la aldea solo se renderiza con `step(n)` o `render()` (el render por software de las pruebas es lento).

| Parte | Cómo está hecho |
|---|---|
| Terreno 120 × 120 m | Malla 160 × 160 con alturas de `exterior/src/terreno.js` (fBm con semilla, espolón de +14 m con la aldea en la meseta, camino Catmull-Rom de 7 puntos, pendiente máx. del camino 14,6 %). **Talud**: donde la pendiente base es fuerte se suman estratos escalonados y crestas (`rockiness`), sin tocar camino ni meseta. Máscara 1024² (R camino, G roca por pendiente, B barro, A oclusión de contacto) y shader por `onBeforeCompile`: hierba / camino / barro / **roca triplanar real** (3 proyecciones × 2 escalas, normales whiteout, bump procedural de grietas y estratos con `dFdx`, musgo, hierba que baja por la pendiente en lenguas por ruido) |
| Talud de la loma | ~180 rocas encastradas (medio enterradas a lo largo de la normal, eje «arriba» mezcla vertical/normal, escala no uniforme) de `roca_musgo_set` y `acantilado_01/02` (repisas), simplificadas en carga por agrupación de vértices; detritos y piedras al pie (`atFoot`), helechos y arbustillos en las grietas |
| Muros de piedra seca | ≈ 460 bloques irregulares con textura `muro_piedra`, siguen el terreno, tramos caídos, musgo en coronación y cara norte; colisión por cápsulas |
| Aldea | 5 edificios con primitivas biseladas (`edificios.js`, ≈ 48 k tris): musgo y suciedad por vértice (paredes y zócalos teselados, tejados teselados con musgo por parches), contraventanas de tablas de colores, alféizares y dinteles, jardineras con flores, arriostres variados (diagonal, cruz, V, poste), canecillos y cabios bajo el alero, modillones, puerta de tablas con escalera de piedra, faroles de pared, leña apilada, hiedra y matas al pie; 7 materiales compartidos (madera, revoco, teja, piedra, hierro, cristal, flora) |
| Vegetación | 25 árboles (LOD0/LOD1 instanciados, viento), arbustos y helechos y rocas fusionados por material en celdas de 60 m; **hierba**: briznas finas de `hierba_briznas.glb` (instancias de 3 tarjetas de 24 tris, 12 instancias/m², chunks de 12 m, `instanceColor` casi blanco con tinte de gran escala, verde vivo en zonas húmedas y ~1/4 pajizo, más corta y rala junto al camino con trébol/hojas anchas en el borde) y LOD de 8 tris (`hierba_lod.glb`) en celdas de 20 m; **flores** de `flores_prado.glb` en parches de 3-5 matas |
| Luz y atmósfera | Sol de tarde a 17° de elevación y 245° de azimut (luz rasante, sombras largas), color 0xffc27f; cielo `cielo_4k.webp` (rotado para que su sol caiga a la espalda del jinete) con gradiente cálido hacia el horizonte y resplandor del sol; `cielo_kloofendal_1k.hdr` solo para el PMREM; niebla `FogExp2` con el color del horizonte; en Alta, `AtmoPass` (maqueta): SAO de r147 a media resolución (solo profundidad: sin vegetación ni sombras) + bruma baja en el valle por altura reconstruida desde la profundidad; etalonaje `exposure 0,95`, bloom 0,25 |
| Calidad | Los presets `QUAL.*.ext` ajustan sombras (4096/2048/1024), densidad de hierba (100/60/30 %), radios de hierba completa (14/12/8 m) y LOD (52/42/30 m), viento y flores; SAO + bruma solo en Alta |

**Medida** (`renderer.info` de un render completo con las dos pasadas de sombra, encuadre C1, Chromium + SwiftShader, 1280 × 720; «escena» = sin jugador ni caballo; no incluye la pasada de profundidad del SAO, que dibuja solo opacos a media resolución):
| Preset | Draw calls (escena / con jugador) | Triángulos (escena / con jugador) | Presupuesto |
|---|---|---|---|
| Alta | 148 / 226 | 1,64 M / 1,86 M | ≤ 160 calls, ≤ 2 M |
| Media | 134 / 212 | 1,19 M / 1,41 M | |
| Baja | 124 / 202 | 0,94 M / 1,16 M | |

No se mide FPS: el entorno de pruebas es render por CPU. Sin impostores de árbol (los lejanos usan LOD1). `maqueta.html` ≈ 44 MB (+28 MB sobre la maqueta base; `build.py` no incrusta `acantilado_03/04` ni `roca_07`).

```bash
bash prototipo/preparar_three.sh                         # three 0.147 local (prototipo/.three/package), si hace falta
node prototipo/pruebas/terreno.test.js                   # modelo de terreno (Node, sin navegador)
node prototipo/pruebas/exterior.js                       # aldea: 0 errores, renderer.info por preset, capturas en exterior/capturas/*.webp, galope, dispose
```
`exterior.js` usa `dist/maqueta.html` (generado con `exterior`), genera `C1_entrada`, `C2_muro`, `C3_aldea` (encuadres del brief a 1280 × 720, alturas relativas al
terreno porque el camino sube 13 m) y `C4_jinete` (caballero a caballo en el camino) como `.webp` de calidad 80, y comprueba que patio → aldea → patio devuelve
`geometries` y `textures` de `renderer.info.memory` al valor inicial.

## Probar sin acceso a CDN
```bash
bash prototipo/preparar_three.sh                       # three.js 0.147 desde npm a prototipo/.three
mkdir -p prototipo/dist && cp prototipo/maqueta.html prototipo/dist/
node prototipo/pruebas/carga.js prototipo/dist prototipo/.three/package '[{"w":1000,"h":560,"n":"carga","t":20000}]'
node prototipo/pruebas/combate.js prototipo/dist prototipo/.three/package   # capturas c-*.png en dist/
node prototipo/vfx/shoot.js                            # capturas del módulo de efectos
```
En modo de prueba la página expone `window.__GAME__` (estado del jugador, hechizos y armas) para Playwright.

## Controles
| Acción | Mando PS5 (DualSense) / PS4 (DualShock 4) | Teclado y ratón | Táctil |
|---|---|---|---|
| Moverse / cámara | Stick izq. / stick der. | WASD / ratón (clic para capturarlo; C centra) | Joystick / arrastrar |
| Fijar / soltar objetivo (sin enemigos: centra la cámara) | R3 (pulsar el stick der.) | T | — |
| Cambiar de objetivo fijado (al enemigo más cercano en pantalla hacia ese lado) | Stick der. ◀ ▶ (inclinar a fondo y volver al centro para el siguiente) | Z (izquierda) / X (derecha) | — |
| Atacar · mantener = ataque fuerte | R1 (□ también) | Clic izq. o J | Atacar |
| Bloquear · a tiempo = parada (aturde) | L1 mantener | Clic der. o V mantener | Bloquear |
| Hechizo de la ranura 1 / 2 / 3 de la página activa | Mantener L2 + □ / △ / ○ (✕ = habilidad del arma) | Q / E / R · G | Ranuras de hechizo |
| Cambiar de página de ranuras (1-3 ↔ 4-6) | L2 + ▲ / ▼ | Tab | Indicador 1/2 del HUD |
| Magia elegida | L2 (pulsar y soltar) | F | — |
| Elegir ranura | Cruceta ◀ ▶ | Rueda | — |
| Grimorio (compón hechizos; pausa el juego) | Menú de pausa › Grimorio · dentro: cruceta navega, L1/R1 columna, ✕ alterna, □ vacía, △ equipar (luego ranura + ✕), ○ volver | B (o Pausa › Grimorio) · dentro: ←→ columna, ↑↓ runa, Intro alterna, 1-6 equipa en esa ranura, Supr vacía, Tab página, B/Esc cierra · ratón: clic alterna, arrastrar la vista previa a una ranura | Pausa › Grimorio |
| Habilidad del arma (Embestida / Terremoto / Andanada) | R2 | G o clic central | Habilidad |
| Esquivar | ✕ / ○ | Espacio | Esquivar |
| Cambiar arma | △ (pulsar) / cruceta ▲ | 1 2 3 | Ranuras de arma |
| Montar / desmontar el caballo (cerca de él) | △ mantener | E mantener | — |
| Galopar (a caballo) | ✕ mantener | Shift / Espacio mantener | — |
| Pausa (jugando) | OPTIONS | Esc o P (Esc también suelta el ratón) · botón ❚❚ | Botón ❚❚ del HUD |
| Menú de pausa: elegir · aceptar · volver | Cruceta/stick ▲▼ · ✕ · ○ (OPTIONS reanuda) | ↑↓ (o W/S) · Intro · Esc (P reanuda) | Tocar la opción |
| Jugar yo (en la demo) · calidad | OPTIONS · CREATE/panel táctil | Botones del HUD | Botones del HUD |

**Magia rúnica.** Los hechizos ya no son tres fijos: se componen en el **grimorio** con 1 forma (Proyectil, Área, Zona, Cono, Yo),
1-2 elementos (Fuego, Hielo, Luz, Rayo, Tierra, Sombra, Aire; dos distintos = fusión) y hasta 3 modificadores, y se equipan en
6 ranuras (2 páginas de 3). Hay 6 reacciones (Vapor, Magma, Incendio, Escarcha eléctrica, Juicio, Niebla negra) sobre enemigos y suelos,
9 estados sobre enemigos y una tirada de inestabilidad con semilla. La demo usa los 10 hechizos precompuestos. Reglas y números en
`magia/DISENO.md`; `window.__GAME__.MAGIA` expone `compilar`, `equipar`, `lanzar`, `ranuras`, `pagina`, `codice`, `estados`, etc.
Con `?test=1` la simulación solo avanza con `__GAME__.step(n)`.

El menú de pausa congela la simulación (jugador, enemigos, proyectiles, oleadas, efectos y temporizadores) y
muestra la escena detenida y desenfocada detrás. Opciones: **Volver a la batalla**, **Controles** (lista del
dispositivo en uso), **Calidad** (alterna Alta/Baja/Media) y **Salir a la demo**. Si capturaste el ratón, al
reanudar se vuelve a capturar. El juego también se pausa solo al cambiar de pestaña.
`window.__GAME__` expone `paused`, `pause()` y `resume()`.

**Fijar objetivo.** Al fijar se elige el enemigo vivo más cercano al centro de la cámara (hasta 16 m). Con un
objetivo fijado la cámara se coloca tras el jugador y encuadra a ambos, el jugador se mueve de cara al
objetivo (al galopar o correr mira hacia donde va) y ataques, flechas y hechizos apuntan a él. Sobre el
objetivo aparece una runa dorada en rombo con un halo tenue. Si el objetivo muere o se aleja más de 21 m, se
pasa solo al siguiente cercano, o se suelta si no queda ninguno. Mientras está fijado, el ratón y el stick
derecho solo mueven la cámara en vertical. `window.__GAME__` expone `target` (enemigo o `null`), `lockOn()`,
`cycleTarget(dir)` (−1 izquierda, +1 derecha) y `unlock()`.

Los mandos se leen con la Gamepad API (mapeo estándar) y vibran al golpear, recibir daño y en explosiones.
Si el visor de la página bloquea los mandos (iframe sin permiso `gamepad`), se avisa en pantalla: ábrela en su propia pestaña.

**Colisiones.** En el plano XZ: el jugador (círculo de 0,36 m), los enemigos (su `radius`) y el caballo (cápsula a lo
largo de su eje) chocan entre sí y con los props: basas de las columnas (cajas), fustes caídos y rocas grandes
(cápsulas) y la muralla (círculo del patio). La corrección es posicional, con un número fijo de pasadas y sin crear
objetos en el bucle. El empuje entre cuerpos tiene un tope por fotograma: los enemigos se apartan con suavidad y
lo que no absorben lo absorbe el jugador, así que nadie atraviesa a nadie ni sale disparado. La esquiva, la
Embestida y la montura respetan las columnas, y la cámara se acerca si una columna se interpone.
`window.__GAME__` expone `colliders` (número de colisionadores activos), `collCheck()` (peor solape entre
enemigos y peor penetración en props), `showColliders(true|false)` (dibuja los colisionadores) y `DBG.cam`
(cámara de inspección relativa al caballero `{ az, el, dist, h, light }`, para capturas).

**Animación del caballero.** Andar o correr se elige por la velocidad real y se reproduce a la velocidad de la
zancada medida en el GLB (andar 0,99 m/s, correr 3,43 m/s), así que los pies no patinan al atacar, bloquear o
conjurar en movimiento. Al desplazarse se mezclan los brazos de la guardia sobre el trote para que las armas no
barran el cuerpo. La capa cuelga por gravedad y ondea con la velocidad. El martillo gira la muñeca en la carga
(antes salía del revés) y el arco se pone vertical al disparar. Una corrección de anticolisión gira el arma
alrededor de la empuñadura si su eje entra en el cuerpo (`DBG.noAvoid = true` la desactiva para comparar).
Los clips de Quaternius se hicieron para un cuerpo delgado y con la armadura los codos quedaban dentro de las
costillas: si brazo o antebrazo entran en el tronco, la cadena del brazo gira alrededor del eje hombro→muñeca (el
codo sale y la mano no se mueve, así el agarre y el arma no cambian; tope de 40°) y, si las manos quedan pegadas al
vientre, avanzan juntas hasta 12 cm con IK de dos huesos (`DBG.noElbow = true` lo desactiva).

**Espada y escudo.** La espada se lleva a una mano: el brazo izquierdo cuelga junto al muslo (IK, codo atrás y algo
fuera), bracea contra la pierna izquierda al correr y hace de contrapeso en el tajo. El escudo va **a la espalda**, en
diagonal y por fuera de la capa (la capa queda pegada al cuerpo bajo él y nunca lo atraviesa), también con el martillo,
el arco y a caballo. Al bloquear, la mano izquierda lo coge de la espalda y lo trae por fuera del costado hasta la guardia
en 0,2 s; al soltar, vuelve. La transición es solo visual: el bloqueo y la ventana de parada cuentan desde que se pulsa.
`DBG.SH.t` (0 espalda → 1 embrazado) y `DBG.SH_BACK` (posición y duración) sirven para pruebas.
