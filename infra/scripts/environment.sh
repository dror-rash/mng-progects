# Per-environment names for deploys (task 068). Source it; don't run it:  . infra/scripts/environment.sh
# The one place the workflow and deploy-service.sh choose preview vs main. Terraform creates the same names
# (infra/main.tf, infra/storage.tf); keep them in step.
# Env in: PROJECT, IS_PR ("true" for PR previews).
# Tests: bash infra/scripts/test-environment.sh
: "${PROJECT:?PROJECT is required}"

# Fixed for both environments.
DB_OWNER_LOGIN="app"                  # owns the schema, runs migrations; main's runtime login (ADR-0006)
DB_OWNER_PASSWORD_SECRET="db-password"
MAIN_DB_NAME="app"
PREVIEW_DB_NAME="app_preview"
PREVIEW_DB_LOGIN="preview_runtime"    # created by provision-db-logins.mjs: CONNECT to app_preview only
PREVIEW_DB_PASSWORD_SECRET="db-preview-password"

if [ "${IS_PR:-false}" = "true" ]; then
  DEPLOY_ENV="preview"
  DB_NAME="$PREVIEW_DB_NAME"
  DB_LOGIN="$PREVIEW_DB_LOGIN"
  DB_PASSWORD_SECRET="$PREVIEW_DB_PASSWORD_SECRET"
  AUTH_SECRET_NAME="better-auth-secret-preview"
  FILES_BUCKET="${PROJECT}-files-preview"
  RUNTIME_SA_SUFFIX="preview"
else
  DEPLOY_ENV="main"
  DB_NAME="$MAIN_DB_NAME"
  DB_LOGIN="$DB_OWNER_LOGIN"
  DB_PASSWORD_SECRET="$DB_OWNER_PASSWORD_SECRET"
  AUTH_SECRET_NAME="better-auth-secret"
  FILES_BUCKET="${PROJECT}-files"
  RUNTIME_SA_SUFFIX="runtime"
fi

# The runtime identity of <service> in this environment: <service>-runtime (main) or <service>-preview.
runtime_sa() { echo "${1}-${RUNTIME_SA_SUFFIX}@${PROJECT}.iam.gserviceaccount.com"; }

export DEPLOY_ENV DB_NAME DB_LOGIN DB_PASSWORD_SECRET AUTH_SECRET_NAME FILES_BUCKET RUNTIME_SA_SUFFIX \
  DB_OWNER_LOGIN DB_OWNER_PASSWORD_SECRET MAIN_DB_NAME PREVIEW_DB_NAME PREVIEW_DB_LOGIN PREVIEW_DB_PASSWORD_SECRET
