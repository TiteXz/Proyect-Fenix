# Créditos y licencias de assets

Todo lo que se usa en el juego es propio, CC0 o compatible. Cada entrada indica origen, licencia y qué se ha modificado.

| Asset | Fichero | Origen | Autor | Licencia | Modificaciones |
|---|---|---|---|---|---|
| Cuerpo humano, piel, esqueleto y ropa interior del caballero | `personajes/caballero.glb` | MakeHuman system assets (`makehuman_system_assets_cc0.zip`) — https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/ — generados con MPFB 2.0.18 (https://extensions.blender.org/add-ons/mpfb/) | Comunidad MakeHuman | CC0 1.0 (los assets y lo que MPFB genera; el plugin en sí es GPL-3.0 y no se distribuye) | Proporciones propias, esqueleto `game_engine`, formas bakeadas, ropa teñida |
| Textura de armadura | `personajes/caballero.glb` (embebida) | Poly Haven — `metal_plate_02` — https://polyhaven.com/a/metal_plate_02 | Poly Haven | CC0 1.0 | Color desaturado a acero gris, 1K, WebP |
| Armadura, yelmo, faldón y capa | `personajes/caballero.glb` | Propios, generados por `juego/tools/blender/caballero.py` | Proyecto Fénix | Propia | — |
| Animaciones (reposo, guardia, andar, correr, tajo, hechizo, rodar, golpeado, morir) | `personajes/caballero.glb` | Universal Animation Library [Standard] — https://quaternius.itch.io/universal-animation-library | Quaternius | CC0 1.0 | Reasignadas al esqueleto MPFB con `juego/tools/blender/retarget.py`; renombradas |

Para regenerar: `bash scripts/instalar-blender.sh` y después
`/home/user/tools/blender-4.2.9-linux-x64/blender -b -P juego/tools/blender/caballero.py -- juego/public/assets/personajes/caballero.glb <dir texturas Poly Haven> - <UAL1_Standard.glb>`
(el tercer argumento es la ruta del render de muestra, o `-` para omitirlo).
(MPFB y el pack CC0 de MakeHuman deben estar instalados; ver `juego/tools/blender/mpfb_setup.py`).
