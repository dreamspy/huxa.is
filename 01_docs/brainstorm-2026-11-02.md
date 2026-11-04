# Brainstorm: making HuXa better (2026-11-02)

Starting point: about 200 events since February 2026, 53 diary entries, 22 feedback items. Usage peaked in March (92 events) and tapered to single digits by June. Ideas below are ordered roughly by payoff per effort.

## 1. Make the data trustworthy to ask about

Two feedback items are Ask HuXa giving wrong dates ("when did I last take Ajovy") and unstable counts. Sending the whole log to the model and hoping it counts right will keep failing.

Fix: give the model small deterministic tools instead of the raw log. The backend implements them against the JSONL and the model only phrases the answer.

- `count_events(pattern, type, from, to)`
- `last_event(pattern, type)`
- `events_between(from, to, type)`

At the current data size this also removes the context-window concern behind the Smart Query roadmap item, without embeddings or a vector store. Every downstream "second brain" feature depends on answers being right, so this comes first.

## 2. Clear the feedback backlog

Concrete, cheap, unaddressed items from `feedback.jsonl`:

- Change an event's type when editing it
- Text boxes grow as you type
- Feedback history refreshes after submitting a bug or idea
- Attached images don't render in feedback history
- Scrollbar overlaps the save button and other controls on Mac web
- Diary quick entry truncated, stray vertical line when scrolling

One session could clear most of these.

## 3. Decisions as first-class things with a validity window

Own feedback idea. A Decision event carries `metrics.valid_until` or `metrics.review_on`. A Decisions view lists active, expiring and expired decisions. A "Revisit" button appends a follow-up event linked by `metrics.decision_id`. Append-only stays intact and it maps cleanly to a Postgres table.

## 4. Periodic summaries that talk back

README Phase 2 and the "automatic summaries on Mondays" feedback are the same thing. A systemd timer runs Monday morning and writes `derived/weekly/2026-W45.md`:

- counts per category and streaks
- metric trends (sleep score, energy, mood from the reset category)
- three model-written observations

The app shows a "This week" card on the home screen. The usage curve suggests logging drops when nothing talks back; summaries are the cheapest way to change that.

## 5. Lower the friction of logging

- Quick-log buttons for the top three recurring events: one tap, no compose screen
- Voice input as planned in `voice-input-plan.md` (researched, not built)
- URL scheme or iOS Shortcut, e.g. `huxa://log?type=Symptom&text=...`, so Siri or a home-screen shortcut can log without opening the app
- Reminder at a fixed time if nothing was logged today

## 6. Let the model categorise

A single "Just type" box on the home screen. A cheap model picks the category and fills structured fields, the app shows the result for one-tap confirmation before saving. Recurring medication such as Ajovy gets tagged consistently, which fixes retrieval from the input side as well.

## 7. Visualise the metrics already collected

Nineteen events carry metrics and nothing shows them. A metrics screen per category: one line per numeric or scale field over time, a boolean field as a dot strip. The field types already exist, so this is nearly free.

## 8. Infrastructure worth finishing

- Cloudflare Access to replace the bearer token screen (already on the roadmap)
- Nightly tar of `/var/lib/huxa` to S3 as a second backup beside Syncthing

## Suggested order

1. Tools for Ask HuXa
2. Feedback backlog
3. Weekly summaries

These three turn it from a logger into something that answers back correctly.
