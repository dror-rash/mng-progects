# Infrastructure (GCP)

Terraform for: Artifact Registry, one Cloud Run service per zone (`shell`, `example-zone`, `dashboard`, each with
its own runtime service account), Cloud SQL, Secret Manager, the file buckets, a log exclusion, and GitHub
Actions → GCP auth via Workload Identity Federation (no long-lived keys).

Every resource is regional in `var.region` (the project uses `me-west1`, Tel Aviv): Cloud Run, Artifact
Registry (`<region>-docker.pkg.dev`), Cloud SQL and the buckets.

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
cp terraform.tfvars.example terraform.tfvars  # edit
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
| `GCP_DEPLOYER_SA` | `terraform output gcp_deployer_sa` |
| `GCP_CLOUDSQL_CONNECTION` | `terraform output gcp_cloudsql_connection` |
| `APP_URL` (optional) | public origin, e.g. `https://app.example.com`. Defaults to the shell's `run.app` URL |

No secrets are needed for GCP auth.

## How deploys work
- Terraform creates the services with a placeholder image and ignores image/traffic drift.
- `.github/workflows/deploy.yml` builds each zone image, pushes to Artifact Registry, and runs `gcloud run deploy`.
- **PRs:** a no-traffic revision tagged `pr-<N>` is deployed per zone; Playwright runs against the shell's tagged URL; the URL is posted on the PR. `preview-cleanup.yml` removes the tags when the PR closes.
- **main:** new revisions get 100% traffic.
- The shell proxies to the other zones via `EXAMPLE_ZONE_URL` and `DASHBOARD_ZONE_URL`. Next.js bakes rewrites in at **build time**, so the workflow deploys the example zone and the dashboard first and builds the shell with their URLs (on PRs, their tagged `pr-<N>` URLs).
- After migrating, `infra/scripts/check-runtime-role.mjs` connects like the runtime pool (same login, `-c role=app_user`) and fails the deploy unless `current_user = app_user`, `pg_has_role('app_user', 'MEMBER')` and `app_user` has no `TEMPORARY` (ADR-0006, migration 0025). CI runs its tests against the migrated database.
- **PR previews run the `@smoke` scenarios only**, one worker: the full suite needs `AUTH_DISABLE_RATE_LIMIT`, which a deployment never sets (rule 13).

## Files (GCS)
- `<PROJECT_ID>-files` for `main` (no lifecycle rule: attachments are soft-deleted in the database and stay restorable) and `<PROJECT_ID>-files-preview` for all PRs (objects deleted 14 days after upload, no soft-delete retention).
- `deploy-service.sh` sets `STORAGE_BUCKET` on the dashboard to the matching bucket. `STORAGE_LOCAL_URL` is local-only.
- Only the dashboard's runtime account has object access (`roles/storage.objectUser` on each bucket), and it can sign URLs as itself (`roles/iam.serviceAccountTokenCreator` on itself; signing goes through the IAM Credentials API, no key).
- CORS allows `PUT` and `GET` with `Content-Type` and `x-goog-if-generation-match`. Main: the shell's `run.app` URLs. Preview: `*`, because tagged origins (`https://pr-<N>---shell-….run.app`) change per PR and GCS has no wildcard inside a host. Every request still needs a URL the app signed, and the bucket holds test data only.

## Logs
- A log exclusion drops Cloud Run request logs of `/dashboard/invite/<token>` on `shell` and `dashboard` (the path carries the invite secret, task 028).

## Artifact Registry
- Cleanup keeps the 10 newest versions of each image and deletes untagged versions older than 30 days. Deploys tag every image with its commit SHA, so tagged versions are never deleted by age; storage grows by about three images per deploy (first 0.5 GB free, then US$0.10/GB-month).

## Database & auth
- Cloud SQL Postgres 16 (`db-f1-micro`, about US$11–14/month in `me-west1` with 10 GB SSD and backups, **does not scale to zero**). Databases: `app` (production) and `app_preview` (shared by all PR previews).
- Terraform generates the DB password and the Better Auth secret into Secret Manager. Values also sit in Terraform state, so keep the state bucket private.
- Every zone gets both secrets and the Cloud SQL connection; any zone can validate a session.
- `deploy.yml` runs `drizzle-kit migrate` through the Cloud SQL Auth Proxy before deploying (previews migrate `app_preview`, `main` migrates `app`).
- Generate and commit migrations locally with `pnpm db:generate` whenever `packages/db/src/schema.ts` changes.
- Behind a custom domain, set `APP_URL` so Better Auth's base URL and origin checks match.

## Known limits / follow-ups
- Preview and production share one deployer service account. Split them if you need stricter separation.
- Services are public (`allUsers`). If org policy forbids that, put a load balancer with IAP in front.
- Preview and `main` revisions are one service per zone, so the dashboard's single runtime account can reach both buckets.
- Previews share the production project. Use a separate project for staging if data isolation matters.
- Always deploys all three zones; add change detection with `turbo --filter=...[origin/main]` later.

## Monthly cost (POC, `me-west1`)
Cloud SQL is most of it (about US$11–14). Cloud Run scales to zero; buckets, logs and the registry stay within
or near the free tiers at POC volume. Target: about US$15/month.
