# Conceptos visuales (referencia, no assets del juego)

| Fichero | Qué es | Cómo se genera |
|---|---|---|
| `armadura_ligera_frente.webp`, `_espalda.webp`, `_detalle.webp` | Render del héroe con armadura ligera (gambesón acolchado, peto de cuero, hombreras de láminas, cuello envolvente, bandolera con cápsulas, abrigo de faldones, botas altas, espada híbrida) y pelo largo liso peinado hacia atrás | `blender -b -P juego/tools/blender/concepto_armadura.py -- <texturas Poly Haven> <salida> [muestras]` |
| `dibujo_armadura_ligera.svg` / `.png` | El mismo concepto dibujado a mano en vectorial (sin 3D) | SVG escrito a mano; el PNG es una captura a 2× |

Mezcla de sensaciones de cazador medieval curtido y ciencia ficción sobria. Diseño propio: no reproduce piezas,
personajes ni logotipos de ningún juego. Todo CC0 (MakeHuman, Poly Haven) o propio.
