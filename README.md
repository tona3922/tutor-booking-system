# Booking System

Car dealership service booking: customers book a technician, service bay, and dealership for their vehicle.

- `service/` — Spring Boot (Java 17, Maven) REST API, in-memory H2 by default.
- `frontend/` — React + Vite + TypeScript UI: browse dealerships/availability freely, then log
  in/sign up and pick a vehicle only once you're ready to confirm a booking. A "View my bookings"
  entry point lets a returning customer log in and see/cancel their appointments directly.

## Domain model

- `Customer` — owns `Vehicle`s
- `Vehicle` — belongs to one `Customer`
- `Dealership` — service location
- `Technician` — belongs to one `Dealership`
- `ServiceBay` — belongs to one `Dealership`
- `Booking` — customer + vehicle + dealership + service bay + start/end time + status (`PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- `BookingTechnician` — join table assigning one or more technicians to a booking, with a `role`

## Run the service

```bash
cd service
mvn spring-boot:run
```

API listens on `http://localhost:8080`. Resources: `/api/customers`, `/api/vehicles`, `/api/dealerships`,
`/api/technicians`, `/api/service-bays`, `/api/bookings`. Booking endpoints also include
`POST/DELETE /api/bookings/{id}/technicians[/{technicianId}]` for assigning technicians, plus
`PATCH .../status` and `POST .../cancel`.

Server-side validation: a vehicle must belong to the booking's customer, a service bay/technician must belong to
the booking's dealership, and overlapping bookings on the same bay or technician are rejected with `409 Conflict`.

**Availability search**: `GET /api/technicians` and `GET /api/service-bays` accept optional `name`/`bayNumber`,
`dealershipId`, and `startTime`+`endTime` (must be given together) query params — when a time window is given,
only entries with `status=AVAILABLE` and no overlapping booking in that window are returned.
`GET /api/dealerships/availability?startTime=&endTime=&name=` (time required) returns each matching dealership
annotated with `availableBayCount`/`availableTechnicianCount` for that window — this is what backs the frontend's
search dashboard. No new tables: it's computed on the fly from existing bookings, so there's nothing to keep in sync.

**Authentication**: JWT bearer tokens. `POST /api/auth/register` and `POST /api/auth/login` return
`{token, customer}`; send `Authorization: Bearer <token>` on subsequent requests. `/api/vehicles/**`,
`/api/bookings/**`, and `/api/customers/me` all require a valid token, and the server derives
`customerId` from the token rather than trusting a client-supplied value — a booking, vehicle, or
customer record can only be read/modified by the customer who owns it (`403` otherwise). Passwords
are hashed with BCrypt; the JWT signing secret lives in `application.yml` under `app.jwt.secret`
(override via `APP_JWT_SECRET` before any real deployment — the checked-in value is dev-only).
`/api/dealerships/**`, `/api/technicians/**`, and `/api/service-bays/**` remain fully public in
both directions (browsing and management) since there's no admin role yet — anyone can currently
create/edit dealerships, technicians, and bays. Adding an admin role to lock those down would be a
natural next step.

H2 console: `http://localhost:8080/h2-console` (JDBC URL `jdbc:h2:mem:bookingdb`, user `sa`, no password).

Note: `java`/`mvn` weren't on PATH in this environment but are installed via Homebrew
(`openjdk@17`, `maven`). Either `brew link openjdk@17` or export before running:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
```

## Run the frontend

```bash
cd frontend
npm install   # already run once
npm run dev
```

Dev server on `http://localhost:5173`, proxies `/api/*` to the service on port 8080.
