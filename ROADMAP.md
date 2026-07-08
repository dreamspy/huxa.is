# HuXa Build Roadmap

## Standalone App on iPhone

- [ ] Get Apple Developer account ($99/year) — waiting for confirmation
- [ ] Install EAS CLI (`npm install -g eas-cli`)
- [ ] Configure `eas.json` and app signing
- [ ] App icon and splash screen
- [ ] Build standalone `.ipa` with `eas build --platform ios`
- [ ] Distribute via TestFlight for personal use
- [ ] (Optional) Submit to App Store for public distribution

## Tailscale (Deploy from Anywhere)

- [x] Install Tailscale on Mac
- [x] Install Tailscale on server
- [x] Update SSH config to use Tailscale IP (`100.98.66.32`)
- [x] Verify `fab deploy` works over Tailscale

## Cloudflare App Lockdown

- [ ] Set up Cloudflare Access or app lockdown (replace IP lockdown)

## Multi-User (Google OAuth + Apple Sign-In)

### Provider Setup
- [ ] Create Google Cloud project + OAuth 2.0 client IDs (web, iOS, Android)
- [ ] Enable "Sign In with Apple" on Apple Developer account + create Service ID for web
- [ ] Generate JWT secret for session tokens

### Backend Auth
- [ ] Add Python deps: `PyJWT`, `cryptography`, `google-auth`, `httpx`
- [ ] Create `02_backend/app/auth.py` — Google/Apple ID token verification, JWT issuance, user registry (`users.jsonl`), `get_current_user` dependency
- [ ] Create `02_backend/app/routes/auth.py` — `POST /auth/google`, `POST /auth/apple`, `GET /auth/me`
- [ ] Register auth router in `main.py`

### Per-User Data
- [ ] Per-user JSONL storage (`/var/lib/huxa/users/{user_id}/events.jsonl`, `diary.jsonl`, `feedback.jsonl`)
- [ ] Refactor `main.py`: replace `verify_token` with `get_current_user`, route data to per-user dirs
- [ ] Keep legacy bearer token working during transition

### Migration
- [ ] Create `05_scripts/migrate_to_multiuser.py` — copy existing data to legacy user directory
- [ ] Run migration on server

### Expo App
- [ ] Add deps: `expo-auth-session`, `expo-crypto`, `expo-web-browser`, `expo-apple-authentication`
- [ ] Replace manual token input with login screen (Google + Apple buttons)
- [ ] Google OAuth flow via `expo-auth-session` (web, iOS, Android)
- [ ] Apple Sign-In via `expo-apple-authentication` (iOS native) + `expo-auth-session` (web)
- [ ] Store JWT in AsyncStorage, verify on startup via `/auth/me`
- [ ] Update settings screen: show user info, sign out button, remove token input

### Infrastructure
- [ ] Add `/auth` location block to Nginx config (tighter rate limit)
- [ ] Add env vars to systemd: `HUXA_JWT_SECRET`, `HUXA_GOOGLE_CLIENT_ID`, `HUXA_APPLE_SERVICE_ID`

### Cleanup
- [ ] Remove legacy bearer token support after confirming OAuth works
- [ ] Update CLAUDE.md (single-user → multi-user, bearer token → JWT/OAuth)

## Dark / Light Mode

- [ ] Add theme toggle to app and web frontend
- [ ] Persist preference in AsyncStorage / localStorage

## Smart Query (Embeddings / RAG)

The current `/query` endpoint sends the entire event log to GPT. At ~10 events/day, the log will exceed GPT-4o-mini's 128K token context window within 6-12 months. An embeddings-based approach finds only the relevant events for each query, making it scale to years of data without hitting token limits.

- [ ] Compute embeddings for events on ingest (OpenAI or local model)
- [ ] Store embeddings (vector file or lightweight vector DB)
- [ ] Query by similarity: find relevant events, send only those to GPT
- [ ] Fallback: add date range filter to `/query` endpoint as interim solution

## Landing Page

- [ ] Public welcome page at huxa.is for unauthenticated visitors
- [ ] App description, screenshots, and feature overview
- [ ] Links to App Store / TestFlight
- [ ] Documentation / getting started guide

