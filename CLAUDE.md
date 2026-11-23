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
- `POST /diary/parse-text` (the Review button on diary quick entry) always uses the `mid` tier model from `QUERY_MODELS`, no picker. The input is a few hundred words, so the better model costs almost nothing extra, and dropped details are the failure that matters.
- Dictation is live. `POST /transcribe/session` mints a short-lived client secret for an OpenAI Realtime transcription session (`TRANSCRIBE_LIVE_MODEL` and `TRANSCRIBE_LIVE_LANGUAGES` in `02_backend/app/main.py`); the browser streams 24 kHz PCM from an AudioWorklet straight to `wss://api.openai.com/v1/realtime` and the transcript arrives word by word. The app's mic button inside the text fields (compose, diary text answers, Ask HuXa) keeps the field visible, grown to 7 lines and read-only, with the live text appended and a bar below with cancel, level graph and stop. It asks "Still talking?" after 5 minutes (10 s to answer, otherwise it stops), and stop commits the audio and appends the final text to the field. Quick log on the home screen shows the live text under the bar, saves an Event straight away and shows it with an Edit button. `POST /transcribe` (multipart clip, `TRANSCRIBE_MODEL`) still exists but the app no longer uses it. Web only for now, native shows no button.
- Categories can define structured fields (`scale` 1–10, `number`, `duration`, `boolean`, `text`). Field values are stored in `event.metrics` keyed by field key. A `duration` field is entered as HH:MM in 15-minute steps (hour buttons 1–12 and four minute buttons, no keyboard) and stored as decimal hours (7:30 is `7.5`), so it reads the same as a `number` value; the field editor switches a field between the two. The diary is separate and stays hardcoded (rolling daily questions).
- Sleep is logged as events of the default `Sleep` category: `metrics.sleep_score` (number, 0–100) and `metrics.sleep_hours` (duration, decimal hours), both read off the Apple Watch and first in the form, then `metrics.sleep_quality`, `metrics.rested`, `metrics.hip_pain` (hip pain in the night) and `metrics.stomach` (stomach in the night, all scale 1–10), `metrics.dreams` (text), comment in `text`. Defaults in `DEFAULT_CATEGORIES` (backend `main.py` and `08_app/App.js`) only seed a missing `categories.json`. Hip pain and the 1–10 sleep rating used to be diary questions; `05_scripts/migrate_diary_to_sleep.py` copied the old values into Sleep events (`meta.source: "diary"`).

## Event Schema (v1)

```json
{
  "id": "uuid-v4",
  "client_timestamp": "ISO8601 UTC with Z",
  "received_at": "ISO8601 UTC with Z",
  "type": "category key (user-defined; defaults: Event, Intervention, Symptom, Decision, Thought, Sleep)",
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
- **Bump version before each deploy.** Version lives in `08_app/App.js` (`APP_VERSION`). Before deploying (not every commit), increment the patch (3rd) digit unless the user asks for minor (2nd) or major (1st). Multiple commits can share a version.
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
| `05_scripts/workflow.conf`, `05_scripts/hooks.sh` | Phone workflow config and huxa-specific steps; the workflow scripts and their infra files are rendered from them by the kit (`update kit`) |
| `05_scripts/preview.sh` | Serve a server worktree at `https://dev-<topic>.huxa.is` |
| `04_infrastructure/nginx/huxa-preview.conf` | Nginx site for previews (static, regex server name) |
| `04_infrastructure/systemd/huxa-preview@.service` | Preview backend, systemd user unit for `huxadev` |
| `04_infrastructure/sudo/` | Root half of a deploy and the sudoers rule for `huxadev` |
| `CHANGELOG.md` | Version history and release notes |
| `.claude/settings.json` | Claude Code permissions: auto mode, `/opt/huxa-dev` in scope, routine commands allowed, force push still asks, deploy left to auto mode (runs when a ship or deploy was asked for, never from a worktree), production data and sudo denied |

## Worktree

Base branch: main

Worktrees run in two places: on the Mac (main checkout `~/Programming/huxa.is`) and on the server (main checkout `/opt/huxa`, user `huxadev`, driven from the phone through Remote Control). Tell them apart by the checkout path.

### On the server

Every Remote Control session starts in `/opt/huxa`, so the checkout alone does not say which kind of session you are. Decide from the request: a request to build, fix, change or bump anything makes you a feature session, and you invoke the `worktree-feature` skill before touching a file, whether or not the user typed `/worktree-feature` (the phone app often sends the request as plain text). Only a request to ship, merge or deploy is done in `/opt/huxa` itself, by the integrator.

Worktree path is `/opt/huxa-dev/<topic>`, not a sibling of the checkout:
    git -C /opt/huxa worktree add /opt/huxa-dev/<topic> -b <feat|fix>/<topic> main
