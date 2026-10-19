# TODOs

## Driver PWA view (deferred from prototype scope)

**What:** The driver-facing mobile/PWA view from the original fleet-monitoring spec — login, see assigned truck, start/end shift, status, submit inspection checklist.

**Why deferred:** It doesn't demonstrate the prototype's one differentiated piece (trip-cycle detection + utilization math) to the person actually evaluating it (the friend). Building a second UI surface for a role (driver) nobody is testing yet is scope the prototype doesn't need to prove its point.

**Context:** Originally scoped as M3 in the approved design doc (`~/.gstack/projects/Claude/OK-design-20261019-002653.md`). Cut during `/plan-ceo-review`'s Scope Reduction pass (file count was already over the review's 15-file comfort threshold, and demand is still unvalidated beyond one person).

**Depends on / blocked by:** A real driver or a real second customer — build it once one exists, not before.

## Security hardening (before a second real customer or public exposure)

**What:** Rate limiting on `/api/auth/login` (`@fastify/rate-limit`), add security-event logging (failed logins, 401/403s).

**Done (Hostinger deployment prep):** CORS is now configurable via the `CORS_ORIGIN` env var (`app.ts`) instead of hardcoded `origin: true` — set it to the real frontend domain in Hostinger's environment variables; still reflects any origin if left unset (dev default).

**Why the rest is deferred:** Flagged by `ecc:security-reviewer` during the M3.5 auth build as real gaps, not blocking for a single-demo-customer prototype with no attacker-reachable second tenant. Not deferred as "fine forever" — tracked here so it doesn't get forgotten.

**Depends on / blocked by:** Before onboarding a second real customer or exposing this beyond the one demo user.
