# Deploying to Hostinger (Business / Cloud plan, no VPS)

This prototype deploys as **two separate Hostinger Node.js Web Apps** on two
subdomains of the same domain:

- `api.yourdomain.com` — the Fastify backend (SQLite file database, no DB server needed)
- `app.yourdomain.com` (or your bare domain) — the Vite/React frontend, served as static files

Requires Hostinger **Business Web Hosting** or any **Cloud** plan (Startup/Professional/Enterprise) —
the Node.js App panel isn't available on basic shared hosting, and you don't need a VPS.

## 0. Before you start

- **Get a domain pointed at Hostinger** (or use a Hostinger-provided subdomain) and decide the
  two hostnames above.
- **Push this project to a GitHub repo.** This folder isn't a git repository yet. Hostinger's
  deploy flow works from a connected GitHub repo (recommended — pushes auto-redeploy) or from an
  uploaded `.zip`. If you'd rather skip GitHub for now, zip `backend/` and `frontend/` separately
  (excluding `node_modules` and `dist`) and use Hostinger's "Upload your files" option instead —
  the hPanel steps below are otherwise identical.
- Generate a real `JWT_SECRET` (don't reuse the one in your local `.env`) — e.g.
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 1. Backend app (`api.yourdomain.com`)

In hPanel: **Websites → Add Website → Node.js web app**, then either connect the GitHub repo or
upload an archive of `backend/`.

**Deploy settings:**

| Field | Value |
|---|---|
| Application type | `fastify` (auto-detected from `package.json`) |
| Root directory | `backend` (if deploying the whole repo) or `/` (if you zipped just the backend folder) |
| Node.js version | **22** or **24** — `node:sqlite` needs Node ≥ 22.5; don't pick 18 or 20 |
| Build script | `build` (runs the esbuild bundle → `dist/server.js`) |
| Output directory | leave empty — Fastify deploys the whole root directory |
| Entry file | `dist/server.js` |

**Environment variables** (Environment variables tab):

| Key | Value |
|---|---|
| `JWT_SECRET` | the secret you generated in step 0 |
| `DATABASE_FILE` | an **absolute path outside the app's own directory** — see note below, e.g. `/home/u123456789/fleet-data/app.db` |
| `CORS_ORIGIN` | `https://app.yourdomain.com` (your frontend's real URL) |

Don't set `PORT` — Hostinger injects it, and `server.ts` already reads `process.env.PORT`.

**Why `DATABASE_FILE` must point outside the app directory:** every deploy on Hostinger creates a
brand-new `hbuilds/versions/{build-id}/` folder and discards the old one. If the SQLite file lives
inside the app's own folder (the default, relative `backend/data/app.db`), it gets **wiped on every
redeploy**. Point it at a path under your home directory instead (outside `domains/{domain}/`) —
the app creates the file and directory itself on first boot (`pool.ts` already does
`mkdirSync(..., { recursive: true })`), so you just need to pick a path, not pre-create it.

Click **Deploy**. On first boot the server runs migrations and seeds the demo customer
automatically (see `server.ts` — this happens on every boot, idempotently, since Hostinger's
managed Node hosting doesn't give you a reliable one-off shell for a separate migrate/seed step).

**Get the generated login:** open the app's **Runtime Logs** right after the first successful
deploy — it prints:
```
Seeded demo customer, 3 trucks, and 1 admin user.
Login: friend@demo.local / <generated-password>
```
Log in once with that password, then change it from the app's Settings page — it won't be printed
again (re-running seed on later boots skips it once the demo customer exists).

**Smoke test:** `curl https://api.yourdomain.com/health` → `{"status":"ok"}`.

## 2. Frontend app (`app.yourdomain.com`)

Add a **second** Website → Node.js web app, pointing at the same repo/archive.

| Field | Value |
|---|---|
| Application type | `vite` |
| Root directory | `frontend` |
| Build script | `build` |
| Output directory | `dist` |
| Entry file | leave empty (static site, no Node process) |

**Environment variable** (must be set **before** the build runs, since Vite bakes it into the bundle):

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://api.yourdomain.com` |

Click **Deploy**.

## 3. Verify end-to-end

1. Open `https://app.yourdomain.com` — the public landing page should load.
2. Click **Sign in**, log in with the seeded (or changed) credentials.
3. Confirm the dashboard loads live simulated truck data — this proves the frontend is reaching
   the backend across the two subdomains with CORS correctly locked to `CORS_ORIGIN`.
4. Try the **Install app** button (desktop Chrome/Edge or a real mobile browser — not the
   in-editor preview tool, which can't register a service worker).

## 4. Known deferred items (see `TODOS.md`)

Rate limiting on `/api/auth/login` and security-event logging are still not built — fine for a
single demo customer, but flagged before a second real customer or any public exposure.
