# Development Guide

## Prerequisites

- Node.js and npm
- Python 3 with venv
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
- **Backend** on `http://localhost:8000` with isolated data in `/tmp/huxa_dev/`
- **Expo** in interactive mode — press `i` to open iOS simulator, `w` for web
- Auth token set to `dev-token` automatically
- App configured to talk to local backend (not production)

API keys (e.g. `OPENAI_API_KEY`) are loaded from `02_backend/.env`.

### Testing on iOS Simulator

1. Run `./05_scripts/dev_server.sh`
2. Press `i` in the Expo terminal to launch the iOS simulator
3. The app connects to `localhost:8000` — full local development

### Testing on iPhone

1. Run `./05_scripts/dev_server.sh`
2. Scan the QR code with the Expo Go app
3. Note: the app will connect to the **production** server (`huxa.is`) because `localhost` on the phone points to the phone itself, not your Mac

### Testing in Browser

1. Run `./05_scripts/dev_server.sh --web`
2. Opens `http://localhost:8081` automatically
3. The app connects to `localhost:8000` — full local development

## Making Changes

### Frontend (08_app/App.js)

1. Edit `08_app/App.js`
2. Changes hot-reload automatically in Expo (both simulator and web)
3. Test the change in the relevant screens

### Backend (02_backend/)

1. Edit files in `02_backend/app/`
2. Uvicorn `--reload` picks up changes automatically
3. Test via the frontend or directly with curl:
   ```bash
   curl -H "Authorization: Bearer dev-token" http://localhost:8000/events?date=2026-03-23
   ```

### Building for Web

To build the production web bundle:

```bash
cd 08_app
npm run build:web    # outputs to 08_app/dist/
```

This is done automatically by `fab deploy`, so you usually don't need to run it manually.

## Deploying

### Quick Deploy

```bash
fab deploy
```

This runs the full pipeline:
1. Builds Expo web (`08_app/dist/`)
2. Commits the build if it changed
3. Pushes to `origin/main`
4. Pulls on the server
5. Copies nginx config and reloads
6. Restarts the backend service

### Other Commands

```bash
fab status     # Check if the service is running
fab logs       # Tail last 50 log lines (--lines=100 for more)
fab restart    # Restart without deploying new code
```

### Manual Deploy (if Fabric is unavailable)

```bash
cd 08_app && npm run build:web && cd ..
git add 08_app/dist && git commit -m "Build web dist"
git push origin main
ssh huxa "cd /opt/huxa && sudo git pull origin main && sudo systemctl restart huxa"
```
