#!/bin/sh
set -e

trap 'kill $API_PID 2>/dev/null; exit' TERM INT

if [ -n "$DOMAIN" ]; then
  export FRONTEND_URL="https://${DOMAIN}"
  sed -i "s/:8080/${DOMAIN}/" /etc/caddy/Caddyfile
else
  export FRONTEND_URL="http://localhost:8080"
fi

# zoobidoo:start — fork-only: serve a static landing page on a separate apex domain
# (improves URL/Zscaler categorization). No-op upstream: skipped when LANDING_DOMAIN is unset.
if [ -n "$LANDING_DOMAIN" ]; then
  cat >> /etc/caddy/Caddyfile <<CADDY

${LANDING_DOMAIN} {
	encode gzip
	root * /srv/landing
	file_server
}
CADDY
  echo "LANDING_DOMAIN=${LANDING_DOMAIN}"
fi
# zoobidoo:end

echo "FRONTEND_URL=${FRONTEND_URL}"
echo "Starting API server..."

/usr/local/bin/api &
API_PID=$!

echo "Waiting for API server..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "API server ready"
    break
  fi
  sleep 1
done

echo "Starting Caddy..."
exec /usr/local/bin/caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
