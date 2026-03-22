	# Mnemo Build Roadmap

## Phase 1 — Local Backend ✅

- [x] Set up Python venv and install dependencies
- [x] Run uvicorn locally
- [x] Test `POST /events` with curl
- [x] Test `GET /health` with curl
- [x] Verify events.jsonl gets appended correctly

## Phase 2 — Local Frontend ✅

- [x] Build PWA (log button, category picker, text input, metrics)
- [x] Wire frontend to local backend
- [x] Add CORS middleware for local dev
- [x] Test full flow: log → category → entry → submit → verify in JSONL

## Phase 3 — Server Setup ✅

- [x] Provision EC2 instance (Ubuntu 24.04, eu-west-1)
- [x] Create mnemo user and directory structure (`/opt`, `/var/lib`, `/var/log`, `/etc`)
- [x] Clone repo to `/opt/mnemo/`
- [x] Set up Python venv on server
- [x] Copy config and set auth token
- [x] Install and start systemd service
- [x] Install and configure Nginx
- [x] Point Cloudflare DNS to the instance
- [x] Test `POST /events` against live server

## Phase 4 — Deploy Frontend ✅

- [x] Decide hosting: serve static files from Nginx
- [x] Deploy PWA to server
- [x] Test full flow over the internet

## Phase 4.5 — iPhone Quick Logging

- [x] Add to Home Screen on iPhone (PWA)
- [x] Test full logging flow on mobile
- [x] Optimize for frictionless mobile use (PWA in dock)

## Phase 4.6 — AI Query ✅

- [x] Add `POST /query` endpoint (GPT-4o-mini against event log)
- [x] Add query input + answer display in frontend

## Phase 4.7 — Diary Feature ✅

- [x] Structured daily diary with step-by-step wizard (scale + text questions)
- [x] `POST /diary` and `GET /diary/{date}` endpoints
- [x] Date picker with Yesterday/Today shortcuts
- [x] AI-generated daily summary from logged events
- [x] Review screen before saving

## Phase 4.8 — History View ✅

- [x] History screen with Events and Diary tabs
- [x] Single date and date range filtering

## Phase 4.9 — Diary Quick Entry ✅

- [x] Bulk mode: all scale questions on one screen, single textarea for text answers
- [x] AI parsing of free-form text into structured diary fields (`POST /diary/parse-text`)
- [x] Edit from review goes to step-by-step wizard pre-filled with parsed answers
- [x] Removed Diary from event type categories

## Phase 4.10 — Logging UX Improvements ✅

- [x] Allow user to change date when logging (default to now, but allow override)
- [x] Remove the Metrics option from the logging form
- [x] Add a "Submit & New" flow for rapid-fire logging (submit current log and immediately start a new one, possibly with inline type selection)

## Phase 4.11 — History Editing

- [ ] Allow editing of events from the history view
- [ ] Allow editing of diary entries from the history view

## Phase 5 — Offline Queue ✅

- [x] Queue events in IndexedDB/localStorage when offline
- [x] Sync queued events when connection is restored
- [x] Show pending/synced status indicators
- [x] Handle conflicts gracefully

## Phase 6 — Syncthing ✅

- [x] Install Syncthing on server and Mac
- [x] Share `/var/lib/mnemo/`
- [x] Verify events.jsonl syncs to Mac
- [x] Test running scripts and Claude CLI against synced file

## Phase 7 — Harden

- [ ] Review auth token handling
- [ ] Set up Cloudflare TLS (Full strict)
- [x] Add basic rate limiting in Nginx
- [x] Add security headers in Nginx (HSTS, X-Frame-Options, nosniff, XSS, referrer)
- [x] Restrict EC2 security group to Cloudflare IPs only (ports 80/443)
- [ ] Set up log rotation
- [ ] Automated backups of events.jsonl
- [ ] Set up Cloudflare app lockdown (replace IP lockdown)

## Phase 8 — Multi-User

- [ ] Add Gmail/Google OAuth authentication
- [ ] Associate events with authenticated user identity
- [ ] Per-user event storage (separate JSONL files or user-prefixed entries)
- [ ] Update frontend to handle login/logout flow
- [ ] Migrate from single bearer token to OAuth session management
