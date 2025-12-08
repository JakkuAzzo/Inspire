#!/usr/bin/env bash
#!/usr/bin/env bash

if [[ -z "${BASH_VERSION:-}" ]]; then
  exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

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

kill_port 3001
kill_port 8080

echo "Starting Inspire backend on :3001"
npm run dev --prefix backend &
PIDS+=($!)

# Give the backend a short moment to boot before starting the frontend proxy
sleep 2

echo "Starting Inspire frontend on http://0.0.0.0:8080"
npm run dev --prefix frontend -- --host 0.0.0.0 --port 8080 --strictPort &
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
