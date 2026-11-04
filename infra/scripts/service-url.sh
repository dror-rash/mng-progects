#!/usr/bin/env bash
# Usage: service-url.sh <zone>   -> on PRs the pr-<N> tagged URL of <zone>-preview, else <zone>'s service URL
# Env: PROJECT, REGION, IS_PR, PR_NUMBER. Tests: bash infra/scripts/test-deploy-service.sh
set -euo pipefail
zone="$1"
. "$(dirname "$0")/environment.sh"
service="$(service_name "$zone")"
if [ "$DEPLOY_ENV" = "preview" ]; then
  gcloud run services describe "$service" --region "$REGION" --format=json \
    | jq -r --arg tag "pr-${PR_NUMBER}" '.status.traffic[] | select(.tag == $tag) | .url'
else
  gcloud run services describe "$service" --region "$REGION" --format='value(status.url)'
fi
