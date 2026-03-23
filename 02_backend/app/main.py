import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from openai import OpenAI

from app.models.event import (
    EventIn, EventStored, QueryIn, QueryOut,
    DiaryIn, DiaryOut, DiarySummaryOut,
    DiaryParseIn, DiaryParseOut,
    FeedbackIn, FeedbackOut,
)

import uuid

app = FastAPI(title="HuXa", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mnemo.axex.is", "http://localhost:3000", "http://localhost:8081"],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
security = HTTPBearer()

EVENTS_FILE = Path(os.environ.get("HUXA_EVENTS_FILE", "/var/lib/huxa/events.jsonl"))
DIARY_FILE = Path(os.environ.get("HUXA_DIARY_FILE", "/var/lib/huxa/diary.jsonl"))
FEEDBACK_FILE = Path(os.environ.get("HUXA_FEEDBACK_FILE", "/var/lib/huxa/feedback.jsonl"))
AUTH_TOKEN = os.environ.get("HUXA_AUTH_TOKEN", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not AUTH_TOKEN:
        return  # No token configured — skip auth (local dev)
    if credentials.credentials != AUTH_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/events", dependencies=[Depends(verify_token)])
def list_events(
    date: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
) -> list[EventStored]:
    if not EVENTS_FILE.exists():
        return []

    # Determine date filter
    if from_date and to_date:
        filter_from = from_date
        filter_to = to_date
    elif date:
        filter_from = date
        filter_to = date
    else:
        filter_from = filter_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Use dict to deduplicate by ID (latest version wins)
    # Scan all lines so delete markers (which have the deletion timestamp,
    # not the original event timestamp) are always picked up.
    by_id = {}
    for line in EVENTS_FILE.read_text().strip().splitlines():
        if not line.strip():
            continue
        entry = json.loads(line)
        by_id[entry["id"]] = entry

    results = [EventStored(**e) for e in by_id.values()
               if not e.get("meta", {}).get("deleted")
               and filter_from <= e.get("client_timestamp", "")[:10] <= filter_to]
    results.sort(key=lambda e: e.client_timestamp, reverse=True)
    return results


@app.post("/events", status_code=201, dependencies=[Depends(verify_token)])
def create_event(event: EventIn) -> EventStored:
    received_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    stored = EventStored(
        id=event.id,
        client_timestamp=event.client_timestamp,
        received_at=received_at,
        type=event.type,
        text=event.text,
        metrics=event.metrics,
        meta=event.meta,
    )

    EVENTS_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(EVENTS_FILE, "a") as f:
        f.write(json.dumps(stored.model_dump(), default=str) + "\n")

    return stored


@app.put("/events/{event_id}", dependencies=[Depends(verify_token)])
def update_event(event_id: str, event: EventIn) -> EventStored:
    received_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    stored = EventStored(
        id=event_id,
        client_timestamp=event.client_timestamp,
        received_at=received_at,
        type=event.type,
        text=event.text,
        metrics=event.metrics,
        meta=event.meta,
    )

    with open(EVENTS_FILE, "a") as f:
        f.write(json.dumps(stored.model_dump(), default=str) + "\n")

    return stored


@app.delete("/events/{event_id}", dependencies=[Depends(verify_token)])
def delete_event(event_id: str):
    deleted = {
        "id": event_id,
        "client_timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "received_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "type": "Event",
        "text": "",
        "metrics": {},
        "meta": {"version": 1, "deleted": True},
    }
    with open(EVENTS_FILE, "a") as f:
        f.write(json.dumps(deleted) + "\n")
    return {"status": "deleted"}


@app.post("/query", dependencies=[Depends(verify_token)])
def query_events(q: QueryIn) -> QueryOut:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured",
        )

    events_text = ""
    if EVENTS_FILE.exists():
        by_id = {}
        for line in EVENTS_FILE.read_text().strip().splitlines():
            if not line.strip():
                continue
            entry = json.loads(line)
            by_id[entry["id"]] = (line, entry)
        events_text = "\n".join(line for line, entry in by_id.values() if not entry.get("meta", {}).get("deleted"))

    diary_text = ""
    if DIARY_FILE.exists():
        by_date = {}
        for line in DIARY_FILE.read_text().strip().splitlines():
            if not line.strip():
                continue
            entry = json.loads(line)
            by_date[entry["date"]] = line
        diary_text = "\n".join(by_date.values())

    if not events_text and not diary_text:
        return QueryOut(answer="No data has been logged yet.")

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are analyzing a personal health/life log containing two data sources:\n"
                    "1. Events — each line is JSON with fields: id, client_timestamp, received_at, type, text, metrics, meta\n"
                    "2. Diary entries — each line is JSON with fields: id, date, answers (object with keys like "
                    "sleep, headaches, energy, gut, physical, hip_pain, mental, life, gratitude, activity), saved_at, meta\n\n"
                    "Answer the user's question based on this data. Be concise and helpful."
                ),
            },
            {
                "role": "user",
                "content": f"Events:\n{events_text}\n\nDiary:\n{diary_text}\n\nQuestion: {q.question}",
            },
        ],
    )

    return QueryOut(answer=response.choices[0].message.content)


