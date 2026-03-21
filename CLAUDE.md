# CLAUDE.md — Instructions for AI Agents Working on Mnemo

## Hard Rules

1. **Do NOT introduce a database in v1.** Storage is a single append-only JSONL file. This is a locked decision.
2. **Do NOT break append-only design.** Never edit, overwrite, or delete lines in `events.jsonl`. Only append.
3. **Always use UTC timestamps.** ISO 8601 with `Z` suffix. No local timezones.
4. **Never overwrite raw events.** If you need computed or aggregated data, write it to `/var/lib/mnemo/derived/`.
5. **Derived data lives in `/var/lib/mnemo/derived/`.** Never mix derived data with the raw event stream.
6. **Keep the backend minimal.** FastAPI + Uvicorn. No unnecessary middleware, no complex patterns.
7. **Avoid unnecessary abstractions.** No base classes, factories, or patterns that don't solve an immediate problem.
8. **No Docker.** The app runs directly on Ubuntu via systemd.
9. **No ORM.** There is no database. Do not introduce SQLAlchemy, Tortoise, or any ORM.
10. **Respect the runtime layout.** Code in `/opt/mnemo/`, data in `/var/lib/mnemo/`, logs in `/var/log/mnemo/`, config in `/etc/mnemo/`.
11. **Keep migration path clean.** The event schema should map cleanly to a future Postgres table. Don't add fields or structures that would complicate migration.
12. **Prefer clarity over cleverness.** Simple, readable code. No magic.

## Architecture Context

- Single-user system
- Production server: `mnemo.axex.is`
- File-based event store (JSONL)
- FastAPI backend served by Uvicorn behind Nginx behind Cloudflare
- systemd manages the process
- Syncthing syncs `/var/lib/mnemo/` to Mac for local AI analysis
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
- **Keep ALL docs in sync.** When implementing a feature, fixing a bug, or making any meaningful change, update all relevant files in the same commit: READMEs (`README.md`, `02_backend/README.md`, `03_frontend/README.md`, `05_scripts/README.md`), docs in `01_docs/`, `ROADMAP.md` (tick off completed items), and `CLAUDE.md` if architecture or rules change. If you add, remove, or change a script, endpoint, feature, or config option, every affected doc must reflect it.
- **Bump version on every commit.** Version lives in `03_frontend/public/app.js` and `03_frontend/public/sw.js` (both `APP_VERSION`). Before committing, ask the user which digit to increment: major (1st), minor (2nd), or patch (3rd). Keep both files in sync.

## File Paths

| Path | Purpose |
|---|---|
| `02_backend/app/main.py` | FastAPI app entry point |
| `02_backend/app/routes/` | API route modules |
| `02_backend/app/models/` | Pydantic models |
| `04_infrastructure/systemd/mnemo.service` | systemd unit file |
| `04_infrastructure/nginx/mnemo.conf` | Nginx site config |
| `06_config/config.example.json` | Configuration template |
| `07_examples/events.example.jsonl` | Example event data |
