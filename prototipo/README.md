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
   Pulsa **Jugar yo** (u OPTIONS en el mando) para tomar el control.

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
  juego/public/assets/personajes/caballero.glb vfx
```
El 5º argumento `vfx` incrusta `vfx/vfx.js`; sin él se usan los efectos básicos de respaldo.

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
| Moverse / cámara | Stick izq. / stick der. (R3 centra) | WASD / ratón (clic para capturarlo, Esc lo suelta; C centra) | Joystick / arrastrar |
| Atacar · mantener = ataque fuerte | R1 (□ también) | Clic izq. o J | Atacar |
| Bloquear · a tiempo = parada (aturde) | L1 mantener | Clic der. o V mantener | Bloquear |
| Magia elegida | L2 | F (Q/E/R directos) | Ranuras de hechizo |
| Elegir magia | Cruceta ◀ ▶ | Rueda | — |
| Habilidad del arma (Embestida / Terremoto / Andanada) | R2 | G o clic central | Habilidad |
| Esquivar | ✕ / ○ | Espacio | Esquivar |
| Cambiar arma | △ (pulsar) / cruceta ▲ | 1 2 3 | Ranuras de arma |
| Montar / desmontar el caballo (cerca de él) | △ mantener | E mantener | — |
| Galopar (a caballo) | ✕ mantener | Shift / Espacio mantener | — |
| Demo / jugar · calidad | OPTIONS · CREATE/panel táctil | Botones del HUD | Botones del HUD |

Los mandos se leen con la Gamepad API (mapeo estándar) y vibran al golpear, recibir daño y en explosiones.
Si el visor de la página bloquea los mandos (iframe sin permiso `gamepad`), se avisa en pantalla: ábrela en su propia pestaña.
