# Deploying to Hostinger (Business / Cloud plan, no VPS)

This prototype deploys as **three separate Hostinger Node.js Web Apps**, each connected
directly to the `orangzaibKhan/truck-fleet` GitHub repo's `main` branch — **every push
auto-rebuilds and redeploys**, no manual upload step:

| App | Root directory | Current URL |
|---|---|---|
| Backend (Fastify, SQLite) | `backend` | `https://lightsalmon-hummingbird-343950.hostingersite.com` |
| Admin dashboard (Vite/React) | `frontend` | `https://floralwhite-stinkbug-685128.hostingersite.com` |
| Driver PWA (Vite/React) | `frontend-driver` | `https://lightslategrey-hornet-501338.hostingersite.com` |

These are free Hostinger temp subdomains (`*.hostingersite.com`) — Hostinger assigns the
hostname at creation time, you don't choose it. Connect real domains later via each app's
**Domains → Connect your domain**, then update `CORS_ORIGIN` / `VITE_API_BASE_URL` below to
match.

**Requires Hostinger Business Web Hosting or any Cloud plan** — the Node.js App panel isn't
on basic shared hosting, and you don't need a VPS.

## ⚠️ 5-Web-App limit (Business plan)

Hostinger's Business plan caps you at **5 Web Apps total**, across this project and anything
else on the account. If you're at the limit, creating a new one fails with "Web App limit
reached" and the Create-site dialog offers only "Remove unused apps" or "Upgrade to Cloud
hosting" — there's no way around it short of freeing a slot or upgrading. Keep this in mind
before adding a 4th app here (e.g. a staging environment) — check `hpanel.hostinger.com/websites`
for the current count first.

## 1. One-time setup: connect GitHub

Each app was created via **Websites → Create site → Web App → Import your Git repository →
Connect with GitHub**, authorizing Hostinger's GitHub App for this repo (OAuth popup — must be
clicked by a human, browser automation can't drive it). Once authorized once, later apps reuse
the same connection ("Continue with GitHub", no popup).

For each app, after selecting the repo:
- **Root directory**: set via "Change" next to Root directory (`backend` / `frontend` /
  `frontend-driver`).
- **Framework preset**: Hostinger auto-detects **Fastify** regardless of root directory —
  for the two frontend apps, manually change this to **Vite** via the Framework preset
  dropdown, or the build won't know to run `vite build`.
