#!/usr/bin/env bash
# Reproduce assets/edificios/*.glb desde Sketchfab (CC-BY 4.0). Requiere la API autenticada por proxy, Blender 4.2 (scripts/instalar-blender.sh)
# y `npm i` en esta carpeta. Cache: ./.sketchfab (no se comitea).
# 1) descarga:  python3 -I sketchfab_descargar.py <uid8> ...   (guarda s/<uid>.glb; cambiar dir si se quiere)
# 2) decimar (Blender, preserva UVs):  blender -b -P decimar_blender.py -- in.glb out.glb <tris_solidos> [tris_flores]
# 3) escalar/centrar/WebP:  node procesar_edificios.mjs in.glb out.glb 9999999 <altura_m> <tex_max> <calidad>
set -euo pipefail
B=${BLENDER:-/home/user/tools/blender-4.2.9-linux-x64/blender}; S=${1:-.sketchfab}; O=${2:-../edificios}; mkdir -p "$O" "$S/bl"
d(){ "$B" -b -P decimar_blender.py -- "$S"/$1*.glb "$S/bl/$2.glb" $3 ${4:-}; }
p(){ node procesar_edificios.mjs "$S/bl/$1.glb" "$O/$2.glb" 9999999 $3 $4 $5; }
d 672d14d5 a 14000 1500; p a casa_entramado_a 9.5 768 74
d c0fb208e b 16000;      p b casa_entramado_b 9.5 768 74
d ec32670a c 14000 1500; p c casa_entramado_c 9.0 768 70
d 82cbf472 tudor 11000;  p tudor casa_tudor 8 1024 76
d a8ad9d27 piedra 13000; p piedra casa_piedra 6.9 1024 76
d ea7f8c28 granero 11000; p granero granero 6.5 1024 76
d b987b82f torre 8000;   p torre torre_piedra 11 1024 76
d 885951c7 pozo 4500;    p pozo pozo_piedra 2.6 512 76
d f536745f carro 6000;   p carro carro 1.6 512 76
node procesar_edificios.mjs "$S"/a13b6ace*.glb "$O/casa_rustica.glb" 9999999 7 512 72
