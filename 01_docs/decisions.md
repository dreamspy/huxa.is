# Architectural Decisions

All decisions listed here are **locked** for v1 unless explicitly revisited.

## Storage

| Decision | Status |
|---|---|
| Single append-only JSONL file | Locked |
| No database in v1 | Locked |
| Raw events in `/var/lib/huxa/events.jsonl` | Locked |
| Derived data in `/var/lib/huxa/derived/` | Locked |
| Never edit or delete existing event lines | Locked |
| Never mix raw and derived data | Locked |

## Timestamps

| Decision | Status |
|---|---|
| All timestamps are ISO 8601 UTC with Z suffix | Locked |
| Client generates `client_timestamp` | Locked |
| Server generates `received_at` | Locked |
| No local timezone storage | Locked |

## Event Schema

| Decision | Status |
|---|---|
| UUID v4 for event IDs | Locked |
| Event types: Event, Intervention, Symptom, Decision, Diary | Locked |
| `metrics` field as flexible JSON object | Locked |
| `meta.version` field for schema evolution | Locked |

## Backend

| Decision | Status |
|---|---|
| FastAPI | Locked |
| Uvicorn as ASGI server | Locked |
| systemd process management | Locked |
| No Docker | Locked |
| No ORM | Locked |
| No database | Locked |
| Simple bearer token auth in phase 1 | Locked |
| Minimal validation | Locked |

## Frontend

| Decision                                                        | Status |
| --------------------------------------------------------------- | ------ |
| Expo (React Native) — single codebase for iOS, Android, and web | Locked |
| Single "Log" button entry point                                 | Locked |
| Category selection before entry                                 | Locked |
| One-sentence text entry                                         | Locked |
| Client-side keyboard input (Whisper later)                      | Locked |

## Infrastructure

| Decision | Status |
|---|---|
| AWS EC2 (Ubuntu 22.04) | Locked |
| Nginx reverse proxy | Locked |
| Cloudflare DNS + protection | Locked |
| Code in `/opt/huxa/` | Locked |
| Data in `/var/lib/huxa/` | Locked |
| Logs in `/var/log/huxa/` | Locked |
| Config in `/etc/huxa/` | Locked |

## Sync

| Decision | Status |
|---|---|
| Syncthing for server → Mac sync | Locked (phase 1) |
| Sync target is `/var/lib/huxa/` | Locked |
| File-based design to support local AI tools | Locked |

## Future (Not Yet Implemented)

| Decision | Status |
|---|---|
| PostgreSQL migration when scale demands | Planned |
| Cloudflare Zero Trust access control | Planned |
| AI augmentation layer | Planned |
