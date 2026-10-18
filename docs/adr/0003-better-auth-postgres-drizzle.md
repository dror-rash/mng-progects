# ADR-0003: Better Auth with Postgres (Drizzle) as the user store

- **Status:** accepted
- **Date:** YYYY-MM-DD

## Context
Every project started from this template needs sign-up/login and a user store that works across independently deployed zones.

## Decision
- **Better Auth**, self-hosted in the repo, email + password to start (add providers/plugins later).
- **Postgres on Cloud SQL**, accessed with **Drizzle**. Local and CI use Postgres in Docker.
- **The shell owns** `/login`, `/signup` and `/api/auth/*`. Because every zone is served from the shell's origin, the session cookie is shared automatically.
- **Every zone validates sessions itself** through the shared `@repo/auth` package (same database, same secret). Zone middleware is only an optimistic cookie check; server code always calls `getSession()`.
- Schema lives in `packages/db`; migrations are generated, committed, and applied by CI/CD before deploys.
- Previews use a separate `app_preview` database.

## Alternatives considered
- Auth.js v5 – widely used, but session/adapter model is less suited to sharing across zones.
- Identity Platform (managed) – less code to own, but ties the template to GCP's auth product and complicates local dev and tests.
- Firestore as user store – simple scaling, but the relational model and Drizzle migrations suit most product data better.
- Shell-only session validation (zones call the shell) – tighter coupling and an extra network hop on every request.

## Consequences
- **Good:** one login across zones, no vendor lock-in, real database in dev/CI/preview, tests run against the real stack.
- **Bad / trade-offs:** every zone needs DB access and both secrets; Cloud SQL costs money even when idle; Better Auth schema must be kept in sync when plugins are added.
- **Follow-ups:** email verification and password reset (needs an email provider), social login, rate limiting, per-zone database roles if zones start owning their own tables.
