#!/usr/bin/env bash
# Usage: deploy-service.sh <zone> <image@sha256:digest>
# Env: PROJECT, REGION, CLOUDSQL_CONNECTION, IS_PR ("true" for previews), PR_NUMBER, APP_URL (optional, prod only)
# Deploys <zone> to its environment's service (<zone> on main, <zone>-preview for PRs; environment.sh), by
# digest only: a tag can be moved after the build. Every revision gets its environment's whole config
# (identity, env, secrets) explicitly, with --set-*. Tests: bash infra/scripts/test-deploy-service.sh
set -euo pipefail
zone="$1"; image="$2"
: "${CLOUDSQL_CONNECTION:?CLOUDSQL_CONNECTION is required}"
: "${REGION:?REGION is required}"
. "$(dirname "$0")/environment.sh"
case "$image" in
  *@sha256:????????????????????????????????????????????????????????????????) ;;
  *) echo "deploy-service.sh: deploy by digest (<image>@sha256:<64 hex>), not '$image'" >&2; exit 1 ;;
esac
service="$(service_name "$zone")"

env_vars="CLOUD_SQL_CONNECTION_NAME=${CLOUDSQL_CONNECTION},DB_USER=${DB_LOGIN},DB_NAME=${DB_NAME}"
flags=()
if [ "$DEPLOY_ENV" = "preview" ]; then
  # Tagged no-traffic revision; relaxed origin check (unknown *.run.app host), no BETTER_AUTH_URL.
  env_vars="${env_vars},ALLOW_PREVIEW_ORIGINS=true"
  flags+=(--no-traffic --tag "pr-${PR_NUMBER:?PR_NUMBER is required}")
else
  # The app's origin: the main shell's status.url (or APP_URL behind a custom domain).
  app_url="${APP_URL:-$(gcloud run services describe "$(service_name shell)" --region "$REGION" --format='value(status.url)')}"
  env_vars="${env_vars},ALLOW_PREVIEW_ORIGINS=false,BETTER_AUTH_URL=${app_url}"
fi

# Files (packages/storage reads STORAGE_BUCKET; STORAGE_LOCAL_URL stays unset so it uses GCS itself). Only the
# dashboard uses them; its identity in each environment may reach that environment's bucket only.
if [ "$zone" = "dashboard" ]; then
  env_vars="${env_vars},STORAGE_BUCKET=${FILES_BUCKET}"
fi

gcloud run deploy "$service" \
  --image "$image" \
  --region "$REGION" \
  --service-account "$(runtime_sa "$zone")" \
  --set-cloudsql-instances "$CLOUDSQL_CONNECTION" \
  --set-secrets "BETTER_AUTH_SECRET=${AUTH_SECRET_NAME}:latest,DB_PASSWORD=${DB_PASSWORD_SECRET}:latest" \
  --set-env-vars "$env_vars" \
  --quiet ${flags[@]+"${flags[@]}"}
