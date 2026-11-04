#!/usr/bin/env bash
# Usage: deploy-service.sh <service> <image>
# Env: PROJECT, REGION, CLOUDSQL_CONNECTION, IS_PR ("true" for previews), PR_NUMBER, APP_URL (optional, prod only)
# Every revision gets its environment's whole config (identity, env, secrets) explicitly, with --set-*:
# previews and main share the service, so nothing may carry over from the other's last revision.
set -euo pipefail
service="$1"; image="$2"
: "${CLOUDSQL_CONNECTION:?CLOUDSQL_CONNECTION is required}"
: "${REGION:?REGION is required}"
. "$(dirname "$0")/environment.sh"

env_vars="CLOUD_SQL_CONNECTION_NAME=${CLOUDSQL_CONNECTION},DB_USER=${DB_LOGIN},DB_NAME=${DB_NAME}"
flags=()
if [ "$DEPLOY_ENV" = "preview" ]; then
  # Tagged no-traffic revision; relaxed origin check (unknown *.run.app host), no BETTER_AUTH_URL.
  env_vars="${env_vars},ALLOW_PREVIEW_ORIGINS=true"
  flags+=(--no-traffic --tag "pr-${PR_NUMBER:?PR_NUMBER is required}")
else
  # The app's origin: the shell's status.url (or APP_URL behind a custom domain).
  app_url="${APP_URL:-$(gcloud run services describe shell --region "$REGION" --format='value(status.url)')}"
  env_vars="${env_vars},ALLOW_PREVIEW_ORIGINS=false,BETTER_AUTH_URL=${app_url}"
fi

# Files (packages/storage reads STORAGE_BUCKET; STORAGE_LOCAL_URL stays unset so it uses GCS itself). Only the
# dashboard uses them; its identity in each environment may reach that environment's bucket only.
if [ "$service" = "dashboard" ]; then
  env_vars="${env_vars},STORAGE_BUCKET=${FILES_BUCKET}"
fi

gcloud run deploy "$service" \
  --image "$image" \
  --region "$REGION" \
  --service-account "$(runtime_sa "$service")" \
  --set-cloudsql-instances "$CLOUDSQL_CONNECTION" \
  --set-secrets "BETTER_AUTH_SECRET=${AUTH_SECRET_NAME}:latest,DB_PASSWORD=${DB_PASSWORD_SECRET}:latest" \
  --set-env-vars "$env_vars" \
  --quiet ${flags[@]+"${flags[@]}"}
