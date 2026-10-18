# Infrastructure (GCP)

Terraform for: Artifact Registry, one Cloud Run service per zone (with its own runtime service account),
and GitHub Actions → GCP auth via Workload Identity Federation (no long-lived keys).

## One-time bootstrap
```bash
gcloud auth application-default login
gcloud config set project <PROJECT_ID>

# State bucket (once, by hand)
gcloud storage buckets create gs://<PROJECT_ID>-tfstate --location=<REGION> --uniform-bucket-level-access
gcloud storage buckets update gs://<PROJECT_ID>-tfstate --versioning

cd infra
cp backend.hcl.example backend.hcl            # edit
cp terraform.tfvars.example terraform.tfvars  # edit
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```
`backend.hcl` and `terraform.tfvars` are git-ignored.

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
- The shell proxies to the example zone via `EXAMPLE_ZONE_URL`. Next.js bakes rewrites in at **build time**, so the workflow deploys the example zone first and builds the shell with its URL.

## Database & auth
- Cloud SQL Postgres 16 (`db-f1-micro`, ~US$10/month, **does not scale to zero**). Databases: `app` (production) and `app_preview` (shared by all PR previews).
- Terraform generates the DB password and the Better Auth secret into Secret Manager. Values also sit in Terraform state, so keep the state bucket private.
- Every zone gets both secrets and the Cloud SQL connection; any zone can validate a session.
- `deploy.yml` runs `drizzle-kit migrate` through the Cloud SQL Auth Proxy before deploying (previews migrate `app_preview`, `main` migrates `app`).
- Generate and commit migrations locally with `pnpm db:generate` whenever `packages/db/src/schema.ts` changes.
- Behind a custom domain, set `APP_URL` so Better Auth's base URL and origin checks match.

## Known limits / follow-ups
- Preview and production share one deployer service account. Split them if you need stricter separation.
- Services are public (`allUsers`). If org policy forbids that, put a load balancer with IAP in front.
- Artifact Registry has no cleanup policy yet; add one that always keeps the images running revisions use.
- Previews share the production project. Use a separate project for staging if data isolation matters.
- Always deploys both zones; add change detection with `turbo --filter=...[origin/main]` later.
