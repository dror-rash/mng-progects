#!/usr/bin/env bash
# Usage: deploy-service.sh <service> <image>
# Env: REGION, CLOUDSQL_CONNECTION, IS_PR ("true" for previews), PR_NUMBER, APP_URL (optional, prod only)
set -euo pipefail
service="$1"; image="$2"
: "${CLOUDSQL_CONNECTION:?CLOUDSQL_CONNECTION is required}"

flags=()
if [ "${IS_PR:-false}" = "true" ]; then
  # Preview: tagged no-traffic revision, preview database, relaxed origin check (unknown *.run.app host).
  db_name="app_preview"; allow_preview="true"
  env_vars="CLOUD_SQL_CONNECTION_NAME=${CLOUDSQL_CONNECTION},DB_USER=app,DB_NAME=${db_name},ALLOW_PREVIEW_ORIGINS=${allow_preview}"
  flags+=(--no-traffic --tag "pr-${PR_NUMBER}" --remove-env-vars BETTER_AUTH_URL)
else
  db_name="app"; allow_preview="false"
  app_url="${APP_URL:-$(gcloud run services describe shell --region "$REGION" --format='value(status.url)')}"
  env_vars="CLOUD_SQL_CONNECTION_NAME=${CLOUDSQL_CONNECTION},DB_USER=app,DB_NAME=${db_name},ALLOW_PREVIEW_ORIGINS=${allow_preview},BETTER_AUTH_URL=${app_url}"
fi

gcloud run deploy "$service" \
  --image "$image" \
  --region "$REGION" \
  --add-cloudsql-instances "$CLOUDSQL_CONNECTION" \
  --update-secrets "BETTER_AUTH_SECRET=better-auth-secret:latest,DB_PASSWORD=db-password:latest" \
  --update-env-vars "$env_vars" \
  --quiet "${flags[@]}"
