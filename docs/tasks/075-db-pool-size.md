# Task 075: A configurable database pool size

- **Status:** done (PR #49)
- **Milestone:** M11 Deploy to GCP (follow-up)
- **Zone / package:** `packages/db` (`pool-config.ts`), `infra/` (deploy script, preview login limits, README)
- **Feature file:** none (no visible behavior); unit tests and the infra script tests
- **Depends on:** task 068 (first GCP deploy, preview logins and their connection limits)

## Why
The app's database pool is fixed at 5 connections per instance (`buildPoolConfig` in `packages/db/src/pool-config.ts`). On `db-f1-micro` (25 connections, 3 reserved, so 22 for logins) previews take up to 9 (`preview_runtime` 6, `preview_owner` 3) and `main` keeps 13, but `main`'s stated worst case is 15 (3 zones × 1 busy instance × 5). A setting lets previews run with fewer connections, so more previews fit and `main` keeps enough. Found in task 068's review (2026-11-05).

## Scope
- **`packages/db`:** `buildPoolConfig` reads the pool size from `DB_POOL_MAX` (a positive whole number); unset keeps 5. An invalid value throws at startup with a message naming `DB_POOL_MAX`, like the existing missing-variable errors.
- **Deploy (`infra/scripts/deploy-service.sh`):** previews run with `DB_POOL_MAX=2` per instance; `main` sets its value explicitly (see open questions).
- **Preview login limit (`infra/scripts/provision-db-logins.mjs`):** recompute `preview_runtime`'s `CONNECTION LIMIT` from the new pool size (3 zones × 1 instance × 2 per active preview, plus the role check), and the verification expects the new value.
- **Main's share:** recompute it on `db-f1-micro` (22 login connections minus the preview limits) and check it against `main`'s worst case with its pool size; write both numbers in `infra/README.md` ("Preview logins" and "Known limits / follow-ups").

## Out of scope
- A bigger Cloud SQL tier or a connection pooler (PgBouncer, Cloud SQL Managed Connection Pooling).
- Changing `main`'s `max_instances`.
- The maintenance connection's pool (seeds, e2e fixtures, DB tests).

## Acceptance criteria
- [x] With `DB_POOL_MAX` unset the pool has 5 connections; set to 2 it has 2; an invalid value fails with a message naming `DB_POOL_MAX`.
- [x] Preview revisions run with `DB_POOL_MAX=2`, and `preview_runtime`'s connection limit matches the recomputed number (the preview verification fails otherwise).
- [x] `infra/README.md` shows the arithmetic, and `main`'s worst case fits its share.
- [x] `pnpm test:infra` passes.

## Approach (brief)
A small parser for `DB_POOL_MAX` next to `buildPoolConfig` (TDD in `pool-config.test.ts`), then the deploy script and its test (`test-deploy-service.sh`), then the provisioning limit and its test, then the README numbers.

## Test plan
- Unit: `pool-config.test.ts` (unset, valid, zero, negative, not a number).
- Infra scripts: `test-deploy-service.sh` (previews get `DB_POOL_MAX=2`), `provision-db-logins.test.mjs` (the new limit is set and verified).
- By hand after the first deploy with it: no connection errors in the Cloud Run logs while `@smoke` runs.

## Open questions
1. `main`'s pool size: keep 5 (worst case 15 against a share of 13 + whatever previews free up) or lower it, e.g. 4 (worst case 12)?
2. Does the shell (auth only) need the same pool size as the dashboard, or can it run smaller?

## Progress log
- 2026-11-05 – Planned from task 068's review rounds 4–5: the pool size is fixed at 5, and `main`'s worst case (15) exceeds its connection share (13) on `db-f1-micro`. After the POC unless the first deploy shows connection errors.
- 2026-11-05 – The first previews (PRs #47, #48) failed `@smoke` "Create a customer" with `too many connections for role "preview_runtime"`: three preview zones each open up to 5 connections against a limit of 6. Owner's answers: `main` runs `DB_POOL_MAX=4` per instance (worst case 3 × 4 = 12, inside its share); the shell uses the same pool size as the other zones; run now, in parallel with task 061.
- 2026-11-05 – Started in lane 2 (`chore/db-pool-size`).
- 2026-11-05 – Implemented. `buildPoolConfig` reads `DB_POOL_MAX` (`parsePoolMax`: unset or empty keeps 5; anything but a positive whole number throws naming it). `environment.sh` holds the sizes (`MAIN_DB_POOL_MAX=4`, `PREVIEW_DB_POOL_MAX=2`, `DB_POOL_MAX` per environment) and `deploy-service.sh` sets it on every zone. `preview_runtime`'s limit is now computed: 3 zones × 1 instance × 2 + the role check 1 = 7 (`CONNECTION_BUDGET` in `provision-db-logins.mjs`; a test fails when it and `environment.sh` differ). Previews 7 + 3 = 10 of 22, `main` keeps 12 = its worst case 3 × 1 × 4 (no margin; README). Order: previews only verify, so after merge the main deploy must finish before any preview passes (`connection limit is 6, not 7`), and open PRs on the older `main` fail until rebased. No Terraform change. `pnpm test`, `pnpm test:infra`, `test:db`, lint, typecheck and `@smoke` (1 worker) pass in the lane.

- 2026-11-05 – Red runs, recorded after review (each new test before its code):
  - `pool-config.test.ts`: `Tests 7 failed | 15 passed (22)`: `DB_POOL_MAX=2` still gave `max` 5, and for each of `"0"`, `"-1"`, `"abc"`, `"2.5"`, `"2x"`, `" "` the `toThrow(/DB_POOL_MAX/)` assertion got no error (`Expected: null, Received: undefined` at `pool-config.test.ts:110`). Green: 22 passed.
  - `test-environment.sh`: `FAIL - previews run 2 database connections per instance (expected '2', got '')`, `FAIL - main runs 4 … (expected '4', got '')`, `FAIL - the pool sizes agree … (expected '4 2', got '')`; `41 passed, 3 failed`. Green: 44 passed.
  - `test-deploy-service.sh`: `FAIL - a preview runs a pool of 2 per instance`, `FAIL - main runs a pool of 4 per instance`; `12 passed, 2 failed`. Green: 14 passed.
  - `provision-db-logins.test.mjs`: the file failed to load, `SyntaxError: The requested module './provision-db-logins.mjs' does not provide an export named 'CONNECTION_BUDGET'`. Green: 26 passed.
- 2026-11-05 – Review fixes. README: CPU is always allocated on the preview and main services (`cpu-throttling: false`), so `pg`'s 10 s idle timeout runs between requests and older revisions release their connections within about 10 s; `main`'s 12 fits at steady state with no margin, `app` has no `CONNECTION LIMIT`, and operator sessions and a main deploy's own connections count against it; a skipped preview-login step leaves the old limit until the next main deploy. New guard tests: `CONNECTION_BUDGET.previewInstances` equals Terraform's `preview_max_instances` default, and `DB_POOL_MAX` equals `PREVIEW_`/`MAIN_DB_POOL_MAX` in `environment.sh`; the deploy test's greps are anchored. These guards passed on their first run (they check agreement, not new behavior), so each was shown to fail by mutating the code and then restoring it: with `previewInstances: 2`, 4 tests fail including the Terraform one; with preview `DB_POOL_MAX="3"`, `test-environment.sh` fails 2; with the deploy appending a `0` (`DB_POOL_MAX=20`/`40`), both anchored deploy checks fail (the old unanchored grep would have passed `20`). `DB_POOL_MAX` added to turbo's `globalPassThroughEnv` and `.env.example` (commented); `pool-config.ts` notes the maintenance pool honours it; `docs/PLAN.md` updated.
- 2026-11-05 – Merged (PR #49). Still to check by hand: the next PR preview passes `@smoke` with no `too many connections` in the Cloud Run logs (task 061's PR).
- 2026-11-05 – Checked by hand on PR #50's preview: `@smoke` 3/3, and the preview services logged no `too many connections` (the last was at 15:01 UTC, before this task merged) and no errors at all during the run.

## Parking lot
- A `connectionTimeoutMillis` on the pool, so that with small pools a broken "one connection per request" convention (e.g. a nested checkout outside `withAccess` while a transaction holds the only free connection) fails with an error instead of hanging.
