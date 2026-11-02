# Task 068: First GCP deploy (M11)

- **Status:** todo
- **Milestone:** M11 Deploy to GCP (POC-critical, 2026-11-13)
- **Zone / package:** `infra/`, `.github/workflows/`, `packages/db` (runtime role check)
- **Feature file:** none new. The deployed app passes the existing suite: `BASE_URL=<shell run.app URL> pnpm test:e2e` against a PR preview.
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
  - **Terraform:** a `dashboard` Cloud Run service if it's missing, and the GCS bucket for task 057 (planned in M13).
  - **Logs:** a log exclusion for invite-link paths (task 028 parking lot).
  - **Artifact Registry:** a cleanup policy that keeps the images that running revisions use.
  - **`deploy.yml`:** deploys all three zones and builds the shell with both zone URLs.
  - **PR:** shows the `terraform plan` output.
- **Runtime role check (risk from `PLAN.md`):** after `db:migrate` on the preview database, a runtime connection shows `current_user = app_user` and `pg_has_role('app_user', 'MEMBER') = true`, and migration 0025's `REVOKE TEMPORARY … FROM PUBLIC` applied. This is a script in `infra/scripts/` that the deploy workflow runs after migrating, and it fails the deploy if a check fails.
- **CI:** `deploy` goes green on PRs (preview) and on `main`.

## Out of scope
- A custom domain, load balancer or IAP.
- A separate staging project.
- Email delivery (M10).

## Acceptance criteria
- [ ] `terraform plan` shows no changes after apply.
- [ ] A PR gets a preview URL, and the e2e suite passes against it.
- [ ] `main` deploys, and an owner can sign up and see the dashboard on the `run.app` URL.
- [ ] The runtime role check passes on Cloud SQL and is part of the deploy.
- [ ] Requests with invite tokens are not in Cloud Run logs.

## Test plan
- e2e against the preview URL.
- The role-check script fails on purpose against a local connection that isn't `app_user`.

## Progress log
- 2026-11-02 – Planned for the POC. The owner confirmed GCP and no custom domain.

## Parking lot
- Neon instead of Cloud SQL to scale to zero (re-test the `app_user` setup first).
- Split the preview and production deployer accounts.
