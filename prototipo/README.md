# Prototipo visual — Proyecto Fénix

Maqueta jugable de un solo archivo HTML para validar el **estilo** (fantasía oscura realista) y la
**sensación de combate** antes de construir el juego de verdad en `juego/`. No es el juego: es una
referencia viva para el `director-arte`, el `artista-3d` y los programadores.

Publicada en: https://claude.ai/artifact/YNiWbvQBq5CYroDscJQ3QA (privada; compártela desde su menú).

## Probarla en tu PC (lo más rápido)
1. Clona o descarga el repositorio (rama `claude/share-generated-agent-9lfcsr`).
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
| `vfx/vfx.js` | Módulo de efectos de hechizos: partículas con tamaño/alfa por partícula, círculos de runas originales, cargas, proyectiles, explosiones, escarcha, columna de luz |
| `vfx/test.html`, `vfx/shoot.js`, `vfx/sheet.py` | Banco de pruebas del módulo de efectos y capturas (`vfx/capturas/`) |
| `texturas/*.webp` | Texturas CC0 de Poly Haven (ver `juego/public/assets/CREDITOS.md`) |
| `build.py` | Genera el HTML final incrustando texturas, el caballero GLB y `vfx.js` |
| `pruebas/*.js` | Pruebas con Playwright: carga sin errores, vista de frente, combate (fuego, luz, martillo, correr atacando), hechizo de luz |
| `capturas/` | Capturas de referencia (render en Blender, poses, combate) |

El modelo del caballero vive en `juego/public/assets/personajes/caballero.glb` (generado por
`juego/tools/blender/caballero.py`, con animaciones de `retarget.py` y `poses.py`).

## Generar la maqueta
```bash
python3 prototipo/build.py prototipo/maqueta.src.html prototipo/texturas prototipo/maqueta.html \
  juego/public/assets/personajes/caballero.glb vfx \n  katana=juego/public/assets/armas/katana.glb caballo=juego/public/assets/animales/caballo.glb
```
El 5º argumento `vfx` incrusta `vfx/vfx.js`; sin él se usan los efectos básicos de respaldo. Sin `katana=` y
`caballo=` la maqueta sale sin la katana ni el caballo.

## Probar sin acceso a CDN
```bash
bash prototipo/preparar_three.sh                       # three.js 0.147 desde npm a prototipo/.three
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
| Hechizo directo | Mantener L2 + □ fuego · △ escarcha · ○ curación (Destello sagrado) · ✕ habilidad del arma | Q / E / R · G | Ranuras de hechizo |
| Magia elegida | L2 (pulsar y soltar) | F | — |
| Elegir magia | Cruceta ◀ ▶ | Rueda | — |
| Habilidad del arma (Embestida / Terremoto / Andanada) | R2 | G o clic central | Habilidad |
| Esquivar | ✕ / ○ | Espacio | Esquivar |
| Cambiar arma | △ (pulsar) / cruceta ▲ | 1 2 3 | Ranuras de arma |
| Montar / desmontar el caballo (cerca de él) | △ mantener | E mantener | — |
| Galopar (a caballo) | ✕ mantener | Shift / Espacio mantener | — |
| Pausa (jugando) | OPTIONS | Esc o P (Esc también suelta el ratón) · botón ❚❚ | Botón ❚❚ del HUD |
| Menú de pausa: elegir · aceptar · volver | Cruceta/stick ▲▼ · ✕ · ○ (OPTIONS reanuda) | ↑↓ (o W/S) · Intro · Esc (P reanuda) | Tocar la opción |
| Jugar yo (en la demo) · calidad | OPTIONS · CREATE/panel táctil | Botones del HUD | Botones del HUD |

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
