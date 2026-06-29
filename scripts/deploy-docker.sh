#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Deploying Property Management apps (random host ports, use 'docker port <container>' to find them)"
echo
echo "  Caddy URLs:   https://pm.213-199-50-129.sslip.io (and pmapi/pmadmin/pmhost/pmkiosk)"
echo

# Start the project containers
docker compose -f "$ROOT_DIR/docker-compose.yml" up --build -d

# Get the auto-generated network name (e.g. "property_management_default")
NETWORK="$(docker compose -f "$ROOT_DIR/docker-compose.yml" ls --format json 2>/dev/null | python3 -c "
import sys,json
projects=json.load(sys.stdin)
for p in projects:
    if p.get('Name') and p['Name'] in ('property_management','visitormanagement'):
        print(p['Name']+'_default')
        break
" 2>/dev/null)" || true
NETWORK="${NETWORK:-property_management_default}"

# Try to find the actual network
ACTUAL_NETWORK="$(docker inspect "${NETWORK}" --format '{{.Name}}' 2>/dev/null | sed 's|/||')" || true
if [ -z "$ACTUAL_NETWORK" ]; then
  # Fall back to docker compose default naming
  COMPOSE_PROJECT="$(basename "$ROOT_DIR" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')"
  ACTUAL_NETWORK="${COMPOSE_PROJECT}_default"
fi

echo "Connecting existing Caddy (odoo-caddy-1) to ${ACTUAL_NETWORK}..."
docker network connect "${ACTUAL_NETWORK}" odoo-caddy-1 2>/dev/null || echo "  (already connected or network not found)"

echo "Reloading Caddy configuration..."
docker exec odoo-caddy-1 caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || echo "  (Caddy reload skipped — will pick up changes on restart)"

echo
echo "✅ Deployed! Access your apps at:"
echo "  Web:     https://pm.213-199-50-129.sslip.io"
echo "  API:     https://pmapi.213-199-50-129.sslip.io"
echo "  Admin:   https://pmadmin.213-199-50-129.sslip.io"
echo "  Host:    https://pmhost.213-199-50-129.sslip.io"
echo "  Kiosk:   https://pmkiosk.213-199-50-129.sslip.io"
