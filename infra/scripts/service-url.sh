#!/usr/bin/env bash
# Usage: service-url.sh <service>   -> prints the preview (tagged) URL on PRs, else the service URL
# Env: REGION, IS_PR, PR_NUMBER
set -euo pipefail
service="$1"
if [ "${IS_PR:-false}" = "true" ]; then
  gcloud run services describe "$service" --region "$REGION" --format=json \
    | jq -r --arg tag "pr-${PR_NUMBER}" '.status.traffic[] | select(.tag == $tag) | .url'
else
  gcloud run services describe "$service" --region "$REGION" --format='value(status.url)'
fi
