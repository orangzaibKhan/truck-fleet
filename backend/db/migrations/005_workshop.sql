-- Workshop & Parts (driver-facing PWA). Surfaces real maintenance data for
-- the driver's assigned truck - next scheduled service, any open repair
-- ticket with its parts pipeline, and past service history. No simulated
-- data: these are real tables an admin/workshop-side flow would write to.

-- Nullable - "no scheduled service" is a valid state, not an error.
ALTER TABLE trucks ADD COLUMN next_service_type TEXT;
ALTER TABLE trucks ADD COLUMN next_service_due TEXT;

-- One row per repair ticket. A truck can accumulate multiple historical
-- tickets, but in practice has at most one open (status != 'closed') at a
-- time - not enforced here as a constraint, the driver-workshop query just
-- orders by opened_at DESC and takes the most recent open one.
CREATE TABLE workshop_tickets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  truck_id TEXT NOT NULL REFERENCES trucks(id),
  issue TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('diagnosis', 'parts', 'repair', 'ready', 'closed')) DEFAULT 'diagnosis',
  opened_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  closed_at TEXT
);
CREATE INDEX idx_workshop_tickets_customer ON workshop_tickets(customer_id);
CREATE INDEX idx_workshop_tickets_truck ON workshop_tickets(truck_id);

-- Parts pipeline for a ticket - one row per part, independently tracked
-- from request through install so the driver view can show each part's
-- own status/eta rather than a single ticket-level guess.
CREATE TABLE workshop_parts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  ticket_id TEXT NOT NULL REFERENCES workshop_tickets(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requested', 'ordered', 'intransit', 'arrived', 'installed')) DEFAULT 'requested',
  eta TEXT
);
CREATE INDEX idx_workshop_parts_ticket ON workshop_parts(ticket_id);

-- Closed-out service history, independent of the ticket workflow above (a
-- service can be logged without ever having gone through a ticket, e.g.
-- routine maintenance) - this is what the driver's "past services" list reads.
CREATE TABLE workshop_service_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)))),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  truck_id TEXT NOT NULL REFERENCES trucks(id),
  service_type TEXT NOT NULL,
  cost REAL NOT NULL,
  workshop_name TEXT NOT NULL,
  serviced_at TEXT NOT NULL
);
CREATE INDEX idx_workshop_service_history_truck ON workshop_service_history(truck_id);
