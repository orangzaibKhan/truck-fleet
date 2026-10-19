-- Reopens Review Decisions #1 (auth was deferred) at the user's explicit request.
ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
