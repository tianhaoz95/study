#!/usr/bin/env bash
# Usage: ./scripts/start.sh
#
# Starts Firebase emulators and dev servers for all apps (blog, home, subscribe, admin).
# Press Ctrl+C (or send SIGTERM) to stop all services gracefully.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PIDS=()

cleanup() {
  echo ""
  echo "Stopping all dev servers and emulators..."

  # Kill the processes in PIDS and wait for them
  for pid in "${PIDS[@]}"; do
    kill -TERM "$pid" 2>/dev/null || true
  done

  # Give processes a moment to forward the signal to their children
  sleep 1.5

  # Kill any vite / astro child processes still running
  pkill -TERM -f "vite --port 4322" 2>/dev/null || true
  pkill -TERM -f "vite --port 4323" 2>/dev/null || true
  pkill -TERM -f "vite --port 4324" 2>/dev/null || true
  pkill -TERM -f "astro dev --port 4321" 2>/dev/null || true

  # Kill emulator ports via TERM
  for port in 8085 8086 9095 4005; do
    lsof -ti ":$port" 2>/dev/null | xargs kill -TERM 2>/dev/null || true
  done

  sleep 1

  # Final sweep: force-kill anything still holding the dev or emulator ports
  for port in 4321 4322 4323 4324 8085 8086 9095 4005; do
    lsof -ti ":$port" 2>/dev/null | xargs kill -KILL 2>/dev/null || true
  done

  # Wait for background jobs to finish
  for pid in "${PIDS[@]}"; do
    wait "$pid" 2>/dev/null || true
  done

  echo "All services stopped."
  exit 0
}

trap cleanup INT TERM

# Clear any stale processes on the dev/emulator ports before starting
for port in 4321 4322 4323 4324 8085 8086 9095 4005; do
  lsof -ti ":$port" 2>/dev/null | xargs kill -KILL 2>/dev/null || true
done

# Start Firebase Emulators
echo "Starting Firebase emulators..."
npx -y firebase-tools@latest emulators:start &
EMU_PID=$!
PIDS+=($EMU_PID)

# Wait for emulator to be ready (checking Auth emulator port 9095)
echo "Waiting for Firebase emulators to start..."
for i in {1..30}; do
  if lsof -i :9095 >/dev/null 2>&1; then
    echo "Firebase emulators are ready."
    break
  fi
  sleep 1
done

# Helper: install deps if node_modules is missing, then start dev server
start_app() {
  local app_dir="$1"
  local port="$2"
  local name
  name="$(basename "$app_dir")"

  if [ ! -d "$app_dir/node_modules" ] || { [ "$name" = "blog" ] && [ ! -d "$app_dir/node_modules/@study/tts" ]; }; then
    echo "Installing dependencies for $name..."
    (cd "$app_dir" && npm install) || {
      echo "ERROR: npm install failed for $name" >&2
      return 1
    }
  fi

  echo "Starting $name on port $port..."
  (cd "$app_dir" && npm run dev -- --host 0.0.0.0 --port "$port") &
  PIDS+=($!)
}

start_app "$REPO_ROOT/apps/blog"      4321
start_app "$REPO_ROOT/apps/home"      4322
start_app "$REPO_ROOT/apps/subscribe" 4323
start_app "$REPO_ROOT/apps/admin"     4324

echo ""
echo "All services starting up:"
echo "  Firebase Emulator UI → http://localhost:4005"
echo "  Blog                 → http://localhost:4321"
echo "  Home                 → http://localhost:4322"
echo "  Subscribe            → http://localhost:4323"
echo "  Admin                → http://localhost:4324"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for all background jobs
wait
