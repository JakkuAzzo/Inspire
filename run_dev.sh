#!/usr/bin/env bash

if [[ -z "${BASH_VERSION:-}" ]]; then
  exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

CERTS_DIR="$ROOT_DIR/.certs"
FRONTEND_PORT=3000

# Detect the en0 IP (primary Wi‑Fi/Ethernet on macOS) so the dev server is reachable on the LAN
HOST_IP=$(ipconfig getifaddr en0 2>/dev/null || true)
if [[ -z "$HOST_IP" ]]; then
  echo "Warning: Could not detect en0 IP. Falling back to 0.0.0.0" >&2
  HOST_IP="0.0.0.0"
fi

# Generate self-signed HTTPS certificate if it doesn't exist
setup_https_certs() {
  if [[ ! -f "$CERTS_DIR/cert.pem" ]] || [[ ! -f "$CERTS_DIR/key.pem" ]]; then
    echo "Generating self-signed HTTPS certificate..."
    mkdir -p "$CERTS_DIR"
    openssl req -x509 -newkey rsa:2048 -keyout "$CERTS_DIR/key.pem" -out "$CERTS_DIR/cert.pem" \
      -days 365 -nodes -subj "/CN=localhost" 2>/dev/null || {
      echo "Error: Failed to generate certificate. Make sure OpenSSL is installed." >&2
      return 1
    }
    echo "✓ Self-signed certificate created at $CERTS_DIR"
  fi
}

kill_port() {
  local port=$1
  if ! command -v lsof >/dev/null 2>&1; then
    echo "Unable to free port $port automatically (lsof not available)" >&2
    return
  fi
  local pids
  pids=$(lsof -ti tcp:"$port" || true)
  if [[ -z "$pids" ]]; then
    return
  fi

  echo "Freeing port $port (pids: $pids)"
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    kill "$pid" 2>/dev/null || true
  done <<<"$pids"

  sleep 1

  pids=$(lsof -ti tcp:"$port" || true)
  if [[ -z "$pids" ]]; then
    return
  fi

  echo "Port $port still busy, forcing kill"
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    kill -9 "$pid" 2>/dev/null || true
  done <<<"$pids"
}

wait_for_pid() {
  local pid=$1
  set +e
  wait "$pid" 2>/dev/null
  local status=$?
  set -e
  WAIT_RESULT=$status
  return 0
}

cleanup() {
  for pid in "${PIDS[@]-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait_for_pid "$pid"
    fi
  done
}

handle_signal() {
  cleanup
  exit 0
}

trap handle_signal INT TERM
trap cleanup EXIT

PIDS=()

setup_https_certs || exit 1

kill_port 3001
kill_port "$FRONTEND_PORT"

echo "Starting Inspire backend on :3001"
NODE_ENV=development npm run dev --prefix backend &
PIDS+=($!)

# Give the backend a short moment to boot before starting the frontend proxy
sleep 2

echo "Starting Inspire frontend on https://$HOST_IP:$FRONTEND_PORT"
VITE_CERT_PATH="$CERTS_DIR/cert.pem" VITE_KEY_PATH="$CERTS_DIR/key.pem" npm run dev --prefix frontend -- --host "$HOST_IP" --port "$FRONTEND_PORT" --strictPort &
PIDS+=($!)

while true; do
  for pid in "${PIDS[@]}"; do
    if [[ -z "$pid" ]]; then
      continue
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      wait_for_pid "$pid"
      status=$WAIT_RESULT
      cleanup
      exit "$status"
    fi
  done
  sleep 1
done
