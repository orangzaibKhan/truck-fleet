-- Driver-facing PWA (previously deferred, see TODOS.md / Review Decisions).
-- Drivers authenticate separately from users (employee_id + password, not
-- email) - the design spec is explicit this keeps sign-in simple for field
-- workers. truck_id is the driver's current assigned truck (nullable - not
-- every driver has one yet).
-- SQLite can't add a UNIQUE column via ALTER TABLE - plain column + a
-- separate unique index instead.
ALTER TABLE drivers ADD COLUMN employee_id TEXT;
ALTER TABLE drivers ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE drivers ADD COLUMN truck_id TEXT REFERENCES trucks(id);
CREATE UNIQUE INDEX idx_drivers_employee_id ON drivers(employee_id);

-- One row per shift (Start Shift -> End Shift). Handover fields are filled
-- when the shift ends - the design's "End of Shift Handover" modal is
-- mandatory, not optional, so these stay NULL only while a shift is active.
CREATE TABLE shifts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  truck_id TEXT NOT NULL REFERENCES trucks(id),
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ended_at TEXT,
  truck_condition TEXT CHECK (truck_condition IN ('clean_ready', 'needs_cleaning', 'minor_damage')),
  fuel_level TEXT CHECK (fuel_level IN ('full', '3_4', '1_2', '1_4', 'low')),
  handover_notes TEXT,
  safety_score INTEGER NOT NULL DEFAULT 100
);
CREATE INDEX idx_shifts_customer ON shifts(customer_id);
CREATE INDEX idx_shifts_driver ON shifts(driver_id);

-- Pre-shift checklist. 15 fixed items (see i18n dictionary on the frontend
-- for the labels) - results is a JSON array of "pass"/"fail", same order.
CREATE TABLE inspections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  shift_id TEXT NOT NULL REFERENCES shifts(id),
  results TEXT NOT NULL,
  has_fail INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_inspections_customer ON inspections(customer_id);

-- One row per driver-reported trip cycle. Stage is self-reported by the
-- driver tapping through Loading -> Traveling -> Dumping -> Returning -
-- independent of the admin dashboard's simulated-telemetry stage inference
-- (M1), which is a different data source for a different audience.
CREATE TABLE driver_trips (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  shift_id TEXT NOT NULL REFERENCES shifts(id),
  stage TEXT NOT NULL CHECK (stage IN ('loading', 'traveling', 'dumping', 'returning', 'completed')) DEFAULT 'loading',
  distance_km REAL NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);
CREATE INDEX idx_driver_trips_customer ON driver_trips(customer_id);
CREATE INDEX idx_driver_trips_shift ON driver_trips(shift_id);

CREATE TABLE fuel_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  truck_id TEXT NOT NULL REFERENCES trucks(id),
  liters REAL NOT NULL,
  price_per_liter REAL NOT NULL,
  total_cost REAL NOT NULL,
  station TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_fuel_logs_customer ON fuel_logs(customer_id);

-- Breakdown and accident reports share a shape (both: auto-filled context +
-- structured fields + description + offline-queueable submit) - one table,
-- kind discriminates. Accident-only fields are NULL on a breakdown row.
CREATE TABLE incident_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  truck_id TEXT NOT NULL REFERENCES trucks(id),
  kind TEXT NOT NULL CHECK (kind IN ('breakdown', 'accident')),
  issue_type TEXT,
  priority TEXT,
  severity TEXT,
  has_injuries INTEGER NOT NULL DEFAULT 0,
  injured_count INTEGER,
  other_vehicle_plate TEXT,
  other_driver_name TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_incident_reports_customer ON incident_reports(customer_id);
