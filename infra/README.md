# Infrastructure (GCP)

Terraform for: Artifact Registry, one Cloud Run service per zone (`shell`, `example-zone`, `dashboard`), runtime
service accounts per zone and environment, Cloud SQL, Secret Manager, the file buckets, a log exclusion, and
GitHub Actions → GCP auth via Workload Identity Federation (no long-lived keys).

Every resource is regional in `var.region` (required; this project uses `me-west1`, Tel Aviv): Cloud Run,
Artifact Registry (`<region>-docker.pkg.dev`), Cloud SQL and the buckets.

## One-time bootstrap
```bash
gcloud auth login
gcloud auth application-default login
gcloud projects create <PROJECT_ID>                     # a new, dedicated project
gcloud billing projects link <PROJECT_ID> --billing-account=<BILLING_ACCOUNT_ID>
gcloud config set project <PROJECT_ID>
gcloud auth application-default set-quota-project <PROJECT_ID>

# APIs Terraform itself needs before it can enable the rest
gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com iam.googleapis.com

# State bucket (once, by hand)
gcloud storage buckets create gs://<PROJECT_ID>-tfstate --location=me-west1 --uniform-bucket-level-access
gcloud storage buckets update gs://<PROJECT_ID>-tfstate --versioning

cd infra
cp backend.hcl.example backend.hcl            # edit
cp terraform.tfvars.example terraform.tfvars  # edit (region = "me-west1")
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```
`backend.hcl` and `terraform.tfvars` are git-ignored. The first `apply` takes 10–15 minutes (Cloud SQL). If it fails
right after enabling an API ("API not enabled" or "has not been used"), wait a minute and run `terraform apply` again.

## Connect GitHub
After `apply`, set these **repository variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Value |
|---|---|
| `GCP_PROJECT_ID` | your project ID |
| `GCP_REGION` | same as `region` |
| `GCP_WIF_PROVIDER` | `terraform output gcp_wif_provider` |
| `GCP_DEPLOYER_SA_MAIN` | `terraform output gcp_deployer_sa_main` |
| `GCP_DEPLOYER_SA_PREVIEW` | `terraform output gcp_deployer_sa_preview` |
| `GCP_CLOUDSQL_CONNECTION` | `terraform output gcp_cloudsql_connection` |
| `APP_URL` (optional) | public origin behind a custom domain. Leave unset for the `run.app` origin |

No secrets are needed for GCP auth. (An older `GCP_DEPLOYER_SA` variable is unused; delete it.)

## First deploys: main before any preview
A preview deploy only verifies its database logins; a `main` deploy creates them. So after `apply` and the
variables, **merge (or push) to `main` first** and let `deploy.yml` finish there. Until then every preview deploy
fails at "Migrate and check the database" with `preview_owner doesn't exist (run a main deploy first …)`.

## The app's origin
Without `APP_URL`, the origin is the shell's **`status.url`**: the URL printed by
`gcloud run services describe shell --region <region> --format='value(status.url)'`. `deploy-service.sh` sets it as
`BETTER_AUTH_URL` on every `main` revision. Cloud Run answers on a second `run.app` URL for the same service
(`shell-<hash>-<region code>.a.run.app` and `shell-<project number>.<region>.run.app`); pages load on both, but
sign-in only works on `status.url`, because Better Auth trusts only its base URL on `main`.

## Environments: main and PR previews
Same project and Cloud SQL instance; nothing else is shared. `infra/scripts/environment.sh` is
the one place the workflow picks the names, and Terraform's `local.environments` (`infra/main.tf`) carries the same
ones: `bash infra/scripts/test-environment.sh` fails when they differ.