@app.post("/diary/parse-text", dependencies=[Depends(verify_token)])
def parse_diary_text(body: DiaryParseIn) -> DiaryParseOut:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured",
        )

    question_list = "\n".join(
        f'- key="{q["key"]}": {q["label"]}'
        for q in body.questions
    )

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You extract structured diary answers from free-form text. "
                    "The user dictated or typed answers to these questions:\n"
                    f"{question_list}\n\n"
                    "Return a JSON object with exactly those keys. "
                    "Each value must be a string with the relevant answer. "
                    "If a topic is not mentioned, use an empty string. "
                    "Lightly clean speech-to-text errors but preserve the user's voice."
                ),
            },
            {
                "role": "user",
                "content": body.raw_text,
            },
        ],
    )

    parsed = json.loads(response.choices[0].message.content)

    # Only keep expected keys, coerce values to strings
    expected_keys = {q["key"] for q in body.questions}
    answers = {
        k: str(v) for k, v in parsed.items()
        if k in expected_keys
    }
    # Fill missing keys with empty string
    for k in expected_keys:
        if k not in answers:
            answers[k] = ""

    return DiaryParseOut(answers=answers)


@app.get("/diary/{date}", dependencies=[Depends(verify_token)])
def get_diary(date: str) -> DiaryOut:
    if not DIARY_FILE.exists():
        raise HTTPException(status_code=404, detail="No diary entry for this date")

    latest = None
    for line in DIARY_FILE.read_text().strip().splitlines():
        entry = json.loads(line)
        if entry["date"] == date:
            latest = entry

    if not latest or latest.get("meta", {}).get("deleted"):
        raise HTTPException(status_code=404, detail="No diary entry for this date")

    return DiaryOut(**latest)


@app.post("/diary", status_code=201, dependencies=[Depends(verify_token)])
def create_diary(diary: DiaryIn) -> DiaryOut:
    saved_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    stored = DiaryOut(
        id=str(uuid.uuid4()),
        date=diary.date,
        answers=diary.answers,
        saved_at=saved_at,
        meta={"version": 1},
    )

    DIARY_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(DIARY_FILE, "a") as f:
        f.write(json.dumps(stored.model_dump(), default=str) + "\n")

    return stored


@app.delete("/diary/{date}", dependencies=[Depends(verify_token)])
def delete_diary(date: str):
    deleted = {
        "id": str(uuid.uuid4()),
        "date": date,
        "answers": {},
        "saved_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "meta": {"version": 1, "deleted": True},
    }
    with open(DIARY_FILE, "a") as f:
        f.write(json.dumps(deleted) + "\n")
    return {"status": "deleted"}


@app.get("/diary/{date}/summary", dependencies=[Depends(verify_token)])
def get_diary_summary(date: str) -> DiarySummaryOut:
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured",
        )

    # Deduplicate by ID (latest version wins)
    by_id = {}
    if EVENTS_FILE.exists():
        for line in EVENTS_FILE.read_text().strip().splitlines():
            entry = json.loads(line)
            if entry.get("type") == "Diary":
                continue
            ts = entry.get("client_timestamp", "")
            if ts.startswith(date):
                by_id[entry["id"]] = entry
    events = [e for e in by_id.values() if not e.get("meta", {}).get("deleted")]

    if not events:
        return DiarySummaryOut(summary="No events logged for this date.")

    events_text = "\n".join(json.dumps(e) for e in events)

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "List the key events from these personal log entries as brief bullet points for a daily diary. "
                    "Use the original wording — do not embellish, interpret, or add details that aren't in the entries. "
                    "Be concise."
                ),
            },
            {
                "role": "user",
                "content": events_text,
            },
        ],
    )

    return DiarySummaryOut(summary=response.choices[0].message.content)


@app.post("/feedback", status_code=201, dependencies=[Depends(verify_token)])
def create_feedback(fb: FeedbackIn) -> FeedbackOut:
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    stored = FeedbackOut(
        id=str(uuid.uuid4()),
        type=fb.type,
        text=fb.text,
        created_at=created_at,
    )

    FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(FEEDBACK_FILE, "a") as f:
        f.write(json.dumps(stored.model_dump(), default=str) + "\n")

    return stored


@app.get("/feedback", dependencies=[Depends(verify_token)])
def list_feedback() -> list[FeedbackOut]:
    if not FEEDBACK_FILE.exists():
        return []
    results = []
    for line in FEEDBACK_FILE.read_text().strip().splitlines():
        if not line.strip():
            continue
        results.append(FeedbackOut(**json.loads(line)))
    # Deduplicate by ID (latest wins), filter deleted
    by_id = {}
    for r in results:
        by_id[r.id] = r
    final = [f for f in by_id.values() if not f.meta.get("deleted")]
    final.sort(key=lambda f: f.created_at, reverse=True)
    return final


@app.delete("/feedback/{feedback_id}", dependencies=[Depends(verify_token)])
def delete_feedback(feedback_id: str):
    deleted = {
        "id": feedback_id,
        "type": "bug",
        "text": "",
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "meta": {"version": 1, "deleted": True},
    }
    with open(FEEDBACK_FILE, "a") as f:
        f.write(json.dumps(deleted) + "\n")
    return {"status": "deleted"}
