# Créditos y licencias de assets

Todo lo que se usa en el juego es propio, CC0 o compatible. Cada entrada indica origen, licencia y qué se ha modificado.

| Asset | Fichero | Origen | Autor | Licencia | Modificaciones |
|---|---|---|---|---|---|
| Cuerpo humano, piel, esqueleto y ropa interior del caballero | `personajes/caballero.glb` | MakeHuman system assets (`makehuman_system_assets_cc0.zip`) — https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/ — generados con MPFB 2.0.18 (https://extensions.blender.org/add-ons/mpfb/) | Comunidad MakeHuman | CC0 1.0 (los assets y lo que MPFB genera; el plugin en sí es GPL-3.0 y no se distribuye) | Proporciones propias, esqueleto `game_engine`, formas bakeadas, ropa teñida |
| Textura de armadura | `personajes/caballero.glb` (embebida) | Poly Haven — `metal_plate_02` — https://polyhaven.com/a/metal_plate_02 | Poly Haven | CC0 1.0 | Color desaturado a acero gris, 1K, WebP |
| Armadura, yelmo, faldón y capa | `personajes/caballero.glb` | Propios, generados por `juego/tools/blender/caballero.py` | Proyecto Fénix | Propia | — |
| Animaciones (reposo, guardia, andar, correr, tajo, hechizo, rodar, golpeado, morir) | `personajes/caballero.glb` | Universal Animation Library [Standard] — https://quaternius.itch.io/universal-animation-library | Quaternius | CC0 1.0 | Reasignadas al esqueleto MPFB con `juego/tools/blender/retarget.py`; renombradas |
| Héroe realista (cuerpo, piel 2K, ojos, cejas, pestañas, pelo `ponytail01`, esqueleto `game_engine` con dedos de 3 falanges) | `personajes/heroe.glb` | MakeHuman system assets (`makehuman_system_assets_cc0.zip`) vía MPFB 2.0.18, generado por `juego/tools/blender/heroe.py` | Comunidad MakeHuman | CC0 1.0 | Proporciones propias; alfa OPAQUE/MASK; clips del caballero (Quaternius UAL, CC0) reasignados con `retarget.py` |
| Ropa del héroe (túnica, sobretúnica con faldón, pantalón, botas, brazales, hombrera, fajín, cinturón) | `personajes/heroe.glb` | Propia (`juego/tools/blender/heroe_equipo.py`, conchas derivadas del cuerpo) con texturas Poly Haven `rough_linen`, `hessian_230`, `caban`, `brown_leather` (1K) — https://polyhaven.com | Proyecto Fénix / Poly Haven | Propia / CC0 1.0 | Tinte horneado en la textura de color |
| Espada híbrida katana + sable de luz enfundada, hebilla y bolsillos del cinturón | `personajes/heroe.glb` | Propia (`juego/tools/blender/heroe_equipo.py`) | Proyecto Fénix | Propia | — |
| Soldado (cuerpo, armadura, pelo, cinturones, vaina, esqueleto y texturas) | `personajes/caballero_soldado.glb` | `the-swordman.zip` → `Provision_UnknowSoldier01_Animate.fbx` + `textures/*_B.png`, `*_S.png`. **Proporcionado por el usuario — origen y licencia por confirmar** (el zip no trae licencia) | Por confirmar | **Por confirmar** | FBX→glTF con FBX2glTF 0.9.7; escalado a 0,95 (≈1,81 m); esqueleto re-enlazado con los nombres y ejes del caballero anterior (`pelvis`, `spine_0x`, `hand_l`…); sin la espada suelta ni el clip `Take 001`; textura de cuerpo 2048 y de vaina 1024 en WebP. Script: `build_caballero.mjs` (ver notas abajo) |
| Animaciones del soldado (reposo, guardia, andar, correr, tajo, martillazo, disparo_arco, conjurar, invocar, hechizo, rodar, golpeado, morir, montado, montado_galope) | `personajes/caballero_soldado.glb` | Las mismas del caballero anterior (`personajes/caballero.glb`, Quaternius UAL CC0 y propias) | Quaternius / Proyecto Fénix | CC0 1.0 / propia | Reasignadas al esqueleto del soldado por re-enlace de las matrices de bind (traslación de pelvis al 90 %). Postura adaptada a las piernas más cortas del soldado: en los clips de pie se reduce la caída de la pelvis (escala por proporción de pierna 0,83 × factor por clip) el apoyo se estrecha en reposo/guardia y las piernas se recolocan con IK de dos huesos con la suela real de las botas a la altura de la de los escarpes anteriores (0 al apoyar); se endereza parte del tronco en reposo/guardia/hechizos y se sube la mirada (cuello/cabeza); montado solo cabeza; rodar y morir sin tocar |
| Caballo pinto con silla, brida y herraduras (malla, esqueleto, texturas PBR y clips `1 Ilde`, `Walk`, `Gallop`) | `animales/caballo_pinto.glb` | `horse.zip` → `Horse.fbx` + `textures/TX_*`. **Proporcionado por el usuario — origen y licencia por confirmar** (el zip no trae licencia) | Por confirmar | **Por confirmar** | FBX→glTF con FBX2glTF; escala a metros; solo 3 clips (renombrados `caballo_reposo`, `caballo_paso`, `caballo_galope`; `caballo_trote` = copia del galope) remuestreados; texturas a WebP (pelaje 2048, resto 1024/512); nodo `silla_asiento` añadido. Script: `build_caballo.mjs` |

Para regenerar (sin Blender; Node con `fbx2gltf`, `@gltf-transform/*`, `three` y `sharp` instalados en una carpeta temporal, nunca en el sistema):
`FBX2glTF -b --anim-framerate bake30 -i <fbx> -o <raw>` y después
`node juego/tools/assets/build_caballero.mjs juego/public/assets/personajes/caballero.glb <soldado_raw.glb> <_B.png grande> <_S.png> juego/public/assets/personajes/caballero_soldado.glb` y
`node juego/tools/assets/build_caballo.mjs <caballo_raw.glb> <carpeta textures> juego/public/assets/animales/caballo_pinto.glb 1`.
Nota: en `the-swordman.zip` el `_S.png` es el color de la espada y la vaina (no specular) y hay dos `_B.png` con el mismo nombre: el bueno es el de 5 MB; el de 70 KB es una copia negra con solo el canal alfa.

**Pendiente:** confirmar con el usuario la procedencia y la licencia de `the-swordman.zip` y `horse.zip` antes de publicar nada con ellos. Si no se pueden usar, se vuelve a `caballero.glb` y `caballo.glb` (no se han borrado).

| Asset | Fichero | Origen | Autor | Licencia | Modificaciones |
|---|---|---|---|---|---|
| Caballo árabe negro con montura (malla, esqueleto y clips `caballo_reposo`, `caballo_paso`, `caballo_trote`, `caballo_galope`) | `animales/caballo.glb` | Propio, generado por `juego/tools/blender/caballo.py` (Blender, sin texturas externas) | Proyecto Fénix | Propia | — |
| Katana (hoja con sori, hamon, hi, kissaki; tsuba, habaki, seppa, fuchi, tsuka con ito, menuki, kashira) | `armas/katana.glb` | Propia, generada por `juego/tools/blender/katana.py` (Blender 4.2, sin interfaz) | Proyecto Fénix | Propia | Geometria y texturas de hoja, ito y tsuka procedurales (numpy). Hierro y laton derivan de Poly Haven `metal_plate_02` (https://polyhaven.com/a/metal_plate_02, CC0 1.0; Diffuse/normal/ARM a 512 px, teñidos), WebP. ~42 k triangulos |

Para regenerar: `bash scripts/instalar-blender.sh` y después
`/home/user/tools/blender-4.2.9-linux-x64/blender -b -P juego/tools/blender/caballero.py -- juego/public/assets/personajes/caballero.glb <dir texturas Poly Haven> - <UAL1_Standard.glb>`
(el tercer argumento es la ruta del render de muestra, o `-` para omitirlo).
(MPFB y el pack CC0 de MakeHuman deben estar instalados; ver `juego/tools/blender/mpfb_setup.py`).

Katana: `/home/user/tools/blender-4.2.9-linux-x64/blender -b -P juego/tools/blender/katana.py -- juego/public/assets/armas/katana.glb [preview.png] [dir texturas Poly Haven]`.