Never put `cd` and a git command in the same shell command: Claude Code asks for confirmation on `cd … && git …` in every permission mode. Use `git -C /opt/huxa-dev/<topic> …`, or run `cd` on its own first.
The user approves commands on a phone, where the prompt shows only the command. Before a command that may ask for approval, write one plain sentence: what it does and why it is needed now. Run one step per command, not a chain: a chain asks when any part of it is not allowed, and its prompt is too long to read on a phone. Change files with the Edit tool, never with `sed -i`, a script or a heredoc in a shell command: those ask, the Edit tool does not.
Bootstrap (run from inside the worktree; shares the main checkout's dependencies):
    /opt/huxa/05_scripts/preview.sh bootstrap
Dev server: none. Previews are static builds served by nginx. From inside the worktree:
    /opt/huxa/05_scripts/preview.sh up
prints `https://dev-<topic>.huxa.is`. Run it again after every change the user should see; nothing hot-reloads. The preview backend runs on a copy of the production data taken on the first `up`, with the production secrets, so anything changed there stays out of production. Give the user the URL in the Test it section. The server has no browser: check the preview with curl against the URL, the user looks at it on the phone.
Tests, safe beside other sessions: none, there is no test suite. Check the preview on the phone or with curl against the URL.
Tests, full (integrator only): none
Do not: write under `/var/lib/huxa`; edit or commit in `/opt/huxa` except in the Ship and Update kit steps; install into the main checkout's shared dependency dirs (give the worktree its own when a dependency changes); run `deploy.sh` from a worktree.

Ship. Sessions on the server are spawned from the Claude app by `claude remote-control` running in `/opt/huxa`: the pre-created session there is the integrator, every other session is a feature session that hands over as the skill describes. The integrator is told `ship <topic>`, with or without the handover block; without it, the branch is the one checked out in `/opt/huxa-dev/<topic>` (`git worktree list`) and the merge subject is written from its commits. A feature session told to ship may do these steps itself when it is the only session. Steps:
1. Bump the patch digit without asking. `ship <topic> minor` or `ship <topic> major` bumps that digit instead. On the branch, set `APP_VERSION` in `08_app/App.js` and add the `CHANGELOG.md` section, both with the Edit tool. Then commit with `git -C /opt/huxa-dev/<topic> commit -am "Bump to vX.Y.Z"` as a command of its own.
2. In `/opt/huxa`: `git merge --no-ff <branch> -m "Merge <branch>: <what it does>"`.
3. `05_scripts/deploy.sh`. It installs dependencies, builds the site, runs the root half through sudo and pushes main.
4. `/opt/huxa/05_scripts/preview.sh remove <topic>`. It stops and deletes the preview, removes the bootstrap links, removes the worktree and deletes the merged branch.
5. Tell the user to reload huxa.is and what to check there.

Drop. `drop <topic>` throws a feature away: `/opt/huxa/05_scripts/preview.sh remove --force <topic>` deletes the preview, the worktree and the branch, merged or not. Claude Code asks the user to confirm that command; main is untouched.

Skills and kit. The skills on this server (`worktree-feature`, `phone-dev-workflow`) and the kit that generated this project's workflow scripts live in `/home/huxadev/claude-skills`, a clone of `dreamspy/claude-skills`; `~/.claude/skills/` links into it. A change to a skill or to the kit is made there, never in this project's copies under `05_scripts/` or `04_infrastructure/`, which the next render overwrites. Edit, commit and push with `git -C /home/huxadev/claude-skills`. If the push is refused because another machine pushed first, `git -C /home/huxadev/claude-skills pull --rebase`, resolve, push again; never force-push. A skill change takes effect here at once; other machines get it with `update kit`.

Update kit. The integrator is told `update kit` to bring this server and project up to the skills repo. Steps:
1. `git -C /home/huxadev/claude-skills pull --ff-only`, then `/home/huxadev/claude-skills/install.sh`. If the pull refuses, the clone has commits of its own: push them first as above.
2. In `/opt/huxa`, on a clean main: `/home/huxadev/claude-skills/phone-dev-workflow/templates/init.sh /opt/huxa`. Show the user what changed (`git -C /opt/huxa diff --stat`, then the lines that matter) and anything the render printed under "Needs a hand". Commit as "Update the phone workflow kit".
3. `05_scripts/deploy.sh`. It installs changed nginx sites and the preview unit.
4. When the render changed anything under `04_infrastructure/sudo/`, tell the user to repeat setup step 5 as the admin: `ssh huxa 'sudo bash /opt/huxa/05_scripts/server_ship_setup.sh'`. The dev user cannot install the root half of a deploy.

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
