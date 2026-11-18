#!/usr/bin/env bash
# Instala Blender (versión LTS fijada) para generar modelos sin interfaz con scripts de Python.
# Descarga solo de download.blender.org, verifica el SHA-256 oficial y lo deja en /home/user/tools.
# Uso: bash scripts/instalar-blender.sh   → imprime la ruta del ejecutable
set -euo pipefail

VERSION="4.2.9"
SERIE="4.2"
DESTINO="/home/user/tools"
NOMBRE="blender-${VERSION}-linux-x64"
BIN="${DESTINO}/${NOMBRE}/blender"
BASE="https://download.blender.org/release/Blender${SERIE}"

if [ -x "$BIN" ]; then echo "$BIN"; exit 0; fi

mkdir -p "$DESTINO"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -fsSL -A "game-asset-fetch/1.0" -o "$TMP/${NOMBRE}.tar.xz" "${BASE}/${NOMBRE}.tar.xz"
curl -fsSL -A "game-asset-fetch/1.0" -o "$TMP/sums.sha256" "${BASE}/blender-${VERSION}.sha256"

ESPERADO="$(grep " ${NOMBRE}.tar.xz\$" "$TMP/sums.sha256" | awk '{print $1}')"
REAL="$(sha256sum "$TMP/${NOMBRE}.tar.xz" | awk '{print $1}')"
if [ -z "$ESPERADO" ] || [ "$ESPERADO" != "$REAL" ]; then
  echo "✗ La suma SHA-256 no coincide con la oficial; no se instala." >&2
  exit 1
fi

tar -xJf "$TMP/${NOMBRE}.tar.xz" -C "$DESTINO"
echo "$BIN"
