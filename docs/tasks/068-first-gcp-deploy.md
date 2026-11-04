# Task 068: First GCP deploy (M11)

- **Status:** in-progress
- **Milestone:** M11 Deploy to GCP (POC-critical, 2026-11-13)
- **Zone / package:** `infra/`, `.github/workflows/`, `packages/db` (runtime role check)
- **Feature file:** none new. The deployed app passes the `@smoke` scenarios (later `@poc`, task 069): `BASE_URL=<shell run.app URL> E2E_TAGS=@smoke pnpm test:e2e` against a PR preview. The full suite keeps running in CI's `e2e` job.
- **Depends on:** the owner's GCP project with billing (bootstrap steps in `infra/README.md`); ADR-0002, ADR-0006

## Why
The POC must run on the internet, not just on a laptop. Row-level security has never run on Cloud SQL, and that is the biggest open risk in the plan.

## Scope
- **Owner (by hand, once):**
  - `gcloud auth`, the project and billing;
  - the state bucket;
  - `backend.hcl` and `terraform.tfvars`;
  - the first `terraform apply`;
  - GitHub repository variables (`infra/README.md`).

  No custom domain: the shell's `run.app` URL is the app's origin.
- **Agent (`infra`):**
  - **Terraform:** a `dashboard` Cloud Run service if it's missing, and the GCS bucket for task 057 (planned in M13). The bucket's CORS must allow `PUT` and `GET` from the shell's origin with the headers `Content-Type` and `x-goog-if-generation-match` (task 059's uploads send both), and the runtime service account needs to sign URLs (`roles/iam.serviceAccountTokenCreator` on itself).
  - **Logs:** a log exclusion for invite-link paths (task 028 parking lot).
  - **Artifact Registry:** a cleanup policy that keeps the 10 newest versions of each image and deletes any version (tagged or not) older than 30 days.
  - **Preview identities (same project):** previews don't share main's identities.
    - A `dashboard-preview` runtime service account with object access to the preview bucket only. Main deploys pass `--service-account` explicitly too.
    - A preview database login that can `CONNECT` only to `app_preview` (`REVOKE CONNECT ON DATABASE app FROM PUBLIC`).
    - A separate preview Better Auth secret.
  - **Preview test output:** Playwright traces and reports from preview runs are not uploaded anywhere public (the repo is public).
  - **`deploy.yml`:** deploys all three zones and builds the shell with both zone URLs.
  - **PR:** shows the `terraform plan` output.
- **Runtime role check (risk from `PLAN.md`):** a script in `infra/scripts/` that the deploy workflow runs after `db:migrate`; it fails the deploy if any check fails. On a runtime connection:
  - `current_user = app_user`, and the login can use it: `pg_has_role(session_user, 'app_user', 'SET')`;
  - `app_user` is not a superuser and doesn't have `BYPASSRLS`;
  - no table in `public` is owned by a role whose privileges `app_user` has;
  - row-level security is enabled on every app table (the Better Auth tables excepted);
  - a probe: with `app.user_id` unset, `select count(*) from workspace` returns 0;
  - migration 0025's `REVOKE TEMPORARY … FROM PUBLIC` applied.
- **CI:** `deploy` goes green on PRs (preview) and on `main`.

## Out of scope
- A custom domain, load balancer or IAP.
- A separate staging project.
- Email delivery (M10).

## Acceptance criteria
- [ ] `terraform plan` shows no changes after apply.
- [ ] A PR gets a preview URL, and the `@smoke` scenarios (later `@poc`, task 069) pass against it. The full suite keeps running in CI's `e2e` job.
- [ ] `main` deploys, and an owner can sign up and see the dashboard on the `run.app` URL.
- [ ] The runtime role check passes on Cloud SQL and is part of the deploy.
- [ ] Requests with invite tokens are not in Cloud Run logs.
- [ ] On the first preview, Better Auth sees a client IP: the shell's logs have no "Rate limiting could not determine a client IP".
- [ ] On the preview, a file uploaded by hand downloads again (no `@smoke` scenario uploads).
- [ ] Previews run as their own service account, database login and Better Auth secret; the preview login can't connect to `app`.
- [ ] Preview Playwright traces and reports are not published.

## Test plan
- The `@smoke` scenarios (later `@poc`, task 069) against the preview URL; the full suite in CI's `e2e` job, against local servers.
- The role-check script fails on purpose against a local connection that isn't `app_user`.
- By hand on the first preview: the shell logs (client IP) and one upload and download.

## Progress log
- 2026-11-02 – Planned for the POC. The owner confirmed GCP and no custom domain.
- 2026-11-04 – Started in lane 1 (`chore/first-gcp-deploy`), code part first while the owner bootstraps. Owner's answers: a new dedicated GCP project (not an existing one); region `me-west1`; two buckets, `<project_id>-files` (main, no lifecycle rule for the POC so soft-deleted files stay restorable) and `<project_id>-files-preview` (PRs, objects deleted after 14 days); Artifact Registry keeps the 10 newest images per zone and deletes untagged images older than 30 days; previews run a small tagged e2e set (`@smoke` now, `@poc` from task 069), not the full suite, which needs `AUTH_DISABLE_RATE_LIMIT` (rule 13). The preview acceptance criterion changes accordingly in its own docs commit.
- 2026-11-04 – Preview criterion changed (owner's decision above): previews run the `@smoke` set, not the full suite. The full suite signs up a new account in nearly every scenario from one IP, which production rate limits block without `AUTH_DISABLE_RATE_LIMIT`, and rule 13 forbids that flag on any deployment; many of its steps also read the database directly (`@repo/db/maintenance`), which a CI runner can't reach on Cloud SQL. `@smoke` tags four existing scenarios whose steps use only the app (no database or storage access) and sign up one account each: authentication "Visitor creates an account" and "One login works across zones", home-and-menu "Opening the home address signed out shows the login page, and logging in lands on the overview", customers "Create a customer with its details". No existing scenario creates a site or a project without the database (their steps find records with `myRecordId` or add a site through `@repo/db/maintenance`), so `@smoke` doesn't cover them yet; that is for `@poc` (task 069).
- 2026-11-04 – Review: Better Auth 1.7.10 allows 3 requests per 10 seconds on `/sign-up*` per IP and path, so "One login works across zones" left `@smoke` (3 sign-ups, 2 sign-ins remain).
- 2026-11-04 – Owner's decisions after review (now in Scope and the acceptance criteria):
  - previews get their own identities in the same project: a `dashboard-preview` runtime service account limited to the preview bucket (main passes `--service-account` explicitly too), a preview database login that can connect only to `app_preview` (`REVOKE CONNECT ON DATABASE app FROM PUBLIC`), and a separate preview Better Auth secret. Splitting the deployer accounts stays parked;
  - Artifact Registry keeps the 10 newest versions per image and deletes any version, tagged or not, older than 30 days (replaces "untagged only" above);
  - the runtime role check gets the stronger checks listed in Scope;
  - preview Playwright traces and reports are not uploaded publicly (the repo is public);
  - the first preview is checked by hand for a client IP in Better Auth (shell logs) and for one upload and download.
- 2026-11-04 – Follow-up planned: a separate runtime login role (amends ADR-0006's one login), task 074, after the POC.

## Parking lot
- Neon instead of Cloud SQL to scale to zero (re-test the `app_user` setup first).
- Split the preview and production deployer accounts (the runtime accounts, database logins and auth secrets are split in this task).
