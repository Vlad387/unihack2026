#!/usr/bin/env bash
# Run the CityMind API on this laptop, public through a Cloudflare quick tunnel.
#   website: https://citymind-iota.vercel.app (Vercel)  ->  API: this laptop  ->  DB: Supabase
# Safe to run again (e.g. after a reboot): starts only what isn't running, and if the
# tunnel address changed it updates the Vercel env vars and redeploys the website.
# Private config in ~/.config/citymind (never in git): supabase_url, organizer_token.
# shortcut: quick tunnel = random address per restart; a named tunnel needs a domain.
set -euo pipefail
cfg=~/.config/citymind
repo=$(cd "$(dirname "$0")/.." && pwd)
site=https://citymind-iota.vercel.app

if ! curl -sf localhost:8000/health >/dev/null; then
  echo "starting API (Supabase)…"
  # redirect the whole group and exec: nothing keeps this script's stdout open
  (cd "$repo/backend" && DATABASE_URL="$(cat $cfg/supabase_url)" \
    ORGANIZER_TOKEN="$(cat $cfg/organizer_token)" \
    CORS_ORIGINS="$site,http://localhost:3000" \
    exec setsid nohup uv run uvicorn app.main:app --host 127.0.0.1 --port 8000) \
    >"$cfg/api.log" 2>&1 </dev/null &
  for _ in $(seq 120); do curl -sf localhost:8000/health >/dev/null && break; sleep 1; done
fi
echo "API: $(curl -s localhost:8000/health/db)"

if ! pgrep -f "cloudflared tunnel --no-autoupdate --url http://localhost:8000" >/dev/null; then
  echo "starting tunnel…"
  : >"$cfg/tunnel.log"
  setsid nohup ~/.local/bin/cloudflared tunnel --no-autoupdate --url http://localhost:8000 \
    >"$cfg/tunnel.log" 2>&1 </dev/null &
  for _ in $(seq 60); do grep -q 'trycloudflare.com' "$cfg/tunnel.log" && break; sleep 1; done
fi
url=$(grep -o -m1 'https://[a-z0-9-]*\.trycloudflare\.com' "$cfg/tunnel.log")
echo "tunnel: $url"

if [ "$url" != "$(cat $cfg/api_url 2>/dev/null)" ]; then
  echo "tunnel address changed: updating Vercel and redeploying the website…"
  cd "$repo/frontend"
  for pair in "NEXT_PUBLIC_API_URL|$url" "NEXT_PUBLIC_WS_URL|wss://${url#https://}/ws"; do
    npx --yes vercel@65 env rm "${pair%%|*}" production --yes >/dev/null 2>&1 || true
    echo -n "${pair#*|}" | npx --yes vercel@65 env add "${pair%%|*}" production >/dev/null
  done
  "$repo/deploy/vercel-deploy.sh" >/dev/null
  echo "$url" >"$cfg/api_url"
fi
echo "ready: $site  (API $url)"
