import 'dotenv/config';
import { buildApp } from './app';
import { runMigrations } from './core/db/migrate';
import { runSeed } from './core/db/seed';

// Run on every boot, not as a separate deploy step - idempotent (migrate tracks
// applied files, seed skips if the demo customer exists already), and Hostinger's
// managed Node.js App hosting doesn't reliably offer a one-off command shell for
// a dedicated migrate/seed step. See Review Decisions #6 in the design doc.
await runMigrations();
await runSeed();

const app = await buildApp();
const port = Number(process.env.PORT ?? 3001);

// host: '0.0.0.0' - Fastify defaults to 127.0.0.1, which is not reachable from
// outside the container on Hostinger's Node.js App hosting.
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
