#!/usr/bin/env bash
# Usage: ./scripts/start.sh
#
# Starts dev servers for all three apps (blog, home, subscribe).
# Press Ctrl+C (or send SIGTERM) to stop all servers gracefully.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PIDS=()

cleanup() {
  echo ""
  echo "Stopping all dev servers..."

  # Kill the npm wrapper processes and wait for them
  for pid in "${PIDS[@]}"; do
    kill -TERM "$pid" 2>/dev/null || true
  done

  # Give npm a moment to forward the signal to its children
  sleep 1

  # Kill any vite / astro child processes still running
  pkill -TERM -f "vite --port 4322" 2>/dev/null || true
  pkill -TERM -f "vite --port 4323" 2>/dev/null || true
  pkill -TERM -f "astro dev --port 4321" 2>/dev/null || true

  sleep 1

  # Final sweep: force-kill anything still holding the dev ports
  for port in 4321 4322 4323; do
    lsof -ti ":$port" 2>/dev/null | xargs kill -KILL 2>/dev/null || true
  done

  # Wait for background jobs to finish
  for pid in "${PIDS[@]}"; do
    wait "$pid" 2>/dev/null || true
  done

  echo "All servers stopped."
  exit 0
}

trap cleanup INT TERM

# Helper: install deps if node_modules is missing, then start dev server
start_app() {
  local app_dir="$1"
  local port="$2"
  local name
  name="$(basename "$app_dir")"

  if [ ! -d "$app_dir/node_modules" ]; then
    echo "Installing dependencies for $name..."
    (cd "$app_dir" && npm install) || {
      echo "ERROR: npm install failed for $name" >&2
      return 1
    }
  fi

  echo "Starting $name on port $port..."
  (cd "$app_dir" && npm run dev -- --port "$port") &
  PIDS+=($!)
}

start_app "$REPO_ROOT/apps/blog"      4321
start_app "$REPO_ROOT/apps/home"      4322
start_app "$REPO_ROOT/apps/subscribe" 4323

echo ""
echo "Dev servers starting up:"
echo "  Blog      → http://localhost:4321"
echo "  Home      → http://localhost:4322"
echo "  Subscribe → http://localhost:4323"
echo ""
echo "Press Ctrl+C to stop all servers."

# Wait for all background jobs
wait
