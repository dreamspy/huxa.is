# CLAUDE.md — Instructions for AI Agents Working on HuXa

## Hard Rules

1. **Do NOT introduce a database in v1.** Storage is a single append-only JSONL file. This is a locked decision.
2. **Do NOT break append-only design.** Never edit, overwrite, or delete lines in `events.jsonl`. Only append.
3. **Always use UTC timestamps.** ISO 8601 with `Z` suffix. No local timezones.
4. **Never overwrite raw events.** If you need computed or aggregated data, write it to `/var/lib/huxa/derived/`.
5. **Derived data lives in `/var/lib/huxa/derived/`.** Never mix derived data with the raw event stream.
6. **Keep the backend minimal.** FastAPI + Uvicorn. No unnecessary middleware, no complex patterns.
7. **Avoid unnecessary abstractions.** No base classes, factories, or patterns that don't solve an immediate problem.
8. **No Docker.** The app runs directly on Ubuntu via systemd.
9. **No ORM.** There is no database. Do not introduce SQLAlchemy, Tortoise, or any ORM.
10. **Respect the runtime layout.** Code in `/opt/huxa/`, data in `/var/lib/huxa/`, logs in `/var/log/huxa/`, config in `/etc/huxa/`.
11. **Keep migration path clean.** The event schema should map cleanly to a future Postgres table. Don't add fields or structures that would complicate migration.
12. **Prefer clarity over cleverness.** Simple, readable code. No magic.

## Architecture Context

- Single-user system
- Production server: `huxa.is`
- File-based event store (JSONL)
- FastAPI backend served by Uvicorn behind Nginx behind Cloudflare
- systemd manages the process
- Syncthing syncs `/var/lib/huxa/` to Mac for local AI analysis
- Phase 1 auth is simple bearer token. An empty `HUXA_AUTH_TOKEN` disables auth (local dev only): `/health` reports `auth_required: false` and the app skips the token screen
- Event categories are user-defined, stored in `/var/lib/huxa/categories.json`, managed in-app via `GET/PUT /categories` (add, toggle, reorder, delete). Historical events are unaffected by category changes; they store the type string directly.
- `POST /query` has three effort tiers (`low`, `mid`, `high`, default `mid`) mapped to OpenAI models in `QUERY_MODELS` in `02_backend/app/main.py`. Measured speed and accuracy are in `02_backend/README.md`; re-run that benchmark before changing the tier models.
- `POST /transcribe` takes a multipart audio clip and returns text via OpenAI (`TRANSCRIBE_MODEL` in `02_backend/app/main.py`). The app's mic button inside the text fields (compose, diary text answers, Ask HuXa) records with the browser's MediaRecorder, shows a level graph with cancel and stop, stops itself after 5 minutes, and appends the result to the field. Quick log on the home screen dictates, saves an Event straight away and shows the transcript with an Edit button. Web only for now, native shows no button.
- Categories can define structured fields (`scale` 1–10, `number`, `boolean`, `text`). Field values are stored in `event.metrics` keyed by field key. The diary is separate and stays hardcoded (rolling daily questions).

## Event Schema (v1)

```json
{
  "id": "uuid-v4",
  "client_timestamp": "ISO8601 UTC with Z",
  "received_at": "ISO8601 UTC with Z",
  "type": "category key (user-defined; defaults: Event, Intervention, Symptom, Decision, Thought)",
  "text": "string",
  "metrics": {},
  "meta": { "version": 1 }
}
```

## When Making Changes

- Read existing code before modifying it.
- Do not add features that weren't requested.
- Do not refactor working code unless asked.
- Do not add Docker support.
- Do not add database support.
- Do not add complex auth flows — phase 1 is bearer token.
- Test changes against the actual JSONL append workflow.
- **Keep ALL docs in sync.** When implementing a feature, fixing a bug, or making any meaningful change, update all relevant files in the same commit: READMEs (`README.md`, `02_backend/README.md`, `05_scripts/README.md`), docs in `01_docs/`, `ROADMAP.md` (tick off completed items), and `CLAUDE.md` if architecture or rules change. If you add, remove, or change a script, endpoint, feature, or config option, every affected doc must reflect it.
- **Bump version before each deploy.** Version lives in `08_app/App.js` (`APP_VERSION`). Before deploying (not every commit), ask the user which digit to increment: major (1st), minor (2nd), or patch (3rd). Multiple commits can share a version.
- **Include version in commit messages.** When the version is bumped, include it in the commit subject, e.g. `"Add feature X (v0.3.0)"`. If no version bump, don't add it.
- **Expo is the sole frontend.** All UI/frontend work goes in `08_app/` (Expo/React Native). Serves iOS, Android, and web from a single codebase.
- **Update CHANGELOG.md before each deploy.** Create a new section header with the version and date, and add bullets describing all changes since the last deploy.
- **Archive completed roadmap phases.** When all items in a `ROADMAP.md` phase are done, move it to the Archive section at the bottom (below the `---` separator).

## File Paths

