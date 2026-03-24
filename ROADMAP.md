# HuXa Build Roadmap

## Backlog

- [ ] Voice input via Whisper (on-device or server-side speech-to-text)
- [ ] New app icon and branding

## Phase 10 — Standalone App on iPhone

- [ ] Get Apple Developer account ($99/year) — waiting for confirmation
- [ ] Install EAS CLI (`npm install -g eas-cli`)
- [ ] Configure `eas.json` and app signing
- [ ] App icon and splash screen
- [ ] Build standalone `.ipa` with `eas build --platform ios`
- [ ] Distribute via TestFlight for personal use
- [ ] (Optional) Submit to App Store for public distribution

## Phase 11 — Cloudflare App Lockdown

- [ ] Set up Cloudflare Access or app lockdown (replace IP lockdown)

## Phase 13 — Multi-User (Google OAuth)

- [ ] Add Google OAuth login (backend endpoints for auth flow, JWT sessions)
- [ ] Per-user JSONL storage (`/var/lib/huxa/users/{email}/events.jsonl` and `diary.jsonl`)
- [ ] Add Google login to native app and web frontend
- [ ] Replace bearer token with OAuth session
- [ ] Remove token UI from web frontend (settings gear, token dialog)

## Phase 14 — Dark / Light Mode

- [ ] Add theme toggle to app and web frontend
- [ ] Persist preference in AsyncStorage / localStorage

## Phase 15 — Smart Query (Embeddings / RAG)

The current `/query` endpoint sends the entire event log to GPT. At ~10 events/day, the log will exceed GPT-4o-mini's 128K token context window within 6-12 months. An embeddings-based approach finds only the relevant events for each query, making it scale to years of data without hitting token limits.

- [ ] Compute embeddings for events on ingest (OpenAI or local model)
- [ ] Store embeddings (vector file or lightweight vector DB)
- [ ] Query by similarity: find relevant events, send only those to GPT
- [ ] Fallback: add date range filter to `/query` endpoint as interim solution

---

## Archive

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
