#!/usr/bin/env bash
# Usage: deploy-service.sh <service> <image>
# Env: PROJECT, REGION, CLOUDSQL_CONNECTION, IS_PR ("true" for previews), PR_NUMBER, APP_URL (optional, prod only)
set -euo pipefail
service="$1"; image="$2"
: "${CLOUDSQL_CONNECTION:?CLOUDSQL_CONNECTION is required}"
: "${PROJECT:?PROJECT is required}"

flags=()
if [ "${IS_PR:-false}" = "true" ]; then
  # Preview: tagged no-traffic revision, preview database and bucket, relaxed origin check (unknown *.run.app host).
  db_name="app_preview"; bucket="${PROJECT}-files-preview"
  env_vars="CLOUD_SQL_CONNECTION_NAME=${CLOUDSQL_CONNECTION},DB_USER=app,DB_NAME=${db_name},ALLOW_PREVIEW_ORIGINS=true"
  flags+=(--no-traffic --tag "pr-${PR_NUMBER}" --remove-env-vars BETTER_AUTH_URL)
else
  db_name="app"; bucket="${PROJECT}-files"
  app_url="${APP_URL:-$(gcloud run services describe shell --region "$REGION" --format='value(status.url)')}"
  env_vars="CLOUD_SQL_CONNECTION_NAME=${CLOUDSQL_CONNECTION},DB_USER=app,DB_NAME=${db_name},ALLOW_PREVIEW_ORIGINS=false,BETTER_AUTH_URL=${app_url}"
fi

# Files (packages/storage reads STORAGE_BUCKET; STORAGE_LOCAL_URL stays unset so it uses GCS itself). Only the
# dashboard uses them, and only its runtime identity may (infra/storage.tf, which names the buckets the same).
if [ "$service" = "dashboard" ]; then
  env_vars="${env_vars},STORAGE_BUCKET=${bucket}"
fi

gcloud run deploy "$service" \
  --image "$image" \
  --region "$REGION" \
  --add-cloudsql-instances "$CLOUDSQL_CONNECTION" \
  --update-secrets "BETTER_AUTH_SECRET=better-auth-secret:latest,DB_PASSWORD=db-password:latest" \
  --update-env-vars "$env_vars" \
  --quiet "${flags[@]}"
