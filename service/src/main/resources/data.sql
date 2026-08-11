-- Sample seed data for local development (PostgreSQL, persistent).
-- Not auto-run by Spring Boot (Postgres isn't an embedded DB) -- apply once with:
--   psql -p 5433 -U tommyvo -d bookingdb -f data.sql
-- Idempotent: safe to re-run, existing rows are left untouched.
-- All customers below share the demo password: password123

INSERT INTO dealership (id, name, address, open_time, close_time) VALUES
  (1, 'Downtown Auto Service', '123 Main St, Springfield', '2000-01-01 08:00:00', '2000-01-01 18:00:00'),
  (2, 'Westside Motors Service Center', '456 Oak Ave, Springfield', '2000-01-01 07:30:00', '2000-01-01 19:00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO technician (id, dealership_id, name, skill, status) VALUES
  (1, 1, 'John Carter', 'Engine Repair', 'AVAILABLE'),
  (2, 1, 'Maria Lopez', 'Brakes & Suspension', 'AVAILABLE'),
  (3, 1, 'Sam Nguyen', 'Electrical Systems', 'BUSY'),
  (4, 2, 'David Kim', 'Transmission', 'AVAILABLE'),
  (5, 2, 'Priya Patel', 'Tire & Alignment', 'OFF_DUTY')
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_bay (id, dealership_id, bay_number, status) VALUES
  (1, 1, 'A1', 'AVAILABLE'),
  (2, 1, 'A2', 'OCCUPIED'),
  (3, 1, 'A3', 'AVAILABLE'),
  (4, 2, 'B1', 'AVAILABLE'),
  (5, 2, 'B2', 'MAINTENANCE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer (id, name, phone, email, password_hash) VALUES
  (1, 'Alice Johnson', '555-0101', 'alice.johnson@example.com', '$2y$10$1ndrmRxARt1zhXGRI9W7BepZVPKiUaKu/4CvHQNZE8uGNtbs5qf8y'),
  (2, 'Brian Smith', '555-0102', 'brian.smith@example.com', '$2y$10$1ndrmRxARt1zhXGRI9W7BepZVPKiUaKu/4CvHQNZE8uGNtbs5qf8y'),
  (3, 'Carla Diaz', '555-0103', 'carla.diaz@example.com', '$2y$10$1ndrmRxARt1zhXGRI9W7BepZVPKiUaKu/4CvHQNZE8uGNtbs5qf8y')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicle (id, customer_id, plate_number, brand, model, vehicle_year) VALUES
  (1, 1, 'ABC-1234', 'Toyota', 'Camry', 2019),
  (2, 1, 'XYZ-9988', 'Honda', 'CR-V', 2021),
  (3, 2, 'LMN-4567', 'Ford', 'F-150', 2018),
  (4, 3, 'QRS-7788', 'Tesla', 'Model 3', 2022)
ON CONFLICT (id) DO NOTHING;

INSERT INTO booking (id, customer_id, vehicle_id, dealership_id, service_bay_id, start_time, end_time, status, created_at) VALUES
  (1, 1, 1, 1, 1, '2026-08-05 09:00:00', '2026-08-05 11:00:00', 'CONFIRMED', '2026-08-01 10:00:00'),
  (2, 1, 2, 1, 2, '2026-08-06 13:00:00', '2026-08-06 15:00:00', 'PENDING', '2026-08-02 09:30:00'),
  (3, 2, 3, 2, 4, '2026-08-05 10:00:00', '2026-08-05 12:30:00', 'IN_PROGRESS', '2026-08-01 14:15:00'),
  (4, 3, 4, 1, 3, '2026-08-03 08:00:00', '2026-08-03 09:30:00', 'COMPLETED', '2026-07-29 11:00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO booking_technician (booking_id, technician_id, role, assigned_at) VALUES
  (1, 1, 'Lead Technician', '2026-08-01 10:05:00'),
  (1, 2, 'Assistant', '2026-08-01 10:05:00'),
  (3, 4, 'Lead Technician', '2026-08-01 14:20:00'),
  (4, 3, 'Lead Technician', '2026-07-29 11:05:00')
ON CONFLICT (booking_id, technician_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('dealership', 'id'), GREATEST((SELECT MAX(id) FROM dealership), 1));
SELECT setval(pg_get_serial_sequence('technician', 'id'), GREATEST((SELECT MAX(id) FROM technician), 1));
SELECT setval(pg_get_serial_sequence('service_bay', 'id'), GREATEST((SELECT MAX(id) FROM service_bay), 1));
SELECT setval(pg_get_serial_sequence('customer', 'id'), GREATEST((SELECT MAX(id) FROM customer), 1));
SELECT setval(pg_get_serial_sequence('vehicle', 'id'), GREATEST((SELECT MAX(id) FROM vehicle), 1));
SELECT setval(pg_get_serial_sequence('booking', 'id'), GREATEST((SELECT MAX(id) FROM booking), 1));
