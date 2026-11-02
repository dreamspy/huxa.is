# HuXa Scripts

Utility scripts for working with HuXa's JSONL data files locally.

## Scripts

### dev_server.sh

Start the backend (port 8000) and Expo dev server for local development. Sets up the venv automatically on first run. Data is stored in `/tmp/huxa_dev/` so it won't touch production files.

```bash
./05_scripts/dev_server.sh          # Backend + Expo (iOS/Android — press i for simulator)
./05_scripts/dev_server.sh --web    # Backend + Expo web (http://localhost:8081)
```

Loads `OPENAI_API_KEY` from `02_backend/.env`. Disables auth (empty `HUXA_AUTH_TOKEN`, so neither the backend nor the app needs a token) and overrides data paths to `/tmp/huxa_dev/`. Auto-detects your Mac's LAN IP so all clients (browser, simulator, iPhone on the same WiFi) connect to the local backend. Requires Python 3.13.

### summarize_day.py

Print a summary of all events for a given date — counts by type and a list of entries.

```bash
python summarize_day.py /path/to/events.jsonl 2026-02-14
```

### export_jsonl.py

Export events with optional filtering by type and/or date.

```bash
python export_jsonl.py /path/to/events.jsonl --type Intervention
python export_jsonl.py /path/to/events.jsonl --since 2026-02-01
python export_jsonl.py /path/to/events.jsonl --type Symptom --since 2026-02-01
```

Output is JSONL to stdout, so you can pipe it to a file or `jq`.

### import_diary.py

Batch-import Obsidian diary `.md` files into `diary.jsonl` format. Uses OpenAI (`gpt-4o-mini`) to extract structured fields from free-form markdown.

Requires `OPENAI_API_KEY` in the environment.

```bash
python import_diary.py /path/to/obsidian/diary/ -o diary_import.jsonl
```

The output file can then be appended to the production diary:

```bash
cat diary_import.jsonl >> /var/lib/huxa/diary.jsonl
```

### read_events.sh

Quick one-liner to pretty-print `events.jsonl` with `jq`.

```bash
bash read_events.sh
```

### build_desktop.sh

Build the HuXa desktop application using Tauri. First builds the Expo web frontend into `08_app/dist/`, then compiles the native macOS app with `cargo tauri build`.

```bash
./05_scripts/build_desktop.sh              # Full build (Expo web + Tauri)
./05_scripts/build_desktop.sh --skip-web   # Skip Expo web build (use existing dist/)
```

Requires Rust/Cargo and the Tauri CLI (`cargo install tauri-cli`). The built app and installer end up in `09_desktop/src-tauri/target/release/bundle/`.

### setup_shortcuts.sh

Creates convenience symlinks in `~/huxa/` pointing to the server's runtime directories (`/opt/huxa`, `/var/lib/huxa`, `/var/log/huxa`, `/etc/huxa`). Run once on the Ubuntu server after deployment.

```bash
bash setup_shortcuts.sh
```

### server_dev_setup.sh

One-time preparation of the production server for on-server feature development (Claude Code driving worktrees and previews on the box itself). Installs node 22, tmux and a 2 GB swap file, creates the `huxadev` user that owns `/opt/huxa` and `/opt/huxa-dev/` (worktree parent), installs the shared `08_app/node_modules`, runs an Expo export as a memory smoke test, and generates an ssh key to add as a GitHub deploy key with write access. Idempotent; needs a t3.medium or larger.

```bash
ssh huxa 'sudo bash -s' < 05_scripts/server_dev_setup.sh
```

### server_preview_setup.sh

One-time server setup for preview environments, run after `server_dev_setup.sh`. Creates `/var/lib/huxa-preview/` for `huxadev`, writes `/etc/huxa/preview.env` with the auth token and OpenAI key copied from the production unit, installs the `huxa-preview@` systemd user unit and the `huxa-preview` nginx site, and prints the origin certificate's names so you can check it covers `*.huxa.is`. Idempotent.

```bash
ssh huxa 'sudo bash -s' < 05_scripts/server_preview_setup.sh
```

### preview.sh

Runs on the server as `huxadev`. Serves a worktree at `/opt/huxa-dev/<topic>` as `https://dev-<topic>.huxa.is`: builds its web app into `/var/lib/huxa-preview/<topic>/www`, seeds the preview's data with a copy of the production JSONL files (first run only, attachments excluded), and starts its backend as the `huxa-preview@<topic>` user unit on a unix socket. The nginx config is static, so no reload is needed. The topic defaults to the current directory name when run inside a worktree.

```bash
cd /opt/huxa-dev/<topic> && /opt/huxa/05_scripts/preview.sh up    # prints the URL
/opt/huxa/05_scripts/preview.sh list
/opt/huxa/05_scripts/preview.sh down <topic>                       # stops the backend, deletes the preview data
```

### server_ship_setup.sh

One-time server setup for deploying from the box: installs `04_infrastructure/sudo/huxa-activate` to `/usr/local/sbin/` and the sudoers rule that lets `huxadev` run it, nothing else, as root. Re-run after changing `huxa-activate`.

```bash
ssh huxa 'sudo bash -s' < 05_scripts/server_ship_setup.sh
```

### deploy.sh

Runs on the server as `huxadev` from a clean `/opt/huxa` on main. Builds the web app with a cleared Metro cache, commits `08_app/dist` if it changed, installs backend requirements, refreshes the preview unit, runs the root half (`huxa-activate`: nginx sites, reload, backend restart) through sudo, pushes main and checks `/health`. `fab deploy` on the Mac pushes and calls it; the phone workflow's "ship it" calls it directly.

```bash
cd /opt/huxa && 05_scripts/deploy.sh
```

### remote_control.sh

Runs on the server as `huxadev`. Keeps the Claude Code Remote Control server alive inside the `huxa` tmux session: `start` (default) creates the tmux session if needed and launches `claude remote-control` in same-dir spawn mode with the `huxa` name prefix, `restart` and `stop` do what they say, `status` reports both. From the Mac: `ssh huxadev@huxa /opt/huxa/05_scripts/remote_control.sh restart`.
