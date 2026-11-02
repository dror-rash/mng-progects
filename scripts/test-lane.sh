#!/usr/bin/env bash
# Tests for scripts/lane.sh (task 067). Needs the local Postgres: pnpm db:up. Run: bash scripts/test-lane.sh
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LANE="$ROOT/scripts/lane.sh"
N=9; BRANCH="test/lane-selftest-$$"
pass=0; fail=0
check() { # name, command...
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then pass=$((pass+1)); echo "ok   - $name"; else fail=$((fail+1)); echo "FAIL - $name"; fi
}
psql_() { # sql [database]
  psql "$(grep "^DATABASE_URL=" "$ROOT/.env" | cut -d= -f2- | sed "s|/[^/]*$|/${2:-postgres}|")" -tAc "$1"; }
cleanup() { LANE_FORCE=1 bash "$LANE" down "$N" >/dev/null 2>&1; git -C "$ROOT" branch -D "$BRANCH" >/dev/null 2>&1; }
trap cleanup EXIT

LANE_SKIP_INSTALL=1 bash "$LANE" up "$N" "$BRANCH" HEAD
dir="$(bash "$LANE" path "$N")"

check "creates a worktree on the lane's branch"   test "$(git -C "$dir" branch --show-current)" = "$BRANCH"
check "writes the lane's database to .env"         grep -q '^DATABASE_URL=postgres://postgres:postgres@localhost:5433/app_lane9$' "$dir/.env"
check "writes the lane's ports to .env"            grep -q '^SHELL_PORT=3090$' "$dir/.env"
check "points the shell at the lane's zones"       grep -q '^DASHBOARD_ZONE_URL=http://localhost:3092$' "$dir/.env"
check "points Better Auth at the lane's shell"     grep -q '^BETTER_AUTH_URL=http://localhost:3090$' "$dir/.env"
check "keeps the auth secret from the main .env"   grep -q '^BETTER_AUTH_SECRET=' "$dir/.env"
check "creates the lane's database"                test "$(psql_ "select 1 from pg_database where datname = 'app_lane9'")" = 1
check "migrates the lane's database"               test "$(psql_ "select to_regclass('public.project') is not null" app_lane9)" = t
check "runs commands with the lane's env"          test "$(bash "$LANE" exec "$N" -- printenv SHELL_PORT)" = 3090
check "runs commands in the lane's worktree"       test "$(bash "$LANE" exec "$N" -- pwd -P)" = "$(cd "$dir" && pwd -P)"
check "lists the lane"                             sh -c "bash '$LANE' list | grep -q 'lane 9'"
check "refuses to create a lane that exists"       sh -c "! LANE_SKIP_INSTALL=1 bash '$LANE' up $N other-branch HEAD"

bash "$LANE" down "$N" >/dev/null
check "removes the worktree"                       test ! -d "$dir"
check "drops the lane's database"                  test -z "$(psql_ "select 1 from pg_database where datname = 'app_lane9'")"
check "keeps the branch"                           git -C "$ROOT" rev-parse --verify -q "$BRANCH"

echo; echo "$pass passed, $fail failed"
[ "$fail" = 0 ]