- **Entry file** (backend only): Hostinger's default guess is `server.js`, which doesn't
  exist. Under "Build and output settings → Change", set it to **`dist/server.cjs`**
  explicitly — see "Why `.cjs`, not `.js`" below for why. Getting this wrong fails the deploy
  with `ERROR: Entry file not found` after a successful build (the esbuild bundle exists,
  Hostinger just doesn't know to run it).
- **Environment variables**: added before the first deploy (see table below) — Hostinger
  reruns the build once these are set.

## 2. Backend app

**Why `.cjs`, not `.js`:** Hostinger's Node.js hosting loads the entry file through LiteSpeed's
`lsnode.js`, which calls plain CommonJS `require()` on it — it cannot load an ESM module that
contains top-level `await` (`Error [ERR_REQUIRE_ASYNC_MODULE]`, confirmed live in Runtime Logs on
a real deploy). The build (`backend/package.json`) outputs CommonJS (`esbuild --format=cjs`), and
the file extension is `.cjs` specifically (not `.js`) so Node treats it as CommonJS regardless of
this package's own `"type": "module"` — `server.ts` is also written with no top-level `await`
(wrapped in an async `main()`) so it stays `require()`-able either way.

**Environment variables** (Environment variables page, or Settings → Environment Variables):

| Key | Value |
|---|---|
| `JWT_SECRET` | a random secret, generated per-deployment (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) — never reused across environments |
| `DATABASE_FILE` | an **absolute path outside the app's own directory** — see note below. Current value: `/home/u497973169/fleet-data/app.db` |
| `CORS_ORIGIN` | comma-separated list of the frontend origins, e.g. `https://floralwhite-stinkbug-685128.hostingersite.com,https://lightslategrey-hornet-501338.hostingersite.com` |

Don't set `PORT` — Hostinger injects it, and `server.ts` already reads `process.env.PORT`.

**Why `DATABASE_FILE` must point outside the app directory:** every deploy on Hostinger creates a
brand-new `hbuilds/versions/{build-id}/` folder and discards the old one — and, as of this
project's migration to GitHub-connected deploy, *every redeploy of the app itself* (not just a
new build) effectively replaces the whole site. Pointing `DATABASE_FILE` at a path under your
home directory (outside `domains/{domain}/`, outside any specific app's folder) means the SQLite
file survives redeploys **and even survives deleting and recreating the Web App resource
entirely** — confirmed when this project's backend was migrated from manual zip uploads to
GitHub auto-deploy: the old app was deleted, a new one created pointing at the same
`DATABASE_FILE` path, and all existing demo data (customers, trucks, drivers, shifts,
inspections, workshop tickets, etc.) came back intact, with the migration runner correctly
logging `Skipping NNN_*.sql (already applied)` for every migration that predated the new app.

On first boot ever (no existing `DATABASE_FILE`), the server runs migrations and seeds the demo
customer automatically (see `server.ts` — this happens on every boot, idempotently, since
Hostinger's managed Node hosting doesn't give you a reliable one-off shell for a separate
migrate/seed step).

**Get the generated login (first boot only):** open the app's **Runtime Logs** right after the
first successful deploy — it prints:
```
Seeded demo customer, 3 trucks, and 1 admin user.
Login: friend@demo.local / <generated-password>
```
This only prints once, ever, the moment the demo customer is first created — Hostinger's Runtime
Logs retention is short (roughly a day), so if you don't capture it immediately, it's gone for
good and the password cannot be recovered (it's bcrypt-hashed in the DB). Log in once with that
password, then change it from the app's Settings page, or set `SEED_ADMIN_PASSWORD` as an env var
before the first-ever boot to choose it yourself.

**Smoke test:** `curl https://<backend-host>/health` → `{"status":"ok"}`.

## 3. Admin dashboard app

| Field | Value |
|---|---|
| Framework preset | Vite (not the Fastify default) |
| Root directory | `frontend` |
| Build command | `npm run build` (auto) |
| Output directory | `dist` (auto) |
| Entry file | *(leave blank — static site, no Node process)* |

**Environment variable** (must be set before the build runs, since Vite bakes it into the bundle):

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | the backend app's URL, e.g. `https://lightsalmon-hummingbird-343950.hostingersite.com` |

## 4. Driver app

A third, independent Web App for the driver-facing side (`frontend-driver`) — its own installable
PWA, same backend, same settings as the admin frontend above (Vite preset, no entry file).

| Field | Value |
|---|---|
| Root directory | `frontend-driver` |

Same `VITE_API_BASE_URL` environment variable, pointed at the backend app. Seeded demo drivers:
`EMP-001` / `EMP-002` / `EMP-003`, password printed in the backend's Runtime Logs at first boot
(`SEED_DRIVER_PASSWORD` to set it yourself instead) — same one-time-only retention caveat as the
admin password above.

## 5. Verify end-to-end

1. Open the admin dashboard URL — the public landing page should load.
2. Click **Sign in**, log in with the seeded (or changed) credentials.
3. Confirm the dashboard loads live simulated truck data — this proves the frontend is reaching
   the backend across the two subdomains with CORS correctly locked to `CORS_ORIGIN`. A CORS
   mismatch shows as "Invalid email or password" on a *correct* password, or a generic network
   error — check the browser console for the actual CORS error naming the mismatched origin
   before assuming the backend itself is down.
4. Try the **Install app** button (desktop Chrome/Edge or a real mobile browser — not the
   in-editor preview tool, which can't register a service worker).
5. Open the driver app and sign in with `EMP-001` to confirm it reaches the same backend
   independently of the admin frontend.
6. Open the driver app's **Workshop & Parts** screen (new in v1.4) to confirm the
   `/api/driver/workshop` route and `005_workshop.sql` migration are live.

## 6. Redeploying

Since all three apps are GitHub-connected, **a normal `git push origin main` is the entire
redeploy step** — Hostinger picks it up automatically (visible under each app's Deployments tab,
"From pushes to: truck-fleet"). The old zip-upload flow (`Reupload` button, manually building and
uploading `backend-deploy.zip`) only applies if an app was created without connecting GitHub —
none of the three current apps work that way anymore.

To manually trigger a rebuild of the current commit without a new push (e.g. after changing an
env var), use the **Redeploy** button on the app's Deployments page, or **Save and redeploy** on
its Settings page.

## 7. Known deferred items (see `TODOS.md`)

Rate limiting on `/api/auth/login` and security-event logging are still not built — fine for a
single demo customer, but flagged before a second real customer or any public exposure.

**Stale resource:** `blue-dotterel-590002.hostingersite.com` (the original driver-app deployment,
from before the GitHub migration) is still live but now broken — it was built with
`VITE_API_BASE_URL` pointing at the old backend, which has since been deleted. It's safe to
delete via Websites → its "Website actions" → "Delete site" whenever convenient; it isn't
referenced from anywhere and doesn't affect the current (working) driver app at
`lightslategrey-hornet-501338.hostingersite.com`.