| Path | Purpose |
|---|---|
| `02_backend/app/main.py` | FastAPI app entry point |
| `02_backend/app/routes/` | API route modules |
| `02_backend/app/models/` | Pydantic models |
| `04_infrastructure/systemd/huxa.service` | systemd unit file |
| `04_infrastructure/nginx/huxa.conf` | Nginx site config |
| `05_scripts/dev_server.sh` | Local dev server (backend + Expo) |
| `06_config/config.example.json` | Configuration template |
| `07_examples/events.example.jsonl` | Example event data |
| `08_app/App.js` | Expo app (main source file) |
| `08_app/Tetris.js` | Hidden Tetris game, opened by long-pressing the version number on the home screen; runs without a token |
| `08_app/dist/` | Expo web build (served by Nginx in production) |
| `fabfile.py` | Fabric deploy commands |
| `05_scripts/deploy.sh` | Deploy from the server's checkout (build, activate, push); `fab deploy` calls it |
| `05_scripts/preview.sh` | Serve a server worktree at `https://dev-<topic>.huxa.is` |
| `04_infrastructure/nginx/huxa-preview.conf` | Nginx site for previews (static, regex server name) |
| `04_infrastructure/systemd/huxa-preview@.service` | Preview backend, systemd user unit for `huxadev` |
| `04_infrastructure/sudo/` | Root half of a deploy and the sudoers rule for `huxadev` |
| `CHANGELOG.md` | Version history and release notes |

## Worktree

Base branch: main

Worktrees run in two places: on the Mac (main checkout `~/Programming/huxa.is`) and on the server (main checkout `/opt/huxa`, user `huxadev`, driven from the phone through Remote Control). Tell them apart by the checkout path.

### On the server

Worktree path is `/opt/huxa-dev/<topic>`, not a sibling of the checkout:
    git -C /opt/huxa worktree add /opt/huxa-dev/<topic> -b <feat|fix>/<topic> main
Bootstrap (run from inside the worktree):
    cp -al /opt/huxa/08_app/node_modules 08_app/node_modules
    ln -s /opt/huxa/02_backend/venv 02_backend/venv
Dev server: none. Previews are static builds served by nginx. From inside the worktree:
    /opt/huxa/05_scripts/preview.sh up
prints `https://dev-<topic>.huxa.is`. Run it again after every change the user should see; a build takes about half a minute and nothing hot-reloads. The preview backend runs on a copy of production data taken on the first `up`, with the production token. Give the user the URL in the Test it section.
Tests, safe beside other sessions: none, there is no test suite. Check the preview on the phone or with curl against the URL.
Tests, full (integrator only): none.
Do not: write under `/var/lib/huxa`; edit or commit in `/opt/huxa` except in the Ship step; install into `/opt/huxa/08_app/node_modules` or the shared venv (give the worktree its own venv if a backend dependency changes); run `deploy.sh` from a worktree.

Ship. Sessions on the server are spawned from the Claude app by `claude remote-control` running in `/opt/huxa`: the pre-created session there is the integrator, every other session is a feature session that hands over as the skill describes. The integrator is told `ship <topic>`, with or without the handover block; without it, the branch is the one checked out in `/opt/huxa-dev/<topic>` (`git worktree list`) and the merge subject is written from its commits. A feature session told to ship may do these steps itself when it is the only session. Steps:
1. Ask which version digit to bump. On the branch, set `APP_VERSION` in `08_app/App.js`, add the `CHANGELOG.md` section, commit as "Bump to vX.Y.Z".
2. In `/opt/huxa`: `git merge --no-ff <branch> -m "Merge <branch>: <what it does> (vX.Y.Z)"`.
3. `05_scripts/deploy.sh`. It builds the web app, commits dist, installs requirements, restarts the backend through sudo and pushes main.
4. `/opt/huxa/05_scripts/preview.sh down <topic>`, then `git worktree remove /opt/huxa-dev/<topic>` and `git branch -d <branch>`.
5. Tell the user to reload huxa.is and what to check there.

### On the Mac

Bootstrap a fresh worktree (run from inside it; `../huxa.is` is the main checkout):
    cp -Rc ../huxa.is/08_app/node_modules 08_app/node_modules
    ln -s ../../huxa.is/02_backend/venv 02_backend/venv
`cp -Rc` is an instant APFS clone. Copy rather than symlink: Metro only watches the project root, and a symlinked `node_modules` resolves to files outside it.
Dev server (the main checkout uses 8000 for the backend and 8081 for Expo web, via `05_scripts/dev_server.sh`):
    HUXA_EVENTS_FILE=<data dir>/events.jsonl HUXA_DIARY_FILE=<data dir>/diary.jsonl HUXA_FEEDBACK_FILE=<data dir>/feedback.jsonl HUXA_CATEGORIES_FILE=<data dir>/categories.json HUXA_ATTACHMENTS_DIR=<data dir>/attachments 02_backend/venv/bin/uvicorn app.main:app --app-dir 02_backend --port <backend port>
    cd 08_app && CI=1 EXPO_PUBLIC_API_BASE=http://localhost:<backend port> npx expo start --web --port <web port>
`CI=1` stops Expo from opening a browser; it also turns off Metro file watching, so restart Expo after editing `App.js`.
Use a data dir of your own, not `/tmp/huxa_dev` (the main dev server writes there). The backend's CORS list only allows `http://localhost:8081`, so an Expo server on another port needs the backend started through a wrapper that adds its origin:
    from app.main import app
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
    app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:<web port>"], allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])
    uvicorn.run(app, port=<backend port>)
With `HUXA_AUTH_TOKEN` unset (as above, and as `dev_server.sh` does) no token is needed anywhere. To reproduce production, add `HUXA_AUTH_TOKEN=dev-token` to the backend command and either enter it in Settings or add `EXPO_PUBLIC_AUTH_TOKEN=dev-token` to the Expo command.
Tests, safe beside other sessions: none, there is no test suite. Check the change in the browser on your own port.
Tests, full (integrator only): none.
Do not: run `fab` deploy tasks or build `08_app/dist` from a worktree; touch `/var/lib/huxa` or the synced `~/HuXa-data`; install into the main checkout's `node_modules` or `venv`.
Deploying from the Mac: `fab deploy` pushes main and runs `05_scripts/deploy.sh` on the server, which builds the web app there and pushes the dist commit back; the task ends with a `git pull`.
