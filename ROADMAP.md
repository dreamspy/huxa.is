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

## Phase 4.11 — History Editing ✅

- [x] Allow editing of events from the history view
- [x] Allow editing of diary entries from the history view

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

- [x] Set up Cloudflare TLS (Full strict)
- [x] Add basic rate limiting in Nginx
- [x] Add security headers in Nginx (HSTS, X-Frame-Options, nosniff, XSS, referrer)
- [x] Restrict EC2 security group to Cloudflare IPs only (ports 80/443)
- [x] ~~Set up log rotation~~ (deferred — logs are tiny)
- [x] ~~Automated backups of events.jsonl~~ (covered by Syncthing sync to Mac)


## Phase 8 — Native App (learning project)

- [x] Pick a framework (Expo / React Native) and set up the project
- [x] Connect to existing backend API (bearer token auth)
- [x] Replicate core logging flow (category → compose → submit)
- [x] Replicate history view with editing
- [x] Replicate diary flow
- [ ] Explore native-only features (push notifications, haptics, etc.)

### App Testing Checklist

**Settings**
- [x] Set token via Settings screen
- [x] Token persists after closing and reopening app

**Logging**
- [x] Tap Log → see category picker with 5 categories
- [x] Select category → compose screen shows correct type label
- [x] Date/time picker opens and allows changing date
- [x] Enter text and submit → toast says "Logged"
- [x] Submit with empty text → error toast
- [x] "Submit & log another" → submits and opens new compose with selected type
- [x] Back button returns to category screen

**History**
- [x] History loads today's events
- [x] Date picker changes date and reloads
	- [x] date picker on history needs fixing
- [x] Events tab shows event cards with type badge, time, text
- [x] Diary tab shows diary entries or "No diary entry" message
- [x] Edit button on event → opens compose pre-filled with event data
	- [x] works but submit should go back to the event view with the same date
- [x] Edit and submit → toast says "Updated"
- [x] Back from edit returns to history
- [x] Edit Diary button → opens step-by-step wizard with existing answers

**Diary**
- [x] Yesterday / Today buttons start diary flow
- [x] Summary screen shows AI-generated summary or "No events"
- [x] Existing entry shows "Looks Good" / "Edit" options
	- [x] doesn't show the entry
- [x] Step-by-step wizard: scale questions show 1-10 grid
	- [x] yes but it should be 1-5 on one line and 6-10 in the next. Also the order is not right. The number questions should come first, and then the text questions
- [x] Scale selection highlights correctly
- [x] Text questions show textarea
- [x] Prev/Next navigation works through all 10 questions
- [x] Review screen shows all answers
- [x] Edit from review goes back to last question
- [x] Save → toast says "Diary saved"
- [x] when editing an existing diary entry, it goes to quick mode, should go to step by step mode
- [x] pressing a number on a scale should auto submit
- [ ] quick entry, gut status text is indented

**Offline**
- [x] Submit event while offline → toast says "Saved offline"
- [x] Pending badge appears on idle screen
- [x] Tapping pending syncs when back online

**UI/UX**
- [x] Keyboard doesn't cover input fields
- [x] All screens scroll properly on small screens
- [x] Toast messages appear and disappear after 3 seconds
- [x] App theme matches web version (dark background, accent colors)

## Phase 8.1 — Expo Web Support (replace HTML frontend)

- [ ] Install `react-native-web` and `react-dom`
- [ ] Get `npx expo start --web` running
- [ ] Handle web-incompatible components (e.g. `DateTimePicker` needs conditional rendering or web alternative)
- [ ] Retire `03_frontend/` HTML version — one codebase for iOS, Android, and web

## Phase 8.2 — Rebrand to Huxa

- [ ] Buy huxa.is domain
- [ ] Rename app throughout codebase (frontend, app, backend, configs)
- [ ] Update Cloudflare DNS and nginx for new domain
- [ ] New app icon and branding

## Phase 9 — GPT Query in App

- [x] Add "Ask Mnemo" query input and answer display to Expo app

## Phase 10 — Standalone App on iPhone

- [ ] Get Apple Developer account ($99/year)
- [ ] Install EAS CLI (`npm install -g eas-cli`)
- [ ] Configure `eas.json` and app signing
- [ ] App icon and splash screen
- [ ] Build standalone `.ipa` with `eas build --platform ios`
- [ ] Distribute via TestFlight for personal use
- [ ] (Optional) Submit to App Store for public distribution

## Phase 11 — Cloudflare App Lockdown

- [ ] Set up Cloudflare Access or app lockdown (replace IP lockdown)

## Phase 12 — Feature Ideas / Bug Reports

- [ ] Add in-app feature to log a feature idea or bug report
- [ ] Store in separate JSONL or send to GitHub Issues

## Phase 13 — Multi-User (Google OAuth)

- [ ] Add Google OAuth login (backend endpoints for auth flow, JWT sessions)
- [ ] Per-user JSONL storage (`/var/lib/mnemo/users/{email}/events.jsonl` and `diary.jsonl`)
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