| | main | PR preview |
|---|---|---|
| GitHub event (Workload Identity) | push to `refs/heads/main` | `pull_request` of this repository |
| Deployer | `deployer-main` | `deployer-preview` |
| Cloud Run services | `shell`, `example-zone`, `dashboard` | `shell-preview`, `example-zone-preview`, `dashboard-preview` |
| Revisions | 100% traffic | no traffic, tag `pr-<N>`; at most 1 instance per service |
| Image repository | `<region>-docker.pkg.dev/<PROJECT_ID>/images` | `…/images-preview` |
| Runtime identity | `<zone>-runtime` | `<zone>-preview` |
| Database | `app` | `app_preview` |
| Migrations run as | `app` (Terraform's Cloud SQL user) | `preview_owner` |
| Runtime login (switches to `app_user`) | `app` (task 074 plans its own) | `preview_runtime` |
| Secrets | `db-password`, `better-auth-secret` | `db-preview-owner-password`, `db-preview-password`, `better-auth-secret-preview` |
| Files bucket | `<PROJECT_ID>-files` | `<PROJECT_ID>-files-preview` |

- Each runtime identity reads only its environment's runtime database password and auth secret.
  `deploy-service.sh` sets the revision's identity, env vars, secrets and Cloud SQL instance with `--set-*`, so a
  revision never inherits the other environment's.
- Each deployer deploys only to its environment's services, pushes only to its environment's repository and acts
  only as its environment's runtime identities. The preview shell is built with the preview zones' tagged URLs;
  `main` services never get preview revisions. `deployer-preview` reads only the two preview
  database passwords. `deployer-main` reads `db-password` and, because it provisions the preview logins, their two
  passwords. No deployer reads an auth secret.
- **Preview logins.** `infra/scripts/provision-db-logins.mjs` creates them on `main` deploys only, as `app`. Role
  and database statements run on a connection to `app`, which PR code can't write to; only the schema grant runs
  on `app_preview`, while that connection holds the preview migration lock (the same `migrate-app_preview` lock
  `with-db-lock.mjs` takes). Not Terraform: Cloud SQL makes every
  API-created user a member of `cloudsqlsuperuser`, which owns the databases (so it could connect to `app`). Both are
  `LOGIN NOINHERIT`, no `CREATEROLE`/`CREATEDB`, with SCRAM-SHA-256 verifiers computed in Node, and a
  `CONNECTION LIMIT` (`preview_owner` 4, `preview_runtime` 8; `db-f1-micro` allows 25 connections in all):
  - `preview_owner` owns `app_preview`'s objects. It holds ADMIN on `app_user` (migration 0020 runs
    `GRANT app_user TO current_user`), `CONNECT`/`CREATE` on `app_preview` (drizzle-kit creates its `drizzle`
    schema) and `CREATE` on its `public` schema. The database itself stays owned by `cloudsqlsuperuser`.
    Migration 0020 then grants it `app_user` once more, as itself (SET, no ADMIN). Verification allows exactly
    that grant besides the provisioned one: it is harmless (`preview_owner` owns more than `app_user` can do), and
    revoking it from `main` would race the next preview's migration.
  - **A future migration that creates a role fails on previews**: `preview_owner` has no `CREATEROLE`. Create the
    role in `provision-db-logins.mjs` (main deploys) first, guarded like 0020's `IF NOT EXISTS`.
  - `preview_runtime` is a `SET`-only member of `app_user` with `CONNECT` on `app_preview`.
  - `CONNECT` on `app` is revoked from `PUBLIC` (granted to `app`), so neither preview login can connect to `app`.
    They can still connect to Cloud SQL's `postgres` database (its catalogs only); that one belongs to Cloud SQL's
    own admin, so it is left alone.
  - `TEMPORARY` on `app_preview` is revoked from `PUBLIC` here: migration 0025 does it too, but run by
    `preview_owner` (not the database owner) it only warns.

  Preview deploys run it with `--verify-only` (read-only) and fail if anything above is missing or different
  (memberships and connection limits included).
- **Functions planted by PR migrations.** `preview_owner` can create functions in `app_preview`'s `public`, and
  `main`'s owner login and the role check both read catalogs there. Every connection of these scripts pins
  `search_path` to `pg_catalog, pg_temp` (startup option, and again before the first query) and calls catalog
  functions schema-qualified (`infra/scripts/pg-safe.mjs`), so a planted function or operator never runs in their
  place. Tests plant some and fail if one is called.
  `bash infra/scripts/test-preview-migrate.sh` runs the whole sequence on fresh databases set up like Cloud SQL.

## How deploys work
- Terraform creates the services with a placeholder image and their environment's identity, and ignores image,
  traffic and env drift.
- `.github/workflows/deploy.yml`:
  1. Through the Cloud SQL Auth Proxy. `main`: migrate `app` as `app`, then provision the preview logins. Previews:
     verify the preview logins, then migrate `app_preview` as `preview_owner`. Migrations run under a Postgres
     advisory lock (`with-db-lock.mjs`), so two PRs never migrate `app_preview` at once. Then
     `check-runtime-role.mjs` as the environment's runtime login.
  2. Builds and deploys `example-zone` and `dashboard` to the environment's services, resolves their URLs (tagged
     `pr-<N>` URLs of the `-preview` services on PRs). Every deploy pins the digest its build pushed;
     `deploy-service.sh` refuses a tag.
  3. Builds the shell with `EXAMPLE_ZONE_URL` and `DASHBOARD_ZONE_URL` (Next.js bakes rewrites in at **build
     time**) and deploys it.
  4. PRs: checks the shell URL, runs the `@smoke` scenarios against it, and posts it on the PR.
