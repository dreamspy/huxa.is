# HuXa

**Server:** huxa.is

A personal event-sourced logging engine designed to become an AI-augmented second brain.

## Vision

HuXa captures life events — interventions, symptoms, decisions, diary entries — as an append-only stream. Over time, this stream becomes the substrate for pattern recognition, trend analysis, and AI-driven insight generation.

The goal is not to build yet another notes app. HuXa is a structured event log with a clear migration path toward AI augmentation and richer clients.

## Core Philosophy

### Event Sourcing

Every log entry is an immutable event. Events are never edited or deleted — only new events are appended. This creates a truthful, auditable timeline that is trivially replayable and analyzable.

### JSONL as Storage

In v1, all events are stored in a single append-only JSONL file (`events.jsonl`). Each line is a self-contained JSON object.

Why JSONL:
- Human-readable and greppable
- Trivially parseable by any language or tool
- Works with `jq`, `grep`, `awk`, Python, Claude CLI, Gemini CLI
- No server dependency — the file *is* the database
- Append-only writes are atomic on most filesystems
- Perfect for Syncthing-based sync to local machines

### UTC Timestamps

All timestamps are ISO 8601 UTC (with `Z` suffix). No local timezone is stored. The client generates `client_timestamp` at event creation time; the server stamps `received_at` on receipt.

This avoids timezone ambiguity, simplifies analysis, and ensures correctness across devices and locations.

### Append-Only Rule

Raw events are never modified. If correction is needed, a new corrective event is appended. Derived data (summaries, aggregations) lives in a separate directory and can always be regenerated from the raw stream.

## Event Schema (v1)

```json
{
  "id": "uuid-v4",
  "client_timestamp": "2026-02-14T10:30:00Z",
  "received_at": "2026-02-14T10:30:01Z",
  "type": "Event | Intervention | Symptom | Decision | Diary",
  "text": "Took 200mg magnesium glycinate",
  "metrics": {},
  "meta": { "version": 1 }
}
```

## Architecture

### Server Runtime Layout

HuXa follows Linux filesystem conventions:

| Path | Purpose |
|---|---|
| `/opt/huxa/` | Application code (git repo deployed here) |
| `/var/lib/huxa/` | Data: `events.jsonl` + `derived/` |
| `/var/log/huxa/` | Service logs |
| `/etc/huxa/` | Configuration files |

Code and data are strictly separated. The event file never lives inside the repo.

### Stack

- **Backend:** FastAPI + Uvicorn
- **Process management:** systemd
- **Reverse proxy:** Nginx
- **CDN/DNS:** Cloudflare
- **Server:** AWS EC2 (Ubuntu 22.04)
- **Frontend:** Expo (React Native) — iOS, Android, and web from a single codebase
- **Desktop:** Tauri — native macOS app wrapping the Expo web build
- **Sync:** Syncthing (server → Mac)

### systemd → Uvicorn

Uvicorn runs as a systemd service, ensuring automatic restarts, log management via journald, and proper process lifecycle. No Docker, no container orchestration — just a process on a Linux box.

### Sync Strategy

In phase 1, `/var/lib/huxa/` is synced to a Mac via Syncthing. This enables:
- Local analysis with Claude CLI
- Local analysis with Gemini CLI
- Custom Python scripts against the raw JSONL
- Offline access to the full event history

The file-based design makes this sync trivial.

### Nginx + Cloudflare

Nginx terminates TLS locally and proxies to Uvicorn. Cloudflare sits in front for DNS, DDoS protection, and caching. Cloudflare Zero Trust is planned for future access control.

## Authentication

Phase 1 uses simple bearer token authentication. This is intentionally minimal — the system is single-user and sits behind Cloudflare.

## AI Roadmap

1. **Phase 1 (current):** Structured event capture + Syncthing sync for local AI analysis
2. **Phase 2:** Server-side daily/weekly summaries generated from the event stream
3. **Phase 3:** Pattern detection and trend alerts
4. **Phase 4:** Conversational interface over the event history

## Database Migration Path

HuXa is designed so that migrating from JSONL to PostgreSQL is straightforward when scale demands it. The event schema maps directly to a single table. The append-only discipline means no complex migration of mutable state. This migration is not planned for v1.

## Development

See [01_docs/development.md](01_docs/development.md) for the full dev workflow — running locally, testing in browser/simulator/iPhone, making changes, and deploying.

## Repository Structure

```
01_docs/          → Architecture, decisions, deployment docs
02_backend/       → FastAPI application
04_infrastructure/→ systemd, nginx, AWS, Cloudflare configs
05_scripts/       → Dev server, analysis, and export scripts
06_config/        → Configuration templates
07_examples/      → Example event data
08_app/           → Expo app (iOS, Android, web)
09_desktop/       → Tauri desktop app (macOS)
```
