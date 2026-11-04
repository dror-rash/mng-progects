#!/usr/bin/env bash
# End-to-end test of the deploy's database steps on fresh databases, set up like Cloud SQL (task 068):
# the databases belong to a cloudsqlsuperuser stand-in, and main's owner login is a non-superuser with
# CREATEROLE, a member of it, and ADMIN on app_user (it created it on Cloud SQL). Then, as the workflow does:
#   main:    migrate `app` as the owner -> provision the preview logins -> role check as the owner
#   preview: verify the logins -> migrate `app_preview` as preview_owner -> role check as preview_runtime
# and the preview logins can't connect to `app`. Every role and database gets a unique name and is dropped.
# Needs DATABASE_URL of a superuser on a cluster where the migrations have run once (app_user exists).
# Run: bash infra/scripts/test-preview-migrate.sh
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
: "${DATABASE_URL:?Set DATABASE_URL (a superuser on a migrated cluster)}"
BASE="${DATABASE_URL%/*}"                       # postgres://user:pw@host:port
HOSTPART="${BASE#*@}"                           # host:port
n="$$"
SU="role_check_cloudsqlsuperuser_$n"; APP="role_check_app_$n"; OWNER="role_check_preview_owner_$n"; RUNTIME="role_check_preview_runtime_$n"
MAIN_DB="role_check_app_$n"; PREVIEW_DB="role_check_app_preview_$n"
APP_PW="app-pw-$n-$RANDOM"; OWNER_PW="owner-pw-$n-$RANDOM"; RUNTIME_PW="runtime-pw-$n-$RANDOM"
url() { echo "postgres://$1:$2@${HOSTPART}/$3"; }  # login, password, database
su_sql() { psql "${BASE}/postgres" -v ON_ERROR_STOP=1 -qtAc "$1"; }
NODE=(node --experimental-strip-types --no-warnings)

pass=0; fail=0
check() { # name, command...
  local name="$1"; shift
  local out; if out="$("$@" 2>&1)"; then pass=$((pass+1)); echo "ok   - $name"; else fail=$((fail+1)); echo "FAIL - $name"; echo "$out" | tail -15 | sed 's/^/       /'; fi
}
refused() { psql "$1" -qtAc "select 1" 2>&1 | grep -q "permission denied for database"; }  # not a wrong password
cleanup() {
  su_sql "drop database if exists $PREVIEW_DB with (force)" >/dev/null 2>&1
  su_sql "drop database if exists $MAIN_DB with (force)" >/dev/null 2>&1
  su_sql "drop owned by $OWNER, $RUNTIME, $APP, $SU" >/dev/null 2>&1
  su_sql "drop role if exists $OWNER, $RUNTIME" >/dev/null 2>&1
  su_sql "drop role if exists $APP, $SU" >/dev/null 2>&1
}
trap cleanup EXIT

su_sql "create role $SU nologin; create role $APP login createrole password '$APP_PW'; grant $SU to $APP;
        grant app_user to $APP with admin option" || exit 1
su_sql "create database $MAIN_DB owner $SU" && su_sql "create database $PREVIEW_DB owner $SU" || exit 1

export MAIN_DB_NAME="$MAIN_DB" PREVIEW_DB_NAME="$PREVIEW_DB" MAIN_OWNER_LOGIN="$APP" PREVIEW_OWNER_LOGIN="$OWNER" PREVIEW_RUNTIME_LOGIN="$RUNTIME"
migrate() { (cd "$ROOT" && DATABASE_URL="$1" pnpm --silent --filter @repo/db db:migrate); }

check "main: migrations run as a non-superuser owner login" migrate "$(url "$APP" "$APP_PW" "$MAIN_DB")"
check "main: provisions the preview logins (as that login, connected to the preview database)" \
  env DATABASE_URL="$(url "$APP" "$APP_PW" "$PREVIEW_DB")" PREVIEW_OWNER_PASSWORD="$OWNER_PW" PREVIEW_RUNTIME_PASSWORD="$RUNTIME_PW" \
  "${NODE[@]}" "$ROOT/infra/scripts/provision-db-logins.mjs"
check "main: provisioning again changes nothing (idempotent)" \
  env DATABASE_URL="$(url "$APP" "$APP_PW" "$PREVIEW_DB")" PREVIEW_OWNER_PASSWORD="$OWNER_PW" PREVIEW_RUNTIME_PASSWORD="$RUNTIME_PW" \
  "${NODE[@]}" "$ROOT/infra/scripts/provision-db-logins.mjs"
check "main: role check passes as the owner login" \
  env DATABASE_URL="$(url "$APP" "$APP_PW" "$MAIN_DB")" "${NODE[@]}" "$ROOT/infra/scripts/check-runtime-role.mjs"
check "preview: verifies the logins as preview_owner" \
  env DATABASE_URL="$(url "$OWNER" "$OWNER_PW" "$PREVIEW_DB")" "${NODE[@]}" "$ROOT/infra/scripts/provision-db-logins.mjs" --verify-only
check "preview: migrations run as preview_owner on a fresh database" migrate "$(url "$OWNER" "$OWNER_PW" "$PREVIEW_DB")"
check "preview: preview_owner owns the preview tables" \
  test "$(psql "$(url "$OWNER" "$OWNER_PW" "$PREVIEW_DB")" -qtAc "select pg_get_userbyid(relowner) from pg_class where oid = 'public.workspace'::regclass")" = "$OWNER"
check "preview: role check passes as preview_runtime" \
  env DATABASE_URL="$(url "$RUNTIME" "$RUNTIME_PW" "$PREVIEW_DB")" "${NODE[@]}" "$ROOT/infra/scripts/check-runtime-role.mjs"
check "preview_runtime can't connect to the main database" refused "$(url "$RUNTIME" "$RUNTIME_PW" "$MAIN_DB")"
check "preview_owner can't connect to the main database" refused "$(url "$OWNER" "$OWNER_PW" "$MAIN_DB")"
check "preview_runtime can't create objects in the preview database" \
  sh -c "! psql '$(url "$RUNTIME" "$RUNTIME_PW" "$PREVIEW_DB")' -qtAc 'create table role_check_t (id int)' >/dev/null 2>&1"

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
