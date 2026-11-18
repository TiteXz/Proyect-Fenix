# Prototipo visual — Proyecto Fénix

Maqueta jugable de un solo archivo HTML para validar el **estilo** (fantasía oscura realista) y la
**sensación de combate** antes de construir el juego de verdad en `juego/`. No es el juego: es una
referencia viva para el `director-arte`, el `artista-3d` y los programadores.

Publicada en: https://claude.ai/artifact/YNiWbvQBq5CYroDscJQ3QA (privada; compártela desde su menú).

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
python3 prototipo/build.py prototipo/maqueta.src.html prototipo/texturas prototipo/dist/maqueta.html \
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
WASD mover · clic/J atacar · Espacio esquivar · 1-2-3 espada/martillo/arco · Q/E/R fuego/escarcha/luz ·
arrastrar para girar la cámara. En móvil: joystick y botones. Botón «Calidad» para Baja/Media/Alta.
