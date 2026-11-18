#!/usr/bin/env bash
# Descarga three.js 0.147.0 desde npm a prototipo/.three (solo para las pruebas locales sin CDN).
set -euo pipefail
cd "$(dirname "$0")"
[ -f .three/package/build/three.min.js ] && exit 0
mkdir -p .three && cd .three
npm pack three@0.147.0 --silent >/dev/null
tar xzf three-0.147.0.tgz && rm three-0.147.0.tgz
echo "three.js 0.147.0 en prototipo/.three/package"
