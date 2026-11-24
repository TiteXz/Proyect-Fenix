#!/usr/bin/env bash
# Regenera los tres sets de estilo (Blender) y sus visores. Uso: bash estilos.sh [w3|fo|dw ...]
# Variables: UAL1, UAL2 (glb Standard de Quaternius, CC0), BLENDER.
set -euo pipefail
cd "$(dirname "$0")"; RAIZ=$(cd ../../.. && pwd)
BLENDER=${BLENDER:-/home/user/tools/blender-4.2.9-linux-x64/blender}
UAL1=${UAL1:?ruta a UAL1_Standard.glb}; UAL2=${UAL2:?ruta a UAL2_Standard.glb}
for e in ${@:-w3 fo dw}; do
  "$BLENDER" -b -P gen_estilo.py -- "$e" "$RAIZ/juego/public/assets/personajes/caballero_soldado.glb" "$UAL1" "$UAL2" "$PWD" | grep -E "^(CLIP|ESTILO|Error|Traceback)" || true
done
cd ..
for e in w3 fo dw; do
  case $e in w3) T="Estilo Witcher 3 (recreación propia)";; fo) T="Estilo Fallen Order (recreación propia)";; dw) T="Estilo Dawnwalker (recreación propia)";; esac
  python3 build_visor.py estilos/estilo_$e.glb estilos/visor_$e.html estilos/estilo_$e.json "$T"
done
