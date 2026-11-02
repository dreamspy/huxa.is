# Development Guide

## Prerequisites

- Node.js and npm
- Python 3.13 with venv
- Xcode (for iOS simulator)
- Expo Go app on iPhone (for testing on device)
- Fabric (`pipx install fabric`) for deploying

## Running Locally

The dev server script starts both the FastAPI backend and Expo from a single command:

```bash
./05_scripts/dev_server.sh          # Backend + Expo (iOS/Android)
./05_scripts/dev_server.sh --web    # Backend + Expo web (browser)
```

This gives you:
- **Backend** on `http://<LAN_IP>:8000` (bound to `0.0.0.0`) with isolated data in `/tmp/huxa_dev/`
- **Expo** in interactive mode — press `i` to open iOS simulator, `w` for web
- Auth disabled: no bearer token needed, the app goes straight to the home screen
- App configured to talk to local backend via your Mac's LAN IP (not production)
- All clients (browser, simulator, iPhone) connect to the same local backend

API keys (e.g. `OPENAI_API_KEY`) are loaded from `02_backend/.env`.

### Testing on iOS Simulator

1. Run `./05_scripts/dev_server.sh`
2. Press `i` in the Expo terminal to launch the iOS simulator
3. The app connects to the local backend — full local development

### Testing on iPhone

1. Make sure your iPhone is on the same WiFi network as your Mac
2. Run `./05_scripts/dev_server.sh`
3. Scan the QR code with the Expo Go app
4. The app connects to your Mac's local backend — full local development, no production data touched

### Testing in Browser

1. Run `./05_scripts/dev_server.sh --web`
2. Opens `http://localhost:8081` automatically
3. The app connects to `localhost:8000` — full local development

## Making Changes

### Frontend (08_app/)

1. Edit `08_app/App.js` (the hidden Tetris game is in `08_app/Tetris.js`; long-press the version number on the home screen to open it, no token needed)
2. Changes hot-reload automatically in Expo (both simulator and web)
3. Test the change in the relevant screens

### Backend (02_backend/)

1. Edit files in `02_backend/app/`
2. Uvicorn `--reload` picks up changes automatically
3. Test via the frontend or directly with curl:
   ```bash
   curl "http://localhost:8000/events?date=2026-03-23"   # no token needed in dev
   ```

### Building for Web

To build the production web bundle:

```bash
cd 08_app
npm run build:web    # outputs to 08_app/dist/
```

This is done automatically by `fab deploy`, so you usually don't need to run it manually.

### Building for Desktop

To build the native macOS desktop app (Tauri):

```bash
./05_scripts/build_desktop.sh              # Full build (Expo web + Tauri)
./05_scripts/build_desktop.sh --skip-web   # Skip Expo web build if dist/ is fresh
```

Requires Rust/Cargo and the Tauri CLI (`cargo install tauri-cli`). The installer is output to `09_desktop/src-tauri/target/release/bundle/`.

## Deploying

### Quick Deploy

```bash
fab deploy
```

Pushes `main`, then runs `05_scripts/deploy.sh` on the server, which:
1. Builds Expo web (`08_app/dist/`) on the server, with a cleared Metro cache
2. Commits the build if it changed
3. Installs backend requirements
4. Installs the nginx sites, reloads nginx and restarts the backend (root half via `huxa-activate`)
5. Pushes `main`

The task ends with a `git pull` so the Mac gets the dist commit. Nothing is built on the Mac.

### From the phone

Features can also be built, previewed and shipped entirely from the phone: `01_docs/phone-workflow.md`.

### Other Commands

```bash
fab status     # Check if the service is running
fab logs       # Tail last 50 log lines (--lines=100 for more)
fab restart    # Restart without deploying new code
```

### Manual Deploy (if Fabric is unavailable)

```bash
git push origin main
ssh huxadev@huxa "cd /opt/huxa && git pull --ff-only && 05_scripts/deploy.sh"
git pull --ff-only
```

