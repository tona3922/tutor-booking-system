# DECISIONS.md — Bright Path Learning Centre, scheduling & conflict detection

## 1. Context

Bright Path is a small tutoring centre with 6 rooms and 12 tutors, run day-to-day by a receptionist
booking 1:1, 60 or 90-minute lessons by hand. The one failure that matters to the owner is a room,
tutor, or student getting double-booked — "if the system allows it, the system is broken." This system
replaces manual booking with an app that a family can use directly, with double-booking prevented
structurally (server-side, before a lesson is ever saved) instead of depending on someone holding the
whole day's schedule in their head.

## 2. Requirements

### Functional

- Book a lesson: student, tutor, room, date, start time, duration (60 or 90 min).
- Cancel a booked lesson; cancelling within 4 hours of start is flagged chargeable in the response.
- Edit (reschedule) a booked lesson's tutor, room, date, or time.
- View a day's schedule, and the conflicts already present in it.
- Prevent: overlapping bookings in the same room; a tutor double-booked; a student double-booked; a
  tutor exceeding 6 lessons/day; a new booking on a Monday (the centre is closed).
- Allow exactly one deliberate exception: two lessons sharing a room, tutor, start time and duration with
  two _different_ students (the "exam pair" case) — a third lesson on that same slot is rejected like any
  other conflict.
- Bulk-load historical lessons from a front-desk CSV export without forcing them through the same-day
  validation a live booking gets, but still be able to surface whatever rule violations that import
  carries — a lesson already on a Monday, a tutor already over 6/day, etc.

### Non-functional

- Availability — target 24/7 booking, flagged not yet met (single instance, no redundancy)
- Latency — target p99 < 100ms for a booking write
- Consistency over availability
- Backup & recovery — target RTO ≤ 2 min, flagged not yet met (no automated backup/replication configured)
- Durability of history — added since it's already true today: cancelled/moved rows are kept, not deleted

### Out of scope

- No auth or access control. The frontend's "signed in as" name gates which UI buttons render; the API
  itself has no session and takes no user identity.
- No admin UI for tutors/rooms — the roster is edited directly in `data.sql`.
- No notification path — a moved/cancelled lesson has no way to reach the tutor other than opening the
  tool.

## 3. Data Model
<img width="733" height="484" alt="image" src="https://github.com/user-attachments/assets/0ea0ee0a-99f1-40c7-a566-cb1a14a527c0" />

- `Tutor(id, name, subject, phone)` — 12 rows, 3 each across Maths, English, Physics, Chemistry.
- `Room(id, label)` — 6 fixed rows.
- `Lesson(id, date, startTime, durationMin, student, tutorId, roomId, status, cancelledAt, note, movedFromLessonId, createdAt)`
  `status ∈ {BOOKED, CANCELLED, NO_SHOW, MOVED}`.
- Cancelling sets `status → CANCELLED` and records `cancelledAt`; the row is never deleted.
- Rescheduling never mutates a lesson in place: the old row's `status → MOVED` (`cancelledAt` stays
  null), and a new row is inserted with `movedFromLessonId` pointing back at it. There is no
  `PUT /api/lessons/{id}` — every move goes through `reschedule`, so a change is always a new row, never a
  silent overwrite.

## 4. API Design

| Method | Path                           | Purpose                                                   |
| ------ | ------------------------------ | --------------------------------------------------------- |
| GET    | `/api/lessons?date=`           | A day's schedule                                          |
| POST   | `/api/lessons`                 | Create; `409` + structured conflict list on failure       |
| PATCH  | `/api/lessons/{id}/cancel`     | Cancel; returns whether it falls inside the 4-hour window |
| PATCH  | `/api/lessons/{id}/reschedule` | The only way to move a lesson (old row → `MOVED`)         |

### `GET /api/lessons?date=2026-03-06`

No request body.

```json
// 200 OK
[
  {
    "id": 21,
    "date": "2026-03-06",
    "startTime": "11:30:00",
    "durationMin": 60,
    "student": "Tran Bao Long",
    "tutorId": 1,
    "roomId": 1,
    "status": "BOOKED",
    "cancelledAt": null,
    "note": null,
    "movedFromLessonId": null,
    "createdAt": "2026-08-11T17:30:36.115963",
    "endTime": "12:30:00"
  }
]
```

