#!/usr/bin/env python3
"""Copy hip pain and the old 1-10 sleep rating from diary entries into Sleep events.

For each diary date (latest non-deleted entry), `hip_pain` and `sleep` go into
`metrics.hip_pain` and `metrics.sleep_quality` of the Sleep event logged that day.
An existing Sleep event gets a new version appended with the missing keys; a day
without one gets a new Sleep event at 08:00Z. Values already on the event are kept.
Diary lines are not changed. Also adds the hip_pain and stomach fields to the Sleep category.
Safe to run twice.
"""

import argparse
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

DIARY_TO_METRIC = {"hip_pain": "hip_pain", "sleep": "sleep_quality"}
NEW_FIELDS = [
    {"key": "hip_pain", "label": "Hip pain in the night", "type": "scale"},
    {"key": "stomach", "label": "Stomach in the night", "type": "scale"},
]


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data-dir", default="/var/lib/huxa")
    parser.add_argument("--dry-run", action="store_true", help="print what would be appended")
    args = parser.parse_args()
    data = Path(args.data_dir)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    diary = {}
    for entry in read_jsonl(data / "diary.jsonl"):
        diary[entry["date"]] = entry

    events = {}
    for entry in read_jsonl(data / "events.jsonl"):
        events[entry["id"]] = entry
    sleep_by_date = {}
    for e in sorted(events.values(), key=lambda e: e["client_timestamp"]):
        if e["type"] == "Sleep" and not e.get("meta", {}).get("deleted"):
            sleep_by_date.setdefault(e["client_timestamp"][:10], e)

    to_append = []
    for date in sorted(diary):
        entry = diary[date]
        if entry.get("meta", {}).get("deleted"):
            continue
        answers = entry.get("answers", {})
        metrics = {m: answers[k] for k, m in DIARY_TO_METRIC.items() if isinstance(answers.get(k), (int, float))}
        if not metrics:
            continue
        existing = sleep_by_date.get(date)
        if existing:
            missing = {k: v for k, v in metrics.items() if k not in existing.get("metrics", {})}
            if not missing:
                continue
            to_append.append({**existing, "received_at": now, "metrics": {**existing.get("metrics", {}), **missing}})
        else:
            to_append.append({
                "id": str(uuid.uuid4()),
                "client_timestamp": date + "T08:00:00Z",
                "received_at": now,
                "type": "Sleep",
                "text": "",
                "metrics": metrics,
                "meta": {"version": 1, "source": "diary"},
            })

    for e in to_append:
        print(("update " if e["id"] in events else "new    ") + e["client_timestamp"][:10] + " " + json.dumps(e["metrics"]))
    print(f"{len(to_append)} Sleep events to append")

    categories_file = data / "categories.json"
    categories = json.loads(categories_file.read_text()) if categories_file.exists() else None
    sleep_cat = next((c for c in categories or [] if c["key"] == "Sleep"), None)
    existing_keys = {f["key"] for f in sleep_cat.get("fields", [])} if sleep_cat else set()
    add_fields = [f for f in NEW_FIELDS if sleep_cat is not None and f["key"] not in existing_keys]
    for f in add_fields:
        print(f"add {f['key']} field to the Sleep category")

    if args.dry_run:
        return

    with open(data / "events.jsonl", "a") as f:
        for e in to_append:
            f.write(json.dumps(e) + "\n")
    if add_fields:
        fields = sleep_cat.setdefault("fields", [])
        after = max((i + 1 for i, f in enumerate(fields) if f["key"] in ("rested", "hip_pain")), default=len(fields))
        for f in add_fields:
            fields.insert(after, f)
            after += 1
        categories_file.write_text(json.dumps(categories, indent=2) + "\n")


if __name__ == "__main__":
    main()
