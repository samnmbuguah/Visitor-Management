#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ports=(8001 3000 8084 8085 8086)

is_port_taken() {
  local port="$1"

  if ss -lnt 2>/dev/null | awk '{print $4}' | grep -Eq ":${port}$"; then
    return 0
  fi

  if docker ps --format '{{.Ports}}' 2>/dev/null | grep -Eq ":${port}->"; then
    return 0
  fi

  return 1
}

for p in "${ports[@]}"; do
  if is_port_taken "$p"; then
    echo "❌ Error: Port ${p} is already in use (host or Docker)."
    echo "   Free it up, then re-run: bash scripts/deploy-docker.sh"
    exit 1
  fi
done

echo "Using fixed ports:"
echo "  backend:      http://localhost:8001"
echo "  web:          http://localhost:3000"
echo "  mobile-admin: expo start --port 8084 --tunnel"
echo "  mobile-host:  expo start --port 8085 --tunnel"
echo "  mobile-kiosk: expo start --port 8086 --tunnel"
echo

docker compose -f "$ROOT_DIR/docker-compose.yml" up --build
