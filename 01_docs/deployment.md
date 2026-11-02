# Deployment

## Overview

HuXa runs on an AWS EC2 instance (Ubuntu 22.04). Code is deployed to `/opt/huxa/`, data lives in `/var/lib/huxa/`, and the FastAPI application is managed by systemd behind an Nginx reverse proxy with Cloudflare in front.

The frontend is an Expo app (`08_app/`) that serves iOS, Android, and web from a single codebase. The web build (`08_app/dist/`) is served by Nginx as static files.

## Server Layout

```
/opt/huxa/              → Application code (git clone target)
  08_app/dist/          → Expo web build (served by Nginx)
  02_backend/           → FastAPI backend
/var/lib/huxa/
    events.jsonl         → Raw event stream
    diary.jsonl          → Structured diary entries
    categories.json      → User-defined event categories
    derived/             → Computed/aggregated data
/var/log/huxa/          → Application logs
/etc/huxa/
    config.json          → Runtime configuration
```

## Local Development

### Prerequisites

- Node.js and npm
- Python 3 with venv
- Expo Go app on iPhone (for mobile testing)
- Xcode (for iOS simulator)

### Dev Server

The dev script starts both the backend and Expo from a single command:

```bash
./05_scripts/dev_server.sh          # Backend + Expo (iOS/Android)
./05_scripts/dev_server.sh --web    # Backend + Expo web (browser)
```

This:
- Runs the backend on `http://localhost:8000` with isolated dev data in `/tmp/huxa_dev/`
- Runs Expo in the foreground (interactive — press `i` for iOS simulator, `w` for web)
- Auto-configures the app to use the local backend via `EXPO_PUBLIC_API_BASE`
- Disables auth (empty `HUXA_AUTH_TOKEN`), so the app needs no token

API keys (e.g. `OPENAI_API_KEY`) are loaded from `02_backend/.env`.

### Building for Web

```bash
cd 08_app
npm run build:web    # outputs to 08_app/dist/
```

## SSH Access

SSH to the server uses the alias `ssh huxa` (configured in `~/.ssh/config`). Two connection methods are available:

- **Tailscale** (`100.98.66.32`) — works from any network. This is the default.
- **Direct EC2** (`54.246.181.20`) — only works from an allowed IP (Cloudflare/security group restricted).

To switch, edit `~/.ssh/config` and uncomment the desired `HostName` line under `Host huxa`.

Tailscale is installed on both the server and the dev Mac. It creates a private mesh network so `fab deploy` and SSH work from any network (hotspot, hotel wifi, etc.).

## Code Deployment

Deploys run on the server itself, from its checkout in `/opt/huxa`, by `05_scripts/deploy.sh` as the `huxadev` user. There are two ways to trigger one.

### From the Mac

```bash
fab deploy
```

Requires `fabric` installed locally (`pipx install fabric`). The task pushes `main`, runs `git pull` and `05_scripts/deploy.sh` on the server, and pulls the resulting dist commit back.

### From the phone

Say "ship it" to the Claude Code session on the server; see `phone-workflow.md`. It bumps the version, updates the changelog, merges the feature branch and runs `deploy.sh`.

### What deploy.sh does

1. Refuses unless run from `/opt/huxa` on a clean `main`
2. Builds the Expo web frontend into `08_app/dist/` (`--clear`, because preview builds share the Metro cache)
3. Commits the build if it changed
4. Installs Python dependencies from `requirements.txt` into the shared venv
5. Refreshes the `huxa-preview@` user unit
6. Runs `/usr/local/sbin/huxa-activate` through sudo: ensures `/var/lib/huxa/attachments/`, installs both nginx sites, `nginx -t`, reloads nginx, restarts `huxa`
7. Pushes `main` and checks `https://huxa.is/health`

`huxa-activate` is the only command `huxadev` may run as root (`/etc/sudoers.d/huxadev`), installed once by `05_scripts/server_ship_setup.sh`.

### Available Commands

| Command | Description |
|---|---|
| `fab deploy` | Push, build and activate on the server, pull back |
| `fab status` | Show huxa service status |
| `fab logs` | Tail last 50 log lines (`--lines=N` for more) |
| `fab restart` | Restart the service |

### Manual Deploy

If needed, SSH in and run:

```bash
ssh huxadev@huxa
cd /opt/huxa && git pull --ff-only && 05_scripts/deploy.sh
```

The repository contains application code and the web build. Data, logs, and configuration are external to the repo.

## systemd Service

The `huxa.service` unit file (in `04_infrastructure/systemd/`) runs Uvicorn:

```ini
[Unit]
Description=HuXa Event Engine
After=network.target

[Service]
Type=simple
User=huxa
Group=huxa
WorkingDirectory=/opt/huxa/02_backend
ExecStart=/opt/huxa/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5
Environment=HUXA_CONFIG=/etc/huxa/config.json

[Install]
WantedBy=multi-user.target
```

