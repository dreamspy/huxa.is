# Multi-user login: plan and decisions

Notes from a design session on 2026-11-04. Nothing here is implemented yet.

## Decision

Use **Cloudflare Access** as the login wall, not in-app Google OAuth. The
roadmap section "Multi-User (Google OAuth + Apple Sign-In)" should be rewritten
to match. Reasons: far less code in backend and app, allowlist and audit log
come for free, and HuXa doubles as the test ground for Access (and later
Cloudflare Tunnel), which is wanted anyway.

Alternatives considered: in-app Google Sign-In with a HuXa-issued session JWT
(more code, needs Apple Sign-In once an App Store build exists), email magic
links (needs SES and a code store), passkeys (credential store and recovery
flow), username/password (no).

## How Access works

- An Access application covers a hostname (or path). A policy says who may
  enter (named emails, a domain, a group). Free plan: 50 users.
- Unauthenticated visitors are redirected to `<team>.cloudflareaccess.com`,
  log in (one-time PIN by email, Google, GitHub, Apple, Microsoft, any OIDC),
  and return with a `CF_Authorization` cookie.
- Cloudflare adds `Cf-Access-Authenticated-User-Email` and
  `Cf-Access-Jwt-Assertion` (a JWT with `email`, stable `sub`, `aud`) to every
  proxied request.
- The origin must verify that JWT (signature against
  `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, `aud` equals the
  application's AUD tag). Headers alone can be forged if the origin is
  reachable directly. Origin should accept traffic only from Cloudflare:
  UFW on Cloudflare IP ranges now, Cloudflare Tunnel (`cloudflared`) later,
  which closes 80 and 443 entirely.
- Service tokens (client id + secret headers) let scripts and curl through.
  The backend maps a service token to a user.

## Changes in HuXa

Backend (`02_backend/app/main.py`):
- `verify_token` becomes `get_current_user`: read the assertion header,
  verify with PyJWT against cached team keys, look `sub` up in `users.jsonl`,
  create a user (uuid4) on first sight, return the user's data directory.
- All file paths become per user (see layout below). Categories too.
- New `GET /me` returning email for the settings screen.
- Env: `HUXA_ACCESS_TEAM`, `HUXA_ACCESS_AUD`. Both unset means auth disabled
  and a fixed `dev` user, as `HUXA_AUTH_TOKEN` empty does today.
- Remove `HUXA_AUTH_TOKEN` and the bearer token once Access is live.
- New deps `PyJWT`, `cryptography`: the worktree needs its own venv.
- Put `GET /attachments/{filename}` behind auth (currently open).

App (`08_app/App.js`):
- Remove the token screen. Settings shows the email from `/me` and a
  Sign out link to `/cdn-cgi/access/logout`.
- When the session expires, Access answers API fetches with a redirect to the
  login page, which fails CORS and looks like a network error. Detect this and
  `window.location.reload()` so the full login flow runs. The offline queue
  already tolerates failed posts.

Nginx: unchanged apart from a `/me` location.

Previews: one Access application can list `huxa.is` and `*.huxa.is` under one
AUD, so `dev-*.huxa.is` previews are covered.

## Data layout

Event schema unchanged. One folder per user; the user is the directory, not a
field. Maps to a `user_id` column on a future Postgres import.

    /var/lib/huxa/
      users.jsonl                 append-only: id, email, access_sub, created_at
      users/<uuid>/
        events.jsonl  diary.jsonl  feedback.jsonl  categories.json
        attachments/  derived/

- User id is a uuid4 assigned at first login, never the email.
- Existing files are moved (not rewritten) into the owner's folder once, by a
  migration script run as `huxa` during the ship step.
- New users start with the five default categories.

## Syncthing

Today the whole of `/var/lib/huxa/` syncs to the Mac, which would include other
users' data. Recommended: add `.stignore` on the server excluding `users/*`
except the owner's id, and update Mac-side scripts from
`~/HuXa-data/events.jsonl` to `~/HuXa-data/users/<id>/events.jsonl`.
Alternative: keep syncing everything (only acceptable with people who know).
Decision pending.

## Trade-offs

1. No native login flow. A standalone iOS app would have to log in through a
   web view and reuse the cookie. The installed PWA works because it is the
   website (`display: standalone` is already set).
2. PWA login on iOS must be tested first: the redirect to
   `cloudflareaccess.com` leaves the PWA scope. One-time PIN is the simplest
   case since the whole flow stays on Cloudflare's domain.
3. A public landing page later needs a separate host or a bypass policy on
   `/`. Decide when building it.
4. Login page is Cloudflare-branded (logo and colours customisable).
5. Every allowed user spends the OpenAI key via Ask HuXa and dictation. Keep
   the policy to named emails.

## Test plan

1. In Zero Trust: Access application for `dev-login.huxa.is` only, policy
   allow with the owner's email, login method one-time PIN. Note the team
   name and the AUD tag.
2. Build the branch in `/opt/huxa-dev/login`, preview with
   `/opt/huxa/05_scripts/preview.sh up`, log in on the phone, check the PWA
   behaviour and session expiry handling.
3. Widen the application to `huxa.is` and `*.huxa.is`, run the migration,
   ship. Tunnel as its own step afterwards.

Needed to start: team name, AUD tag, Syncthing choice.

## Current token setup: findings (2026-11-04)

Safe enough against the internet: 43-char token (~256 bits), sent only in the
Authorization header over HTTPS, not in the web build, backend on 127.0.0.1,
Cloudflare and fail2ban in front. Worth fixing regardless of login work:

- `/etc/systemd/system/huxa.service` (mode 644) holds the real token and the
  OpenAI key; `/etc/huxa/config.json` (644) holds the token; data files in
  `/var/lib/huxa` are 644. Any local account can read them. `chmod 600` the
  unit file and config, `chmod 640` the data files.
- `GET /attachments/{filename}` has no auth (filenames are report UUIDs, so
  unguessable, but links work forever for anyone).
- No token expiry or rotation; Settings shows the token in plaintext. Access
  replaces this.
- UFW rules not verified from this session (no sudo). Confirm 443 is only
  reachable from Cloudflare ranges with `sudo ufw status`.