- **PR previews run the `@smoke` scenarios only**, one worker, no traces and no uploaded report (public
  repository; traces would hold the test accounts' passwords and cookies). The full suite needs
  `AUTH_DISABLE_RATE_LIMIT`, which a deployment never sets (rule 13).
- `preview-cleanup.yml` removes the `pr-<N>` tags of the three `-preview` services when the PR closes (as
  `deployer-preview`). A missing tag is a notice; any other failure is logged and fails the job.
- Deployers get the custom role `runDeployer` on their own environment's services: the `run.*` permissions of
  `roles/run.developer` that a deploy and a tag cleanup use. Not `run.developer` itself: it includes
  `run.services.sshRoot`, `run.instances.sshRoot` and the `sshRead` ones (SSH into running instances, whose
  environment holds the database password and auth secret). Nor IAM policy changes, jobs or worker pools.
- Workload Identity accepts only this repository, by name and by its numeric id (`github_repository_id`).

## Runtime role check
`infra/scripts/check-runtime-role.mjs` connects like the runtime pool (`buildPoolConfig`: the login and
`-c role=app_user`) and fails the deploy unless (ADR-0006: row-level security isn't forced):
- `current_user = app_user`, and the login may `SET ROLE app_user`;
- `app_user` is no superuser and has no `BYPASSRLS` or `TEMPORARY` (migration 0025);
- `app_user` owns no public table and isn't a member of any table's owner;
- row-level security is on for every public table except Better Auth's (`account`, `session`, `user`, `verification`);
- `app_user` can use no view, materialized view or `SECURITY DEFINER` function except the migrations' own, and no
  table outside `public` (column-only grants count): the views `customer_name` and `site_choice` are pinned by a
  hash of their definition (a redefinition fails), the 24 access functions by exact signature (an overload fails);
- `app_user` has no `TRUNCATE`, `TRIGGER` or `REFERENCES` on any table (`TRUNCATE` ignores row-level security);
- with `app.user_id` unset, `select count(*) from workspace` is 0.

A migration that adds or changes a view or a `SECURITY DEFINER` function app_user can use fails the deploy until
the allowlist in the script is updated on purpose (the failure says which).

CI runs the tests of all these scripts against the migrated database, and `test-preview-migrate.sh`.

## Files (GCS)
- `<PROJECT_ID>-files` for `main` (no lifecycle rule: attachments are soft-deleted in the database and stay
  restorable) and `<PROJECT_ID>-files-preview` for all PRs (objects deleted 14 days after upload, no soft-delete
  retention).
- `deploy-service.sh` sets `STORAGE_BUCKET` on the dashboard. `STORAGE_LOCAL_URL` is local-only.
- Of the app's identities, only the dashboard's have object access: `dashboard-runtime` on the main bucket,
  `dashboard-preview` on the preview bucket (`roles/storage.objectUser`). Each signs URLs as itself
  (`roles/iam.serviceAccountTokenCreator` on itself, through the IAM Credentials API; no key). People with
  project Owner/Editor/Viewer still reach both buckets through GCS's legacy project bindings.
- CORS allows `PUT` and `GET` with `Content-Type` and `x-goog-if-generation-match`. Main: the shell's `run.app`
  URLs. Preview: `*`, because tagged origins (`https://pr-<N>---shell-….run.app`) change per PR and GCS has no
  wildcard inside a host. Every request still needs a URL the app signed, and the bucket holds test data only.

## Logs
- A log exclusion drops Cloud Run request logs of `/dashboard/invite/<token>` on the shell and dashboard services of
  both environments (the path
  carries the invite secret, task 028), in any case and with repeated slashes.

## Artifact Registry
- One repository per environment (`images`, `images-preview`), one package per zone. Each keeps the 10 newest
  versions of each image and deletes any other version older than 30 days, so previews never push `main`'s
  images out.

## Database & auth
- Cloud SQL Postgres 16 (`db-f1-micro`, about US$11–14/month in `me-west1` with 10 GB SSD and backups, **does not
  scale to zero**). Databases: `app` (production) and `app_preview` (shared by all PR previews).
- Terraform generates the database passwords and the Better Auth secrets into Secret Manager. Values also sit in
  Terraform state, so keep the state bucket private.
- Generate and commit migrations locally with `pnpm db:generate` whenever `packages/db/src/schema.ts` changes.
- Behind a custom domain, set `APP_URL` so Better Auth's base URL and origin checks match.

## Known limits / follow-ups
- `main` runs up to 5 instances per zone with a pool of 5 connections each, more than `db-f1-micro`'s 25. Fine at
  POC traffic; lower `max_instances` or the pool size before real load.
- Services are public (`allUsers`). If org policy forbids that, put a load balancer with IAP in front.
- Previews share the production project and Cloud SQL instance. Use a separate project for staging if data
  isolation must not depend on database grants.
- Always deploys all three zones; add change detection with `turbo --filter=...[origin/main]` later.

## Monthly cost (POC, `me-west1`)
Cloud SQL is most of it (about US$11–14). Cloud Run scales to zero; buckets, logs and the registry stay within
or near the free tiers at POC volume. The preview identities, deployers and secrets add nothing at this size (five
secret versions in all, within Secret Manager's 6 free; service accounts are free). Target: about US$15/month.
