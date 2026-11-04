#!/usr/bin/env bash
# Tests for infra/scripts/environment.sh (task 068): previews and main never share a database, login, secret,
# bucket or runtime identity. No GCP access needed. Run: bash infra/scripts/test-environment.sh
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
pass=0; fail=0
expect() { # name, expected, actual
  if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "ok   - $1"; else fail=$((fail+1)); echo "FAIL - $1 (expected '$2', got '$3')"; fi
}
# The value of `expr` after sourcing environment.sh with the given IS_PR.
in_env() { # is_pr, expr
  (PROJECT=demo-project IS_PR="$1"; . "$DIR/environment.sh" && eval "printf '%s' \"$2\"") 2>/dev/null
}

expect "previews use the preview database"            app_preview                    "$(in_env true '$DB_NAME')"
expect "main uses the main database"                  app                            "$(in_env false '$DB_NAME')"
expect "previews' runtime logs in as the preview login" preview_runtime              "$(in_env true '$DB_LOGIN')"
expect "main's runtime logs in as the owner login"    app                            "$(in_env false '$DB_LOGIN')"
expect "previews read the preview login's password"   db-preview-password            "$(in_env true '$DB_PASSWORD_SECRET')"
expect "main reads the owner's password"              db-password                    "$(in_env false '$DB_PASSWORD_SECRET')"
expect "previews get their own auth secret"           better-auth-secret-preview     "$(in_env true '$AUTH_SECRET_NAME')"
expect "main gets the main auth secret"               better-auth-secret             "$(in_env false '$AUTH_SECRET_NAME')"
expect "previews use the preview bucket"              demo-project-files-preview     "$(in_env true '$FILES_BUCKET')"
expect "main uses the main bucket"                    demo-project-files             "$(in_env false '$FILES_BUCKET')"
expect "a preview dashboard runs as dashboard-preview" dashboard-preview@demo-project.iam.gserviceaccount.com "$(in_env true '$(runtime_sa dashboard)')"
expect "a main dashboard runs as dashboard-runtime"   dashboard-runtime@demo-project.iam.gserviceaccount.com "$(in_env false '$(runtime_sa dashboard)')"
expect "migrations always run as the owner login"     app                            "$(in_env true '$DB_OWNER_LOGIN')"
expect "the owner's password secret is db-password"   db-password                    "$(in_env true '$DB_OWNER_PASSWORD_SECRET')"
expect "the preview login is named once"              preview_runtime                "$(in_env false '$PREVIEW_DB_LOGIN')"
expect "the main database is named once"              app                            "$(in_env true '$MAIN_DB_NAME')"
expect "refuses to run without PROJECT"               refused \
  "$( (unset PROJECT; IS_PR=false; . "$DIR/environment.sh") >/dev/null 2>&1 && echo sourced || echo refused)"

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
