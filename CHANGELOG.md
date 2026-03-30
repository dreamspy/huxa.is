# Changelog

All notable changes to HuXa are documented here.

## v0.2.16 — 2026-03-30

- Add image attachment support to feedback/bug reports (pick from photo library, preview, upload)
- Backend: new attachment upload and serve endpoints, images stored in /var/lib/huxa/attachments/
- Nginx: /attachments proxy location, 10MB upload limit on /reports

## v0.2.15 — 2026-03-28

- Fix dark bar below safe area in light mode by setting native root background via expo-system-ui

## v0.2.14 — 2026-03-28

- Add color profiles: Dark (icon-inspired), Light, and Auto (follows OS dark/light mode)
- Color profile selector in Settings screen, persisted across restarts
- Auto mode uses `useColorScheme` to reactively follow macOS/iOS appearance
- Install `expo-system-ui` for proper simulator dark mode support

## v0.2.13 — 2026-03-24

- Fix diary scale grid to show 5 numbers per row consistently across web and native
- Remove separate diary date screen; add inline date picker to diary summary
- Fix web date picker not opening (showPicker() fix)
- Add spacing between date arrow and time picker on web

## v0.2.12 — 2026-03-24

- Add back/forward date arrows on compose and history screens
- Fix native spacing on date arrow controls

## v0.2.11 — 2026-03-24

- Fix delete not working on web — `Alert.alert` replaced with cross-platform `confirmAction`
- Remove unused `localhost:3000` from CORS origins
- Add Enter key submit on token input
- Change version bump and changelog rules to deploy-time only

## v0.2.10 — 2026-03-24

- Add `CHANGELOG.md` with full version history extracted from git
- Add changelog and version bump rules to `CLAUDE.md`
- Change rules: version bump and changelog update happen before deploy, not every commit

## v0.2.9 — 2026-03-24

- Add `CHANGELOG.md` with full version history extracted from git
- Add changelog update rule to `CLAUDE.md`

## v0.2.8 — 2026-03-24

- Rename SSH alias `mnemo` → `huxa` across codebase and fabfile
- Add `05_scripts/update_server.sh` for patching the server
- Server hardening: fail2ban, UFW firewall, SSH password auth disabled
- Update git remote on server to new repo URL

## v0.2.7 — 2026-03-23

- Switch production domain from `mnemo.axex.is` to `huxa.is`
- Cloudflare DNS, SSL origin certificate, nginx all updated
- CORS and app API_BASE updated for new domain

## v0.2.6 — 2026-03-23

- Add PWA manifest for standalone mode (fullscreen on Add to Home Screen)
- Custom `index.html` with apple-mobile-web-app meta tags
- Red "H" icon for home screen (SVG + PNG apple-touch-icon)
- Dark theme status bar with `viewport-fit=cover`

## v0.2.5 — 2026-03-23

- Fix input focus outline overflowing screen edges on web (`outlineOffset: -2`)

## v0.2.4 — 2026-03-23

- Add token validation on feedback submit — shows error if token missing or invalid

## v0.2.3 — 2026-03-23

- Rename `/feedback` endpoint to `/reports` to avoid Cloudflare WAF 403 block

## v0.2.2 — 2026-03-23

- Add feedback feature — bug reports and feature requests
- Long-press HuXa title from any screen to open feedback
- `POST /reports`, `GET /reports`, `DELETE /reports/{id}` endpoints
- View all feedback with inline delete
- Offline queue support for feedback

## v0.2.1 — 2026-03-22

- Add "Ask HuXa" query screen in Expo app

## v0.2.0 — 2026-03-22

- Rebrand Mnemo → HuXa across entire codebase

## v0.1.12 — 2026-03-21

- Soft-delete for events and diary entries
- Deduplicate events in diary summary and query endpoints
- Sort events newest-first in history
- Fix delete not working for past dates

## v0.1.11 — 2026-03-20

- Edit events and diary entries from history view

## v0.1.10 — 2026-03-19

- Fix datetime input text visibility on iOS Safari

## v0.1.9 — 2026-03-19

- Allow user to change date when logging
- Remove Metrics option from logging form
- Add "Submit & New" flow for rapid-fire logging

## v0.1.7 — 2026-03-18

- Add diary quick entry (bulk mode) with AI text parsing
- Remove Diary from event type categories
- Route review Edit button to step-by-step mode

## v0.1.6 — 2026-03-17

- Add history view for browsing past events and diary entries
- Add offline queue for write operations (events, diary)

## v0.1.5 — 2026-02-16

- Fix PWA refresh on iOS with cache-busting navigation

## v0.1.2 — 2026-02-16

- Add fabfile for deployment
- Add dev server script
- Add version display and version bump rule

## v0.1.0 — 2026-02-15

- AI query endpoint (GPT-4o-mini against event log)
- Structured diary with step-by-step wizard and AI-generated daily summary
- Diary quick entry with AI text parsing
- Existing diary detection with keep/edit options
- Offline queue for write operations
- Make title clickable to return to home screen

## v0.0.1 — 2026-02-14

- Initial scaffold: repository structure, docs, backend, infrastructure
- FastAPI backend with JSONL event store
- PWA frontend with logging flow (category → compose → submit)
- Nginx + systemd deployment
- Cloudflare DNS and TLS
- Syncthing sync to Mac
