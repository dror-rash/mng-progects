# Task 074: A separate runtime login for the database

- **Status:** todo (after the POC)
- **Milestone:** M11 Deploy to GCP (follow-up)
- **Zone / package:** `infra/`, `.github/workflows/`, `packages/db`, `docs/adr/`
- **Feature file:** none (no visible behavior); checked by the runtime role check and DB tests
- **Depends on:** task 068 (first GCP deploy, its runtime role check and preview identities)

## Why
Today the app connects with the login that owns the tables and switches to `app_user` on connect (`-c role=app_user`, ADR-0006). Because that login owns everything, a single `SET ROLE <owner>` (or `RESET ROLE`) on a pooled connection would leave row-level security behind for as long as that connection lives. A runtime login that owns nothing and can only become `app_user` closes that door: there is nothing better to switch to. Found in task 068's review (2026-11-04).

## Scope
- **ADR-0006 amendment:** the runtime uses its own Cloud SQL login. This reverses the alternative ADR-0006 turned down ("A separate Cloud SQL login user for the runtime"); record why (the `SET ROLE` escape above).
- **The runtime login:** a `LOGIN` role that owns no objects and whose only role membership is `app_user`, so it can take `app_user` on connect and nothing else. Migrations, seeds and the maintenance connection keep the owner login.
- **Terraform (`infra/`):** the runtime login on Cloud SQL for main and for previews, with its password in Secret Manager (a new secret per environment).
- **Deploy (`.github/workflows/`):** Cloud Run services get the runtime login's user and password; the migrate step keeps the owner login.
- **Runtime role check (`infra/scripts/check-runtime-role.mjs`):** also fails when the runtime connection's `session_user` owns any object, or is a member of any role other than `app_user`, or when `SET ROLE` to the owner login succeeds on a runtime connection.
- **`packages/db`:** the pool keeps `-c role=app_user` and `assertRole`; only the credentials it is given change.

## Out of scope
- Splitting the preview and production deployer accounts (task 068 parking lot).
- Forcing row-level security on the owner (ADR-0006, task 047 amendment stays).
- Changing the access functions or policies.

## Acceptance criteria
- [ ] On Cloud SQL (preview and main), the runtime connection's `session_user` is the runtime login, `current_user` is `app_user`, and the role check passes.
- [ ] On a runtime connection, `SET ROLE` to the owner login fails.
- [ ] The role check fails on purpose when the runtime connects with the owner login.
- [ ] ADR-0006 has an amendment recording the separate runtime login and the reason.
- [ ] `terraform plan` shows no changes after apply.

## Approach (brief)
Open questions first (below). Then: add the login and secret in Terraform, grant `app_user` to it, pass its credentials to Cloud Run in `deploy.yml`, extend the role check and its test, amend ADR-0006.

## Test plan
- Role-check script tests (`check-runtime-role.test.mjs`): a connection as the owner login fails; a login that is a member of another role fails; the runtime login passes.
- A DB test: on a connection as the runtime login, `SET ROLE` to the owner fails.
- By hand on the first preview after the change: the deploy's role check output.

## Open questions
1. Where is `GRANT app_user TO <runtime login>` run: in Terraform/a deploy script (roles are per instance, not per database), or in a migration (which would then need the login's name in every environment, local included)?
2. Local dev and CI: do they also connect with a separate runtime login (closer to production, more `.env` setup), or keep one login locally?
3. Task 068 gives previews their own database login. Does that login become the preview's owner login (migrations) with a second preview runtime login, or is a single preview login enough?

## Progress log
- 2026-11-04 – Planned from task 068's review: the owner login plus `-c role=app_user` lets any `SET ROLE` on a pooled connection escape row-level security. After the POC.

## Parking lot
- (none yet)
