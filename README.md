# Bright Path Learning Centre — scheduling & conflict detection

An internal tool for a one-location tutoring centre in Da Nang: Mai (the receptionist) currently
runs the whole schedule from a spreadsheet and WhatsApp. This build does one thing — **detect and
prevent scheduling conflicts** (a student, tutor, or room double-booked; a tutor over the daily
booking cap) — chosen over everything else this tool could eventually do. See `DECISIONS.md` for
the reasoning, the rules this enforces, and what's deliberately left out of scope.

- `service/` — Spring Boot (Java 17, Maven) REST API, Postgres.
- `frontend/` — React + Vite + TypeScript: a single schedule view for one day at a time, with
  conflicts highlighted and a form to add a lesson.
## Diagram
- High-level design diagram
<img width="877" height="582" alt="image" src="https://github.com/user-attachments/assets/c911d832-6ee8-49c1-80a1-7442d56eb513" />

- Use-case diagram
<img width="792" height="648" alt="image" src="https://github.com/user-attachments/assets/e9758022-878f-49e5-a1d4-53b4f53914c1" />

## Domain model

- `Tutor(id, name, subject, phone)`
- `Room(id, label)` — 6 fixed rooms.
- `Lesson(id, date, startTime, durationMin, student, tutorId, roomId, status, cancelledAt, note, movedFromLessonId, createdAt)`,
  `status ∈ {BOOKED, CANCELLED, NO_SHOW, MOVED}`.

## Run the service

```bash
cd service
mvn spring-boot:run
```

API listens on `http://localhost:8080`. Requires a local Postgres reachable at the URL in
`service/src/main/resources/application.yml` (defaults to `jdbc:postgresql://localhost:5433/bookingdb`).

**Load the seed data** (translated from the take-home brief's `tutors.csv`/`lessons_export.csv`) once the
schema exists (`ddl-auto: update` creates the tables on first run, then stop the app and load data):

```bash
psql -p 5433 -U tommyvo -d bookingdb -f service/src/main/resources/data.sql
```

Seeds 6 rooms, the 3 tutors from the export, and all 34 lessons — including the rule violations
that were already in the real data (see below). Safe to re-run.

### Pinned date

The seed data covers **2026-03-03 through 2026-03-10**. "Today" is pinned in code
(`service/.../time/NowProvider.java`) to **2026-03-06 09:00** — a Friday inside that week, and the
day a tutor goes over the daily booking cap in the data — rather than the real clock. The frontend
defaults its date picker to the same date.

### What loading the seed data shows

`GET /api/conflicts?date=2026-03-04` → `Le Minh Chau` double-booked into two lessons at once
(`L007`/`L008`) — the exact "booked into two places" failure the owner describes — while the
same day's `L009`/`L010` (one tutor, one room, two different students, identical slot) is **not**
flagged, since that's the receptionist's own sanctioned "exam pair" practice.

`GET /api/conflicts?date=2026-03-06` → a tutor with 7 bookings against a 6/day cap.

`GET /api/conflicts?date=2026-03-10` → a tutor double-booked into two different rooms at the same
time (`L033`/`L034`).

## API

- `GET /api/lessons?date=YYYY-MM-DD` — a day's schedule (defaults to the pinned date).
- `GET /api/conflicts?date=YYYY-MM-DD` — every conflict found in that day's existing schedule.
- `POST /api/lessons` — create a lesson; validated against the same rules before committing;
  `409` with a structured conflict list on failure.
- `PATCH /api/lessons/{id}/cancel` — cancel; response includes whether it's chargeable (inside
  the 4-hour window).
- `PATCH /api/lessons/{id}/reschedule` — the only way to move a lesson; the old row becomes
  `MOVED` and a new, freshly-validated row is created (see `DECISIONS.md` for why).
- `GET /api/tutors`, `GET /api/rooms` — lookups.

## Run the frontend

```bash
cd frontend
npm install   # already run once
npm run dev
```

Dev server on `http://localhost:5173`, proxies `/api/*` to the service on port 8080.
