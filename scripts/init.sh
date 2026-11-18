#!/usr/bin/env bash
# Arranca el entorno de desarrollo de forma idéntica en cada sesión.
# Lo mantiene el agente `arquitecto` alineado con los scripts npm reales.
set -euo pipefail
cd "$(dirname "$0")/../juego"

if [ ! -f package.json ]; then
  echo "juego/ aún no tiene package.json (falta la feature de scaffolding F-001)."
  exit 0
fi

[ -d node_modules ] || npm install --no-audit --no-fund
npx playwright install chromium >/dev/null 2>&1 || true

PUERTO="${PUERTO:-5173}"
if ! curl -sf "http://localhost:$PUERTO" >/dev/null 2>&1; then
  nohup npm run dev -- --port "$PUERTO" --strictPort > ../.dev-server.log 2>&1 &
  echo $! > ../.dev-server.pid
  for _ in $(seq 1 30); do
    curl -sf "http://localhost:$PUERTO" >/dev/null 2>&1 && break
    sleep 1
  done
fi
curl -sf "http://localhost:$PUERTO" >/dev/null && echo "✓ Servidor dev en http://localhost:$PUERTO" \
  || { echo "✗ El servidor dev no arrancó; mira .dev-server.log"; exit 1; }
