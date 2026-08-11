-- Seed data for local development (PostgreSQL, persistent).
-- Source: the Bright Path take-home brief's tutors.csv and lessons_export.csv (front-desk
-- spreadsheet export dated 2026-03-10), translated 1:1 onto the Room/Tutor/Lesson schema.
-- Not auto-run by Spring Boot (Postgres isn't an embedded DB) -- apply once with:
--   psql -p 5433 -U tommyvo -d bookingdb -f data.sql
-- Idempotent: safe to re-run, existing rows are left untouched.
--
-- Cancelled-at timestamps in the source CSV carry a +07:00 offset; the `cancelled_at` column is
-- a plain LocalDateTime, so the offset is dropped on the assumption that every timestamp in the
-- export is already centre-local time (see DECISIONS.md).

-- Six rooms per the brief ("six rooms above a bakery"); the sample week only ever uses R1-R3.
INSERT INTO room (id, label) VALUES
  (1, 'R1'),
  (2, 'R2'),
  (3, 'R3'),
  (4, 'R4'),
  (5, 'R5'),
  (6, 'R6')
ON CONFLICT (id) DO NOTHING;

-- The centre has 12 tutors on payroll, 3 per subject across the 4 subjects it teaches;
-- tutors.csv (and the lesson history below) only exercises the first 3.
INSERT INTO tutor (id, name, subject, phone) VALUES
  (1,  'Ngoc Anh',    'Maths',     '090xxx1122'),
  (2,  'Pham Duc',    'English',   '090xxx3344'),
  (3,  'Le Thu',      'Physics',   '090xxx5566'),
  (4,  'Tran Minh',   'Chemistry', '090xxx7788'),
  (5,  'Nguyen Lan',  'Maths',     '090xxx9900'),
  (6,  'Hoang Nam',   'Maths',     '090xxx1133'),
  (7,  'Vu Linh',     'English',   '090xxx2244'),
  (8,  'Dang Khoi',   'English',   '090xxx3355'),
  (9,  'Bui Trang',   'Physics',   '090xxx4466'),
  (10, 'Do Hai',      'Physics',   '090xxx5577'),
  (11, 'Ly Giang',    'Chemistry', '090xxx6688'),
  (12, 'Phan Yen',    'Chemistry', '090xxx7799')
ON CONFLICT (id) DO NOTHING;

-- lessons_export.csv, L001-L034, loaded as-is (including its rule violations - see
-- GET /api/conflicts and DECISIONS.md for why these are detected rather than rejected on import).
INSERT INTO lesson (id, date, start_time, duration_min, student, tutor_id, room_id, status, cancelled_at, note, created_at) VALUES
  (1,  '2026-03-03', '09:00', 60, 'Le Minh Chau',   1, 1, 'BOOKED',    NULL, NULL, now()),
  (2,  '2026-03-03', '09:00', 60, 'Tran Bao Long',  2, 2, 'BOOKED',    NULL, NULL, now()),
  (3,  '2026-03-03', '10:30', 90, 'Nguyen Thi Ha',  1, 1, 'BOOKED',    NULL, NULL, now()),
  (4,  '2026-03-03', '10:30', 60, 'Do Van Kien',    3, 3, 'BOOKED',    NULL, NULL, now()),
  (5,  '2026-03-03', '14:00', 60, 'Vu Ha My',       2, 2, 'CANCELLED', '2026-03-03 08:15:00', 'family cancelled', now()),
  (6,  '2026-03-03', '15:30', 90, 'Bui An Nhien',   1, 1, 'BOOKED',    NULL, NULL, now()),
  (7,  '2026-03-04', '09:00', 60, 'Le Minh Chau',   3, 3, 'BOOKED',    NULL, NULL, now()),
  (8,  '2026-03-04', '09:00', 60, 'Le Minh Chau',   2, 2, 'BOOKED',    NULL, 'added by phone; family confirmed', now()),
  (9,  '2026-03-04', '11:00', 90, 'Tran Bao Long',  1, 1, 'BOOKED',    NULL, 'exam pair - half price', now()),
  (10, '2026-03-04', '11:00', 90, 'Nguyen Thi Ha',  1, 1, 'BOOKED',    NULL, 'exam pair - half price', now()),
  (11, '2026-03-04', '14:00', 60, 'Do Van Kien',    3, 3, 'BOOKED',    NULL, NULL, now()),
  (12, '2026-03-04', '16:00', 60, 'Vu Ha My',       2, 2, 'BOOKED',    NULL, NULL, now()),
  (13, '2026-03-05', '09:00', 60, 'Bui An Nhien',   1, 1, 'BOOKED',    NULL, NULL, now()),
  (14, '2026-03-05', '10:30', 90, 'Le Minh Chau',   3, 3, 'BOOKED',    NULL, NULL, now()),
  (15, '2026-03-05', '13:00', 60, 'Tran Bao Long',  2, 2, 'NO_SHOW',   NULL, NULL, now()),
  (16, '2026-03-05', '14:30', 90, 'Nguyen Thi Ha',  1, 1, 'BOOKED',    NULL, NULL, now()),
  (17, '2026-03-05', '16:00', 60, 'Do Van Kien',    3, 3, 'CANCELLED', '2026-03-05 14:40:00', 'tutor sick', now()),
  (18, '2026-03-06', '09:00', 60, 'Vu Ha My',       1, 1, 'BOOKED',    NULL, NULL, now()),
  (19, '2026-03-06', '09:00', 60, 'Le Minh Chau',   2, 2, 'BOOKED',    NULL, NULL, now()),
  (20, '2026-03-06', '10:30', 90, 'Bui An Nhien',   3, 3, 'BOOKED',    NULL, NULL, now()),
  (21, '2026-03-06', '11:30', 60, 'Tran Bao Long',  1, 1, 'BOOKED',    NULL, NULL, now()),
  (22, '2026-03-06', '13:00', 60, 'Tran Bao Long',  1, 1, 'BOOKED',    NULL, NULL, now()),
  (23, '2026-03-06', '14:30', 60, 'Nguyen Thi Ha',  2, 2, 'BOOKED',    NULL, NULL, now()),
  (24, '2026-03-06', '16:00', 60, 'Do Van Kien',    1, 1, 'BOOKED',    NULL, NULL, now()),
  (25, '2026-03-06', '17:30', 60, 'Vu Ha My',       1, 1, 'BOOKED',    NULL, NULL, now()),
  (26, '2026-03-06', '19:00', 60, 'Le Minh Chau',   1, 1, 'BOOKED',    NULL, NULL, now()),
  (27, '2026-03-06', '20:30', 60, 'Bui An Nhien',   1, 1, 'BOOKED',    NULL, NULL, now()),
  (28, '2026-03-07', '09:00', 90, 'Tran Bao Long',  3, 3, 'BOOKED',    NULL, NULL, now()),
  (29, '2026-03-07', '11:00', 60, 'Nguyen Thi Ha',  2, 2, 'BOOKED',    NULL, NULL, now()),
  (30, '2026-03-07', '15:00', 60, 'Bui An Nhien',   1, 1, 'BOOKED',    NULL, NULL, now()),
  (31, '2026-03-08', '10:00', 60, 'Do Van Kien',    1, 1, 'BOOKED',    NULL, NULL, now()),
  (32, '2026-03-09', '10:00', 60, 'Vu Ha My',       3, 3, 'BOOKED',    NULL, 'moved from Sunday at the family''s request', now()),
  (33, '2026-03-10', '09:00', 60, 'Le Minh Chau',   1, 1, 'BOOKED',    NULL, NULL, now()),
  (34, '2026-03-10', '09:00', 60, 'Tran Bao Long',  1, 2, 'BOOKED',    NULL, NULL, now())
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('room', 'id'), GREATEST((SELECT MAX(id) FROM room), 1));
SELECT setval(pg_get_serial_sequence('tutor', 'id'), GREATEST((SELECT MAX(id) FROM tutor), 1));
SELECT setval(pg_get_serial_sequence('lesson', 'id'), GREATEST((SELECT MAX(id) FROM lesson), 1));
