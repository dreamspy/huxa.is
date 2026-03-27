#!/usr/bin/env bash
# Build the HuXa desktop application (Tauri + Expo web).
#
# Steps:
#   1. Build the Expo web frontend into 08_app/dist/
#   2. Run `cargo tauri build` to produce the native desktop app
#
# Usage:
#   ./build_desktop.sh           # Full build (frontend + Tauri)
#   ./build_desktop.sh --skip-web  # Skip Expo web build (use existing dist/)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_DIR="$PROJECT_DIR/08_app"
TAURI_DIR="$PROJECT_DIR/09_desktop/src-tauri"

SKIP_WEB=false
if [ "${1:-}" = "--skip-web" ]; then
    SKIP_WEB=true
fi

# Step 1: Build Expo web
if [ "$SKIP_WEB" = false ]; then
    echo "==> Building Expo web frontend..."
    cd "$APP_DIR"
    npx expo export --platform web
    echo "==> Expo web build complete: $APP_DIR/dist/"
else
    echo "==> Skipping Expo web build (using existing dist/)"
    if [ ! -d "$APP_DIR/dist" ]; then
        echo "Error: $APP_DIR/dist/ does not exist. Run without --skip-web first."
        exit 1
    fi
fi

# Step 2: Build Tauri desktop app
echo "==> Building Tauri desktop application..."
cd "$TAURI_DIR"
cargo tauri build

echo ""
echo "==> Desktop build complete!"
echo "    Look for the installer in: $TAURI_DIR/target/release/bundle/"
