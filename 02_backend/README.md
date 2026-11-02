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
| POST | `/diary/parse-text` | Bearer token | Parse free-form text into diary fields (AI) |

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | Bearer token | List categories (defaults if no file yet) |
| PUT | `/categories` | Bearer token | Replace the category list |

Categories are stored in `categories.json` (default `/var/lib/huxa/categories.json`), separate from the event stream. Each entry is `{ "key", "label", "enabled", "fields" }`; `event.type` stores the key. Disabling hides a category temporarily; deleting removes it. Neither affects events already logged, which store the type string directly.

Each field is `{ "key", "label", "type" }` where type is one of `scale` (1–10), `number`, `boolean`, or `text`. Field values submitted with an event go into `event.metrics` keyed by field key. Duplicate category keys or duplicate field keys within a category are rejected with 400.

The default list includes a Sleep category with `sleep_score` (number) and `sleep_quality` (scale) fields; the comment is the event `text`. Defaults are only served while `categories.json` does not exist.

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
| POST | `/query` | Bearer token | Ask a question about events and diary (OpenAI). Body: `{"question": "...", "effort": "low" \| "mid" \| "high"}`, default `mid` |
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
| `OPENAI_API_KEY` | OpenAI API key (required for `/query`, `/diary/{date}/summary`, `/diary/parse-text`) |
| `HUXA_CONFIG` | Path to config.json (optional) |
