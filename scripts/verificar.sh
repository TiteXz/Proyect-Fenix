#!/usr/bin/env bash
# Verificación completa: lo único que autoriza a marcar una feature como `passes: true`.
#   bash scripts/verificar.sh          → typecheck + lint + unit + build + e2e
#   bash scripts/verificar.sh --rapido → typecheck + unit (para orientarse al inicio de sesión)
set -uo pipefail
cd "$(dirname "$0")/../juego"

# Créditos: cada asset de public/assets debe tener su entrada en CREDITOS.md (CC-BY obliga a atribuir).
# Falta de entrada ⇒ fallo. Licencia «Por confirmar» ⇒ aviso (no publicar hasta confirmarla).
FALLOS_CREDITOS=0
if [ -d public/assets ]; then
  while IFS= read -r f; do
    rel="${f#public/assets/}"
    if ! grep -qF "$rel" public/assets/CREDITOS.md 2>/dev/null; then
      echo "✗ créditos: $rel no aparece en public/assets/CREDITOS.md"; FALLOS_CREDITOS=$((FALLOS_CREDITOS + 1))
    elif grep -F "$rel" public/assets/CREDITOS.md | grep -qi 'por confirmar'; then
      echo "⚠ créditos: $rel tiene la licencia por confirmar"
    fi
  done < <(find public/assets -type f \( -iname '*.glb' -o -iname '*.gltf' -o -iname '*.ktx2' -o -iname '*.hdr' \
             -o -iname '*.exr' -o -iname '*.ogg' -o -iname '*.mp3' -o -iname '*.wav' -o -iname '*.woff2' \) | sort)
  [ "$FALLOS_CREDITOS" -eq 0 ] || { echo "✗ $FALLOS_CREDITOS asset(s) sin créditos"; exit 1; }
fi

if [ ! -f package.json ]; then
  echo "juego/ aún no tiene package.json: nada que verificar (pendiente F-001)."
  exit 0
fi
[ -d node_modules ] || npm install --no-audit --no-fund

FALLOS=0
paso() {
  local nombre="$1"; shift
  printf "▶ %-10s " "$nombre"
  if salida=$("$@" 2>&1); then
    echo "✓"
  else
    echo "✗"; echo "$salida" | tail -n 30; FALLOS=$((FALLOS + 1))
  fi
}
tiene() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)"; }

tiene typecheck && paso typecheck npm run -s typecheck
tiene test      && paso unit      npm run -s test -- --run

if [ "${1:-}" != "--rapido" ]; then
  tiene lint     && paso lint  npm run -s lint
  tiene build    && paso build npm run -s build
  tiene test:e2e && paso e2e   npm run -s test:e2e
fi

if [ "$FALLOS" -eq 0 ]; then echo "✓ VERIFICACIÓN OK"; else echo "✗ $FALLOS paso(s) fallidos"; exit 1; fi
