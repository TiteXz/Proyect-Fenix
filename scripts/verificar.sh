#!/usr/bin/env bash
# Verificación completa: lo único que autoriza a marcar una feature como `passes: true`.
#   bash scripts/verificar.sh          → typecheck + lint + unit + build + e2e
#   bash scripts/verificar.sh --rapido → typecheck + unit (para orientarse al inicio de sesión)
set -uo pipefail
cd "$(dirname "$0")/../juego"

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
