# TODOs

## Driver PWA (built - see `frontend-driver/`)

**What was deferred, now done:** The driver-facing mobile/PWA view from the original fleet-monitoring spec, built from a separate interactive HTML design prototype (`designs.html`, v1.3) the user brought in later: Login (Employee ID + password), Home (shift start/end, quick actions), Daily Inspection (15-item checklist), Active Trip (4-stage driver-advanced stepper), Fuel Log, Shift Handover modal, Driver Leaderboard, Trip History & Performance, simulated Supervisor Chat, simulated Live Map, Report Breakdown/Accident, Notifications, Profile. Full EN/AR + RTL. Its own installable PWA manifest, separate from the admin dashboard's.

**Scope decisions (explicitly chosen over the alternatives when this was built):** full 13-screen build in one pass (not staged by milestone); offline mode is demo-level (queues in memory, replays on "online" toggle) rather than real service-worker background sync; supervisor chat is simulated client-side (canned replies) - no WebSocket backend, no supervisor-side inbox in the admin dashboard.

**New backend surface:** `drivers` table extended with `employee_id`/`password_hash`/`truck_id`; new tables `shifts`, `inspections`, `driver_trips`, `fuel_logs`, `incident_reports` (migration `004_driver_app.sql`); routes in `backend/src/routes/driver-app.ts`. Driver-reported trip stage is a separate data source from the admin dashboard's simulated-telemetry stage inference (M1) - not unified, by design.

**Still not built:** real-time chat/websockets, a supervisor-side inbox, real offline-first sync (IndexedDB + background sync), photo upload (the photo-capture UI is a visual stub, no backend storage).

## Security hardening (before a second real customer or public exposure)

**What:** Rate limiting on `/api/auth/login` (`@fastify/rate-limit`), add security-event logging (failed logins, 401/403s).

**Done (Hostinger deployment prep):** CORS is now configurable via the `CORS_ORIGIN` env var (`app.ts`) instead of hardcoded `origin: true` — set it to the real frontend domain in Hostinger's environment variables; still reflects any origin if left unset (dev default).

**Why the rest is deferred:** Flagged by `ecc:security-reviewer` during the M3.5 auth build as real gaps, not blocking for a single-demo-customer prototype with no attacker-reachable second tenant. Not deferred as "fine forever" — tracked here so it doesn't get forgotten.

**Depends on / blocked by:** Before onboarding a second real customer or exposing this beyond the one demo user.
