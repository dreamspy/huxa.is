# HuXa Backend

FastAPI application for the HuXa event engine.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/events` | Bearer token | Append a new event |
| POST | `/query` | Bearer token | Ask a question about events (OpenAI) |
| GET | `/diary/{date}` | Bearer token | Get latest diary entry for a date |
| POST | `/diary` | Bearer token | Save a diary entry |
| GET | `/diary/{date}/summary` | Bearer token | AI summary of the day's events |

## Local Development

The easiest way to run the backend is via the dev server script, which starts both the backend and the Expo frontend:

```bash
./05_scripts/dev_server.sh          # Backend + Expo (iOS/Android)
./05_scripts/dev_server.sh --web    # Backend + Expo web (browser)
```

See `01_docs/deployment.md` for details.

### Running the backend standalone

```bash
cd 02_backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file (gitignored):

```bash
HUXA_AUTH_TOKEN=dev-token
HUXA_EVENTS_FILE=/tmp/huxa_dev/events.jsonl
HUXA_DIARY_FILE=/tmp/huxa_dev/diary.jsonl
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
| `HUXA_AUTH_TOKEN` | Bearer token for authentication |
| `OPENAI_API_KEY` | OpenAI API key (required for `/query` and `/diary/{date}/summary`) |
| `HUXA_CONFIG` | Path to config.json (optional) |
