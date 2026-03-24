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
- Phase 1 auth is simple bearer token

## Event Schema (v1)

```json
{
  "id": "uuid-v4",
  "client_timestamp": "ISO8601 UTC with Z",
  "received_at": "ISO8601 UTC with Z",
  "type": "Event | Intervention | Symptom | Decision | Diary",
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
- **Update CHANGELOG.md on every commit.** Add a bullet under the current version section describing what changed. When the version is bumped, create a new section header with the version and date.
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
| `08_app/dist/` | Expo web build (served by Nginx in production) |
| `fabfile.py` | Fabric deploy commands |
| `CHANGELOG.md` | Version history and release notes |