### `POST /api/lessons`

```json
// request
{
  "date": "2026-03-06",
  "startTime": "15:00:00",
  "durationMin": 60,
  "student": "Toan Vo",
  "tutorId": 3,
  "roomId": 6,
  "note": null
}
```

```json
// 201 Created
{
  "id": 38,
  "date": "2026-03-06",
  "startTime": "15:00:00",
  "durationMin": 60,
  "student": "Toan Vo",
  "tutorId": 3,
  "roomId": 6,
  "status": "BOOKED",
  "cancelledAt": null,
  "note": null,
  "movedFromLessonId": null,
  "createdAt": "2026-08-11T21:00:17.594555",
  "endTime": "16:00:00"
}
```

```json
// 409 Conflict — validateAgainstExisting() rejected it
{
  "error": "Scheduling conflict",
  "conflicts": [
    {
      "type": "TUTOR_DOUBLE_BOOKED",
      "lessonIds": [20],
      "message": "Tutor 3 is already booked (lesson 20)"
    }
  ]
}
```

### `PATCH /api/lessons/{id}/cancel`

No request body.

```json
// 200 OK
{
  "lesson": {
    "id": 38,
    "date": "2026-03-06",
    "startTime": "15:00:00",
    "durationMin": 60,
    "student": "Toan Vo",
    "tutorId": 3,
    "roomId": 6,
    "status": "CANCELLED",
    "cancelledAt": "2026-08-12T09:14:02.001",
    "note": null,
    "movedFromLessonId": null,
    "createdAt": "2026-08-11T21:00:17.594555",
    "endTime": "16:00:00"
  },
  "chargeable": false
}
```

`chargeable` is `true` when `cancelledAt` falls inside 4 hours of `date` + `startTime` — nothing currently
acts on it.

### `PATCH /api/lessons/{id}/reschedule`

Response is the **new** row — the old id (`43` here) still exists in the database with `status: "MOVED"`.

```json
// request
{
  "date": "2026-03-06",
  "startTime": "16:00:00",
  "durationMin": 60,
  "tutorId": 3,
  "roomId": 5,
  "note": null
}
```

```json
// 200 OK
{
  "id": 44,
  "date": "2026-03-06",
  "startTime": "16:00:00",
  "durationMin": 60,
  "student": "Toan Vo",
  "tutorId": 3,
  "roomId": 5,
  "status": "BOOKED",
  "cancelledAt": null,
  "note": null,
  "movedFromLessonId": 43,
  "createdAt": "2026-08-11T22:15:53.643537",
  "endTime": "17:00:00"
}
```

`student` is carried over from the original row — `reschedule` has no `student` field in its request body,
since who the lesson is for can't change, only when/where/with whom.
## 5. High-level Design

<img width="877" height="582" alt="image" src="https://github.com/user-attachments/assets/0d4ca9e5-fc0a-422f-b59f-fa8ee106cd4f" />

## 6. Flow

### 6.1. Booking Flow
<img width="704" height="375" alt="image" src="https://github.com/user-attachments/assets/aff33314-a5b5-4041-bbce-78656fddc41b" />

Edit (`reschedule`) runs the identical check with one difference: the lesson being moved is excluded from
its own overlap check, then the old row flips to `MOVED` and the new row is inserted in the same
transaction. Cancel skips validation entirely — freeing a slot can't create a conflict — and only computes
whether `now` falls inside the 4-hour window.

### 6.2. Schedule Flow
<img width="748" height="385" alt="image" src="https://github.com/user-attachments/assets/9bc4594c-5d16-4af0-92d4-0c327df15bcf" />

The schedule read is a plain query. The conflicts read is the counterpart to §6.1's write-time check, run
against whatever is already committed — it's what lets a CSV-backfilled Monday lesson or a
seven-lessons-in-a-day tutor surface without ever having been rejected on the way in.
