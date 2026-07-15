#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load optional .env overrides
if [ -f "$ROOT_DIR/.env" ]; then
  set -a; source "$ROOT_DIR/.env"; set +a
fi

DOMAIN="${DOMAIN:-213-199-50-129.sslip.io}"

echo "Deploying Property Management apps with Caddy + sslip.io"
echo
echo "  Caddy URLs:"
echo "    https://pm.${DOMAIN}        (Web frontend)"
echo "    https://pmapi.${DOMAIN}     (Backend API)"
echo "    https://pmadmin.${DOMAIN}   (Mobile Admin)"
echo "    https://pmhost.${DOMAIN}    (Mobile Host)"
echo "    https://pmkiosk.${DOMAIN}   (Mobile Kiosk)"
echo

# Start the project containers (Caddy included)
docker compose -f "$ROOT_DIR/docker-compose.yml" up --build -d

echo
echo "✅ Deployed! Caddy is running as part of the stack."
echo "  Caddy will automatically provision SSL certificates for:"
echo "    https://pm.${DOMAIN}"
echo "    https://pmapi.${DOMAIN}"
echo "    https://pmadmin.${DOMAIN}"
echo "    https://pmhost.${DOMAIN}"
echo "    https://pmkiosk.${DOMAIN}"
echo
echo "  To view logs:  docker compose logs -f"
echo "  To stop:       docker compose down"