## Voice Input

Researched and planned 2026-06-06, see `01_docs/voice-input-plan.md` for full research, architecture, and time estimates (~1.5–2 days). Server-side transcription, ElevenLabs Scribe v2 as default provider (best Icelandic), gpt-4o-transcribe as fallback. ChatGPT-style UX: mic button → record → "send" (submit directly) or "insert" (edit first).

- [ ] Step 0: provider spike — test Scribe v2 vs gpt-4o-transcribe on own Icelandic/English/mixed recordings, pick provider
- [ ] Step 1: backend `POST /transcribe` endpoint (multipart audio → provider → text), optional gpt-4o-mini cleanup pass
- [ ] Step 2: Expo recording UI with `expo-audio` — mic button on compose and diary inputs, record → send/insert flow
- [ ] Step 3: cross-platform testing (desktop browsers, iPhone Safari, installed PWA)
- [ ] Step 4: docs, changelog, version bump, deploy

---

## Archive

### User-Defined Categories ✅

- [x] `GET/PUT /categories` backend endpoints, stored in `/var/lib/huxa/categories.json`
- [x] Event `type` accepts any category key (enum removed)
- [x] Manage Categories screen in app: add, toggle on/off, reorder, delete
- [x] Category list cached in AsyncStorage for offline use
- [x] Per-category structured fields (scale 1–10, number, yes/no, text) with in-app field editor
- [x] Field values stored in `event.metrics`; shown on compose and history screens

### Phase 12 — Feature Ideas / Bug Reports ✅

- [x] Add in-app feature to log a feature idea or bug report
- [x] Store in separate JSONL

### Phase 8.2 — Rebrand to HuXa ✅

- [x] Rename app throughout codebase (frontend, app, backend, configs)
- [x] Rename server dirs and service files
- [x] Buy huxa.is domain
- [x] Update Cloudflare DNS and nginx for new domain

### Phase 8.1 — Expo Web Support ✅

- [x] Install `react-native-web` and `react-dom`
- [x] Get `npx expo start --web` running
- [x] Handle web-incompatible components (`DateTimePicker` conditional rendering)
- [x] Retire `03_frontend/` — delete directory, remove all references from docs
- [x] Update all docs, scripts, and deploy tooling for Expo

### Phase 8 — Native App ✅

- [x] Pick a framework (Expo / React Native) and set up the project
- [x] Connect to existing backend API (bearer token auth)
- [x] Replicate core logging flow (category → compose → submit)
- [x] Replicate history view with editing
- [x] Replicate diary flow
- [x] Explore native-only features (push notifications, haptics, etc.)

### Phase 9 — GPT Query in App ✅

- [x] Add "Ask HuXa" query input and answer display to Expo app

### Phase 7 — Harden ✅

- [x] Set up Cloudflare TLS (Full strict)
- [x] Add basic rate limiting in Nginx
- [x] Add security headers in Nginx (HSTS, X-Frame-Options, nosniff, XSS, referrer)
- [x] Restrict EC2 security group to Cloudflare IPs only (ports 80/443)
- [x] fail2ban, UFW firewall, SSH password auth disabled

### Phase 6 — Syncthing ✅

- [x] Install Syncthing on server and Mac
- [x] Share `/var/lib/huxa/`
- [x] Verify events.jsonl syncs to Mac

### Phase 5 — Offline Queue ✅

- [x] Queue events in AsyncStorage when offline
- [x] Sync queued events when connection is restored
- [x] Show pending/synced status indicators

### Phase 4 — Frontend & Features ✅

- [x] PWA frontend → replaced by Expo (iOS, Android, web)
- [x] AI query endpoint (GPT-4o-mini)
- [x] Structured diary with step-by-step wizard and quick entry
- [x] History view with editing and deletion
- [x] Logging UX: date override, submit & log another
- [x] PWA standalone mode with custom icon

### Phase 1–3 — Backend & Server ✅

- [x] FastAPI backend with JSONL event store
- [x] EC2 instance with systemd, Nginx, Cloudflare
- [x] Fabric deploy pipeline
