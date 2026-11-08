#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is nodig om de demo te starten." >&2
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is nodig. Installeer het met: winget install Cloudflare.cloudflared" >&2
  exit 1
fi

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_DATA="$ROOT/demo-data"
mkdir -p "$DEMO_DATA/projecten" "$DEMO_DATA/herkenning" "$DEMO_DATA/accounts"

CODE="$(node -e "const { randomInt } = require('node:crypto'); const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; console.log(Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join(''))")"
echo "Uitnodigingscode: $CODE"

(
  cd "$ROOT/app"
  export SCORE2SOUND_ACCOUNTS=aan
  export SCORE2SOUND_CODES="$CODE"
  export SCORE2SOUND_HTTPS=aan
  export SCORE2SOUND_PROJECTEN="$DEMO_DATA/projecten"
  export SCORE2SOUND_HERKENNING="$DEMO_DATA/herkenning"
  export SCORE2SOUND_ACCOUNTSMAP="$DEMO_DATA/accounts"
  npm start
) &
APP_PID=$!
TUNNEL_PID=

cleanup() {
  trap - EXIT INT TERM
  if [[ -n "$TUNNEL_PID" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
  if kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null || true
  fi
  if [[ -n "$TUNNEL_PID" ]]; then
    wait "$TUNNEL_PID" 2>/dev/null || true
  fi
  wait "$APP_PID" 2>/dev/null || true
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "De tijdelijke https-link verschijnt in de uitvoer van cloudflared."
cloudflared tunnel --url http://localhost:5175 &
TUNNEL_PID=$!
wait "$TUNNEL_PID"
