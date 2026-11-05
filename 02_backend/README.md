# HuXa Backend

FastAPI application for the HuXa event engine.

## Endpoints

### Events

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/events?date=YYYY-MM-DD` | Bearer token | List events for a date |
| POST | `/events` | Bearer token | Append a new event |
| PUT | `/events/{id}` | Bearer token | Soft-delete and re-append (edit) |
| DELETE | `/events/{id}` | Bearer token | Soft-delete an event |

### Diary

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/diary/{date}` | Bearer token | Get latest diary entry for a date |
| POST | `/diary` | Bearer token | Save a diary entry |
| DELETE | `/diary/{date}` | Bearer token | Soft-delete a diary entry |
| GET | `/diary/{date}/summary` | Bearer token | AI summary of the day's events |
| POST | `/diary/parse-text` | Bearer token | Parse free-form text into diary fields (AI, the `mid` query tier model) |

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | Bearer token | List categories (defaults if no file yet) |
| PUT | `/categories` | Bearer token | Replace the category list |

Categories are stored in `categories.json` (default `/var/lib/huxa/categories.json`), separate from the event stream. Each entry is `{ "key", "label", "enabled", "fields" }`; `event.type` stores the key. Disabling hides a category temporarily; deleting removes it. Neither affects events already logged, which store the type string directly.

Each field is `{ "key", "label", "type" }` where type is one of `scale` (1–10), `number`, `duration`, `boolean`, or `text`. A `duration` is entered in the app as HH:MM in 15-minute steps and arrives as decimal hours (7:30 is `7.5`). Field values submitted with an event go into `event.metrics` keyed by field key. Duplicate category keys or duplicate field keys within a category are rejected with 400.

The default list includes a Sleep category with `sleep_quality` and `rested` (scale), `sleep_hours` (duration) and `dreams` (text) fields; the comment is the event `text`. Defaults are only served while `categories.json` does not exist.

### Reports (Feedback / Bug Reports)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reports` | Bearer token | Submit a bug report or feature request |
| GET | `/reports` | Bearer token | List all reports |
| DELETE | `/reports/{id}` | Bearer token | Delete a report |
| POST | `/reports/{id}/attachment` | Bearer token | Upload an image attachment |

### Other

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check; also reports `auth_required` |
| POST | `/query` | Bearer token | Ask a question about events and diary (OpenAI). Body: `{"question": "...", "effort": "low" \| "mid" \| "high"}`, default `mid`. The answer is Markdown, which the app renders |
| POST | `/transcribe` | Bearer token | Speech to text (OpenAI). Multipart `file` with an audio clip (webm, mp4, m4a, mp3, ogg, wav, flac; max 25 MB), returns `{"text": "..."}` |
| POST | `/transcribe/session` | Bearer token | Mints a short-lived client secret for a live OpenAI Realtime transcription session, returns `{"client_secret": "ek_...", "expires_at": <unix seconds>}`. The app uses this for dictation |
| GET | `/attachments/{filename}` | No | Serve uploaded attachment images |

### Query effort tiers

`POST /query` sends the whole event log and diary to OpenAI. The `effort` field picks the model;
the mapping lives in `QUERY_MODELS` in `app/main.py`. Measured on the real log (~30K prompt tokens,
100 runs each of a counting question, 2026-11-02):

| Effort | Model | Use for | Correct | Median | p90 | Cost per ask |
|---|---|---|---|---|---|---|
| `low` | gpt-4o-mini | Summaries, quick lookups, finding an entry | ~20% | 1 s | 1 s | $0.005 |
| `mid` (default) | gpt-5-mini, `reasoning_effort=low` | Counting, comparisons, careful reads of the log | 96% | 3 s | 5 s | $0.008 |
| `high` | gpt-5-nano, `reasoning_effort=medium` | Exact numbers, patterns across months | 99% | 12 s | 19 s | $0.002 |

Non-reasoning models guess at counts; `low` is only useful for summaries and quick lookups.
The system prompt tells the model that counting questions refer to event entries, not diary
mentions: free-text diary mentions were the main cause of off-by-one answers, and asking the model
to count those as well tripled latency without improving accuracy. Re-run the benchmark before
changing the tier models or the prompt.

### Transcription

Dictation in the app is live: `POST /transcribe/session` creates a client secret with
`client.realtime.client_secrets.create` for a `transcription` session (model
`TRANSCRIBE_LIVE_MODEL`, `gpt-live-transcribe`, expected languages `TRANSCRIBE_LIVE_LANGUAGES`,
Icelandic and English, no server turn detection, near-field noise reduction). The secret is good
for `TRANSCRIBE_SESSION_SECRET_S` (120 s) to open a session; the session itself may run longer.
The browser then connects straight to `wss://api.openai.com/v1/realtime` with the secret as the
`openai-insecure-api-key.<secret>` WebSocket subprotocol, streams mono 16-bit PCM at 24 kHz in
`input_audio_buffer.append` events and receives
`conversation.item.input_audio_transcription.delta` events while the user speaks. Stop sends
`input_audio_buffer.commit`; the `...completed` event carries the final text. The audio never
passes through this server. Measured on the server: deltas arrive word by word about a second
behind the speech, the final text about half a second after the commit.

`POST /transcribe` is the older clip upload and still works: it forwards the clip as-is to
OpenAI's transcription API with `TRANSCRIBE_MODEL` (`gpt-4o-transcribe`). The file extension
passed to OpenAI is derived from the part's content type, so the client's filename does not
matter. Language is auto-detected.

## Local Development

The easiest way to run the backend is via the dev server script, which starts both the backend and the Expo frontend:

```bash
./05_scripts/dev_server.sh          # Backend + Expo (iOS/Android)
./05_scripts/dev_server.sh --web    # Backend + Expo web (browser)
```

See `01_docs/development.md` for details.

### Running the backend standalone

```bash
cd 02_backend
python3.13 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file (gitignored):

```bash
# Empty disables auth (local dev). Set a value to require a bearer token.
HUXA_AUTH_TOKEN=
HUXA_EVENTS_FILE=/tmp/huxa_dev/events.jsonl
HUXA_DIARY_FILE=/tmp/huxa_dev/diary.jsonl
HUXA_FEEDBACK_FILE=/tmp/huxa_dev/feedback.jsonl
HUXA_CATEGORIES_FILE=/tmp/huxa_dev/categories.json
OPENAI_API_KEY=sk-...
```

```bash
set -a && source .env && set +a
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Environment Variables

| Variable | Description |
|---|---|
| `HUXA_EVENTS_FILE` | Path to events.jsonl (default: `/var/lib/huxa/events.jsonl`) |
| `HUXA_DIARY_FILE` | Path to diary.jsonl (default: `/var/lib/huxa/diary.jsonl`) |
| `HUXA_FEEDBACK_FILE` | Path to feedback.jsonl (default: `/var/lib/huxa/feedback.jsonl`) |
| `HUXA_CATEGORIES_FILE` | Path to categories.json (default: `/var/lib/huxa/categories.json`) |
| `HUXA_ATTACHMENTS_DIR` | Path to attachments directory (default: `/var/lib/huxa/attachments`) |
| `HUXA_AUTH_TOKEN` | Bearer token for authentication. Empty disables auth (local dev only): `/health` then reports `auth_required: false` and the app skips the token screen |
| `OPENAI_API_KEY` | OpenAI API key (required for `/query`, `/diary/{date}/summary`, `/diary/parse-text`, `/transcribe`, `/transcribe/session`) |
| `HUXA_CONFIG` | Path to config.json (optional) |
