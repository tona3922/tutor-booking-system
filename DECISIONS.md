# DECISIONS.md — Bright Path Learning Centre, scheduling & conflict detection

## 1. Read the situation

### Questions I'd ask the owner first

1. Is "conflict detection" meant to *prevent* new conflicts going forward, *flag* what's already sitting in the spreadsheet, or both? — decides whether importing the export should reject bad rows or just load and report on them.
2. Is the receptionist's "two students, one tutor, one room" exam-pair practice something you want this tool to actively support (and keep capped at two), or something you'd rather see stamped out now that there's a system watching? — decides whether I treat it as an allowed exception or flag every instance.
3. Is the 6-bookings/day cap the same for every tutor, or does it vary tutor to tutor? — decides whether it's a constant or a per-tutor field.
4. When a lesson moves after the 16:00 cut-off, does the tutor need to be actively pinged (SMS/WhatsApp/push), or is "visible next time they open the tool" enough for this version? — decides whether I need an outbox/notification mechanism or just an audit trail on the record.
5. Is Mai the only person who'll use this, or do tutors/you need direct access too? — decides whether "no login" is a real simplification or a gap I'm about to regret.
6. Are the 6 rooms and current tutor roster stable enough to hardcode, or do they change often enough to need their own admin screens? — decides whether Room/Tutor need write endpoints in this pass.

### Where the brief argues with itself

- **The Monday lesson.** The rules say the centre is closed Monday, but the export has a lesson (`L032`, 2026-03-09) booked on that exact day — "moved from Sunday at the family's request." I read this the way I read the tutor-load breach below: the rule is real and worth enforcing *going forward*, but the historical row isn't something I retroactively reject on import — it's evidence Mai already bends this rule occasionally. `GET /api/conflicts` flags it; the seed loader doesn't refuse to load it.
- **The exam pair.** By the letter of "a room holds one lesson at a time," `L009`/`L010` (same room, same tutor, same exact slot, two different students) is a textbook double-booking — exactly what the owner says "can never happen again." But the receptionist describes doing this on purpose, "most weeks," as a paid practice. I read the owner's "never happen again" as being about *accidental* double-booking, not this *deliberate* one, and encoded it as an allowed exception — same room, same tutor, identical start time and duration, exactly two lessons — capped at two, so a third lesson landing on that slot is still flagged like any other conflict.
- **"Mid-morning to mid-evening."** Every other rule in the brief has a real number attached (4 hours, 16:00, 6 rooms, 6 bookings) except the opening hours, which are vague on purpose or by omission. I didn't invent clock times to enforce, since guessing wrong is worse than not enforcing yet — I only enforce the part of the rule I actually have a number for (closed on Monday), and left this as an open question above rather than a silent assumption.
- **The 7th booking.** The rule caps a tutor at 6 lessons/day; the export has tutor T1 at 7 on 2026-03-06. Same reading as the Monday case: hold the line at 6 for anything new, surface the existing breach as a conflict rather than pretending it isn't there.

### Assumptions I had to invent

- **Student identity is a name string, not an ID.** The export never gives one, so "the same student" is a trimmed, case-insensitive name match. Two different kids who happen to share a spelling would incorrectly collide, and a typo'd name would silently escape detection — this is the weakest part of the model and is called out again below.
- **`cancelled_at` timestamps are centre-local.** The CSV carries a `+07:00` offset; I dropped it and stored plain local timestamps, on the assumption this system has no cross-timezone use case worth modelling yet.
- **"Today" is pinned, not real.** `2026-03-06 09:00` — a Friday inside the seed week, and the day the tutor-load cap is actually broken in the data, so the default view shows something worth looking at rather than an empty day.
- **One tutor, one room per lesson, always.** Every row in the export fits this; there's no substitute-teacher or co-teaching case in the data to design around.

## 2. Choose what to build

Features I can see this tool needing, one line each:

- **Conflict detection** — flag/prevent a student, tutor, or room being double-booked, and a tutor exceeding the daily cap.
- **Cancellation & reschedule handling** — enforce the 4-hour free-cancel window and give a moved lesson a visible trail instead of a silent overwrite.
- **A "today" dashboard** — one glance at the day's schedule, no scrolling.
- **Tutor day-sheet messaging** — generate/send each tutor their day so Mai stops retyping it into WhatsApp by hand.
- **Family-facing self-booking** — let a family book directly instead of going through Mai.
- **Historical reporting** — no-show/cancellation rates per tutor or family, for the owner.

**Chosen: conflict detection.** It's the owner's own stated top pain point ("if the system allows it, the system is broken"), it's the brief's own title, and it's the one feature the rest of the list depends on: a "today" dashboard is just a schedule view without it, a reschedule flow is unsafe without it, and self-booking is actively dangerous without it. Building it first means anything layered on top later inherits safety instead of having to retrofit it.

**What I leave broken by choosing it:** no notification path (a tutor still has to open the tool to see today — WhatsApp isn't touched); no auth or access control (fine for one receptionist's laptop, not fine the moment this is reachable by more than one device); no admin screens for adding/removing tutors or rooms (seeded directly into the database); the 4-hour cancellation charge is computed on cancel but nothing acts on the result (no invoice, no ledger, just a flag in the response).

## 3. Design and build that one

### Data model

