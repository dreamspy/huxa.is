#!/usr/bin/env bash
# Start the HuXa backend and Expo dev server for local development.
# Data is stored in /tmp/huxa_dev/ so it won't affect production.
#
# Usage:
#   ./dev_server.sh          # Backend + Expo (iOS/Android)
#   ./dev_server.sh --web    # Backend + Expo web

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/02_backend"
APP_DIR="$PROJECT_DIR/08_app"
DATA_DIR="/tmp/huxa_dev"

mkdir -p "$DATA_DIR"

# Set up venv if it doesn't exist
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "Creating virtual environment..."
    python3.13 -m venv "$BACKEND_DIR/venv"
    "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

# Load .env if it exists, otherwise use defaults
if [ -f "$BACKEND_DIR/.env" ]; then
    set -a
    source "$BACKEND_DIR/.env"
    set +a
fi

export HUXA_AUTH_TOKEN="dev-token"
export HUXA_EVENTS_FILE="$DATA_DIR/events.jsonl"
export HUXA_DIARY_FILE="$DATA_DIR/diary.jsonl"
export HUXA_FEEDBACK_FILE="$DATA_DIR/feedback.jsonl"
# Detect LAN IP so iPhone can reach the backend
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "127.0.0.1")

export EXPO_PUBLIC_API_BASE="http://$LAN_IP:8000"
export EXPO_PUBLIC_AUTH_TOKEN="$HUXA_AUTH_TOKEN"

MODE="expo"
if [ "${1:-}" = "--web" ]; then
    MODE="web"
fi

echo "Backend:  http://$LAN_IP:8000"
if [ "$MODE" = "web" ]; then
    echo "Frontend: http://localhost:8081 (Expo web)"
else
    echo "Frontend: Expo Go (scan QR code)"
fi
echo "Token:    $HUXA_AUTH_TOKEN"
echo "Data dir: $DATA_DIR"
echo ""

# Start backend in background (bind to 0.0.0.0 so iPhone can connect)
"$BACKEND_DIR/venv/bin/uvicorn" app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir "$BACKEND_DIR" &
BACKEND_PID=$!

cleanup() {
    kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Start Expo in foreground (interactive — press i for iOS, w for web, etc.)
if [ "$MODE" = "web" ]; then
    cd "$APP_DIR" && npx expo start --web
else
    cd "$APP_DIR" && npx expo start
fi