Key behaviors:
- Uvicorn binds to `127.0.0.1:8000` (localhost only — Nginx handles external traffic)
- Automatic restart on crash with 5-second delay
- Runs as dedicated `huxa` user for isolation
- Config path passed via environment variable
- Logs go to journald (`journalctl -u huxa`)

### Service Management

```bash
sudo systemctl start huxa
sudo systemctl stop huxa
sudo systemctl restart huxa
sudo systemctl status huxa
journalctl -u huxa -f          # tail logs
```

## Nginx Configuration

Nginx serves the Expo web build as static files and proxies API requests to Uvicorn:

```nginx
server {
    listen 443 ssl;
    server_name huxa.is;

    root /opt/huxa/08_app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /events { proxy_pass http://127.0.0.1:8000; ... }
    location /diary  { proxy_pass http://127.0.0.1:8000; ... }
    location /query  { proxy_pass http://127.0.0.1:8000; ... }
    location /health { proxy_pass http://127.0.0.1:8000; ... }
}
```

Full config in `04_infrastructure/nginx/huxa.conf`.

## Cloudflare Integration

Cloudflare provides:
- **DNS:** `huxa.is` points to the EC2 instance (proxied through Cloudflare)
- **DDoS protection:** Automatic
- **TLS:** Full (strict) mode — Cloudflare terminates client TLS, connects to origin over TLS
- **Caching:** Static assets cached at edge

### Future: Zero Trust

Cloudflare Zero Trust will be added in a future phase to:
- Restrict access to authenticated users
- Add device-based policies
- Enable SSO integration

## Initial Server Setup

```bash
# Create huxa user
sudo useradd -r -s /bin/false huxa

# Create directories
sudo mkdir -p /opt/huxa
sudo mkdir -p /var/lib/huxa/derived
sudo mkdir -p /var/log/huxa
sudo mkdir -p /etc/huxa

# Set ownership
sudo chown huxa:huxa /var/lib/huxa
sudo chown huxa:huxa /var/lib/huxa/derived
sudo chown huxa:huxa /var/log/huxa

# Clone repo
sudo git clone <repo-url> /opt/huxa

# Set up Python venv
sudo python3 -m venv /opt/huxa/venv
sudo /opt/huxa/venv/bin/pip install -r /opt/huxa/02_backend/requirements.txt

# Copy config
sudo cp /opt/huxa/06_config/config.example.json /etc/huxa/config.json
# Edit config with real values

# Install and enable service
sudo cp /opt/huxa/04_infrastructure/systemd/huxa.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable huxa
sudo systemctl start huxa

# Install Nginx config
sudo cp /opt/huxa/04_infrastructure/nginx/huxa.conf /etc/nginx/sites-available/huxa
sudo ln -s /etc/nginx/sites-available/huxa /etc/nginx/sites-enabled/huxa
sudo nginx -t
sudo systemctl reload nginx
```

## Preview Environments

Feature branches can be tested on the server before they are merged. Each worktree under `/opt/huxa-dev/<topic>` can be served at `https://dev-<topic>.huxa.is` with its own backend and its own copy of the data.

- `05_scripts/server_dev_setup.sh` (once, as root): node 22, tmux, swap, the `huxadev` user that owns `/opt/huxa` and `/opt/huxa-dev/`, shared `node_modules`, a GitHub deploy key.
- `05_scripts/server_preview_setup.sh` (once, as root): `/var/lib/huxa-preview/`, `/etc/huxa/preview.env` (token and OpenAI key copied from the production unit), the `huxa-preview@` systemd user unit, the `huxa-preview` nginx site.
- `05_scripts/preview.sh up|down|list` (as `huxadev`): builds the worktree's web app into `/var/lib/huxa-preview/<topic>/www`, copies the production JSONL files on first run, and starts uvicorn on `/var/lib/huxa-preview/<topic>/backend.sock`.

Nginx matches `dev-<topic>.huxa.is` with a regex server name and derives the web root and the backend socket from the name, so no reload is needed per preview. Cloudflare needs a proxied wildcard `*.huxa.is` record; Universal SSL covers one wildcard level, which is why previews are `dev-<topic>` and not `<topic>.dev`. The origin certificate must include `*.huxa.is`. Unknown names under the wildcard get connection closed (`return 444`).

Preview data lives outside `/var/lib/huxa/` so Syncthing never picks it up and `huxadev` cannot write to the production store (the directory is owned by `huxa`, group-writable, and `huxadev` is not in the group).

## Syncthing Sync

Syncthing runs on both the EC2 server and the target Mac. The shared folder is `/var/lib/huxa/`. The Mac receives a continuously updated copy of the full event stream and derived data.

This enables local analysis with Claude CLI, Gemini CLI, and custom scripts.
