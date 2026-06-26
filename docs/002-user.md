# 002 — Users & Auth (No Signup Flow)

**Status:** Implemented

## No signup flow

There is intentionally no self-service registration. Accounts are provisioned out
of band, so the public surface never exposes account creation.

- A single admin user is provisioned by `seedAdmin` (`src/db/seed.ts`).
- Its name and password come from the environment (`SEED_ADMIN_NAME`,
  `SEED_ADMIN_PASSWORD`; see `.env.example`), so **nothing user-specific is
  committed** — no emails, no names, no password hashes.
- `seedAdmin` upserts on `name`, so it is **idempotent** and safe to run
  repeatedly. This is what lets the admin be bootstrapped by simply running it on
  startup in production (Render free has no shell or one-off jobs — see
  [003-render.md](./003-render.md)).
- In development, seeding is manual (`npm run db:seed`, or folded into
  `npm run db:reset`).

## User model

- Users have **no email**. `name` is the unique login identifier.
- Schema (`src/db/schema.ts`): `id` (uuid), `name` (unique), `password_hash`,
  `created_at`.

## Passwords

- Hashed with Node's built-in `crypto.scrypt` (`src/lib/password.ts`) — no native
  dependency. The stored value bundles scheme, salt, and derived key
  (`scrypt:<salt>:<hash>`), so verification is self-contained.
- Only the hash is ever stored; the plaintext is read at seed time and discarded.

## Sessions

- On successful login the server issues a signed JWT (`hono/jwt`) stored in an
  httpOnly cookie (`SameSite=Lax`, `secure` in production), valid 7 days.
  Signed with `SESSION_SECRET`.
- `sessionMiddleware` (`src/auth.ts`) populates `c.var.user` from the cookie on
  every request; `requireAuth` redirects unauthenticated requests to `/login`.

## Routes

- `GET /login` — login form (redirects to `/` if already signed in).
- `POST /login` — verify name + password, set session cookie, redirect to `/`.
  Invalid credentials return 401 and re-render the form.
- `POST /logout` — clear the session cookie, redirect to `/login`.
- `GET /` — protected home (requires auth).