- `Tutor(id, name, subject, phone)`
- `Room(id, label)` — 6 fixed rows, matching "six rooms above a bakery."
- `Lesson(id, date, startTime, durationMin, student, tutorId, roomId, status, cancelledAt, note, movedFromLessonId, createdAt)`, `status ∈ {BOOKED, CANCELLED, NO_SHOW, MOVED}`.

`BOOKED` and `NO_SHOW` occupy the room/tutor/student slot; `CANCELLED` and `MOVED` free it — this is the schema's reading of "cancelling frees the room and the slot... a no-show... frees neither."

### Representing a lesson cancelled or moved after the tutor was told

A cancelled lesson is never deleted — `status → CANCELLED`, `cancelledAt` records when, so "who was told what, when" survives. A **moved** lesson is not a cancellation: the existing row's `status → MOVED` (`cancelledAt` stays null, since charging logic must not treat a move as a cancellation), and a brand-new row is inserted with `movedFromLessonId` pointing at the row it replaced. The API never lets a client mutate an existing lesson's date/time/room/tutor in place (see the rejected endpoint below) — this is exactly the schema answer to the 16:00 cut-off rule: a change after the cut-off has to be *visible as a change*, and mutating the old row in place would make it invisible.

### Rules enforced in the database vs. in code

**In the database:** structural invariants only — `tutor_id`/`room_id` NOT NULL, the `status` enum. Nothing about scheduling *policy* lives in a constraint.

**In code (`LessonService`):** every actual scheduling rule — overlap, the daily load cap, the closed day. These are business policy that's already shown signs of moving (the owner wants the load cap enforced harder than Mai currently enforces it; the opening-hours rule isn't even pinned to real numbers yet), so they need to live somewhere a future maintainer can read and change them without a migration. The one rule that has a genuinely clean *declarative* database answer — no overlapping lessons in the same room — needs Postgres's `EXCLUDE USING gist` with the `btree_gist` extension, and has no clean way to carve out the exam-pair exception inside a constraint expression. That's more machinery than a 2.5-hour tool justifies, so overlap is enforced in code instead, protected against races by taking a `PESSIMISTIC_WRITE` lock on the `Room` and `Tutor` rows before checking (the same pattern this codebase already used for service-bay/technician bookings) plus a Postgres advisory lock keyed on the student's name, since there's no student row to lock.

### API shape

- `GET /api/lessons?date=` — the day's schedule.
- `GET /api/conflicts?date=` — every conflict found in that day's *existing* schedule (this is how the seed data's tutor-overload day and Monday lesson surface, without having been rejected on import).
- `POST /api/lessons` — create; runs the same conflict checks before committing; `409` with a structured conflict list on failure.
- `PATCH /api/lessons/{id}/cancel` — marks cancelled, returns whether it falls inside the 4-hour charge window.
- `PATCH /api/lessons/{id}/reschedule` — the *only* way to move a lesson: old row → `MOVED`, new row created and validated exactly like a fresh booking.
- `GET /api/tutors`, `GET /api/rooms` — lookups for the UI.

### One endpoint I rejected

`PUT /api/lessons/{id}` — a generic full-record update letting a client silently overwrite date/time/room/tutor on an existing row. Rejected because it's precisely the "quietly overwriting what the tutor was already told" failure the cut-off rule prohibits. Every move has to go through `reschedule`, which leaves the old row behind as `MOVED` instead of mutating it away.

## 4. Reflect

**What I'd build next with another week:** a real notification path so a moved/cancelled lesson actually reaches the tutor instead of waiting to be looked up; a real `Student` entity with its own id, so name-collisions stop being a live risk; per-tutor load caps and real opening-hours numbers instead of one constant; auth once more than one person needs to touch this; a way to apply a whole day's worth of post-cutoff changes at once instead of one API call per lesson.

**What I know is weak:** the student-double-booking check is a name match, not an id match — a typo'd name silently escapes detection, and two different kids who share a name would silently collide. The advisory-lock approach for student concurrency is a reasonable stopgap but doesn't extend cleanly once there's a real `Student` table with its own primary key to lock instead.

**Where the AI assistant helped:** reconciling the brief itself — it's deliberately garbled if you copy-paste it, so I worked from the rendered page images instead; tracing the 34-row CSV by hand to find the specific conflicting row pairs (`L007`/`L008`, `L033`/`L034`, the T1 overload day) and confirm the exam-pair pattern before writing the exception logic; carrying over the existing codebase's `SELECT ... FOR UPDATE` locking pattern onto the new Room/Tutor/student-advisory-lock scheme; and generating the CRUD boilerplate (entities, DTOs, repositories, controllers) so the actual conflict-rule logic in `LessonService` is what I spent the thinking time on, and what I can walk through line by line.

**One suggestion I threw away, and why I was right to:** a Postgres `EXCLUDE USING gist` constraint to enforce room-overlap declaratively at the database layer. It's the textbook-correct answer for "no overlapping intervals," but it needs the `btree_gist` extension enabled and has no clean way to encode the exam-pair exception — that exception is a *legitimate* overlap by design, and expressing "unless it's exactly this shape" inside a constraint would have produced something uglier and harder to change than the equivalent twenty lines of Java in `LessonService`, for a rule that's already shown signs of changing.
