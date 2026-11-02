#!/usr/bin/env bash
# Parallel lanes for the agent team (task 067, ADR-0010): one worktree, branch, database and set of ports per task.
#
#   scripts/lane.sh up <n> <branch> [base]   worktree + .env + database app_lane<n> + migrate (+ pnpm install)
#   scripts/lane.sh exec <n> -- <cmd...>     run a command in the lane's worktree with its .env exported
#   scripts/lane.sh path <n>                 print the worktree path
#   scripts/lane.sh list                     list lanes
#   scripts/lane.sh down <n>                 remove the worktree (must be clean) and drop the database; keeps the branch
#
# Lane n uses ports 3000+10n (shell), 3001+10n (example zone), 3002+10n (dashboard); n is 1–9.
# Env: LANE_SKIP_INSTALL=1 skips pnpm install; LANE_FORCE=1 lets `down` remove a dirty worktree.
set -euo pipefail

ROOT="$(git -C "$(dirname "$0")" rev-parse --path-format=absolute --git-common-dir | xargs dirname)"
LANES_DIR="${LANES_DIR:-$(dirname "$ROOT")/$(basename "$ROOT")-lanes}"

die() { echo "lane: $*" >&2; exit 1; }
lane_n() { [[ "${1:-}" =~ ^[1-9]$ ]] || die "lane number must be 1–9, got '${1:-}'"; echo "$1"; }
lane_dir() { echo "$LANES_DIR/lane-$1"; }

main_env() { [ -f "$ROOT/.env" ] || die "no $ROOT/.env (copy .env.example)"; cat "$ROOT/.env"; }
env_value() { main_env | grep -E "^$1=" | tail -1 | cut -d= -f2-; }

# DATABASE_URL of the main .env, with another database name.
db_url() { local url; url="$(env_value DATABASE_URL)"; echo "${url%/*}/$1"; }

psql_admin() { # sql
  if command -v psql >/dev/null; then psql "$(db_url postgres)" -v ON_ERROR_STOP=1 -tAqc "$1"
  else
    local port; port="$(db_url x | sed -E 's|.*:([0-9]+)/.*|\1|')"
    docker exec -i "$(docker ps --filter "publish=$port" -q | head -1)" psql -U postgres -v ON_ERROR_STOP=1 -tAqc "$1"
  fi
}

cmd_up() {
  local n branch base dir db sp ep dp
  n="$(lane_n "${1:-}")"; branch="${2:?usage: lane.sh up <n> <branch> [base]}"; base="${3:-origin/main}"
  dir="$(lane_dir "$n")"; db="app_lane$n"
  [ -e "$dir" ] && die "lane $n exists at $dir (lane.sh down $n first)"
  sp=$((3000 + 10 * n)); ep=$((3001 + 10 * n)); dp=$((3002 + 10 * n))

  mkdir -p "$LANES_DIR"
  if git -C "$ROOT" rev-parse -q --verify "refs/heads/$branch" >/dev/null; then git -C "$ROOT" worktree add -q "$dir" "$branch"
  else git -C "$ROOT" worktree add -q -b "$branch" "$dir" "$base"; fi

  # The main .env with this lane's database, ports and URLs.
  main_env | grep -vE '^(DATABASE_URL|SHELL_PORT|EXAMPLE_PORT|DASHBOARD_PORT|EXAMPLE_ZONE_URL|DASHBOARD_ZONE_URL|BETTER_AUTH_URL)=' > "$dir/.env"
  cat >> "$dir/.env" <<EOF

# Lane $n (scripts/lane.sh)
DATABASE_URL=$(db_url "$db")
SHELL_PORT=$sp
EXAMPLE_PORT=$ep
DASHBOARD_PORT=$dp
EXAMPLE_ZONE_URL=http://localhost:$ep
DASHBOARD_ZONE_URL=http://localhost:$dp
BETTER_AUTH_URL=http://localhost:$sp
EOF

  if [ -z "$(psql_admin "select 1 from pg_database where datname = '$db'")" ]; then psql_admin "create database $db" >/dev/null; fi
  if [ "${LANE_SKIP_INSTALL:-}" != 1 ]; then (cd "$dir" && pnpm install --frozen-lockfile --prefer-offline --silent); fi
  if [ -d "$dir/node_modules" ] || [ -d "$ROOT/node_modules" ]; then
    # Without its own install, the lane borrows the main checkout's drizzle-kit (same lockfile).
    (cd "$dir" && set -a && . ./.env && set +a && \
      { [ -d node_modules ] && pnpm -s db:migrate || (cd packages/db && "$ROOT/packages/db/node_modules/.bin/drizzle-kit" migrate); }) >/dev/null
  fi
  echo "lane $n: $dir (branch $branch, database $db, shell http://localhost:$sp)"
}

cmd_exec() {
  local n dir; n="$(lane_n "${1:-}")"; shift; [ "${1:-}" = "--" ] && shift
  dir="$(lane_dir "$n")"; [ -d "$dir" ] || die "no lane $n"
  cd "$dir"; set -a; . ./.env; set +a; exec "$@"
}

cmd_list() {
  local d n
  for d in "$LANES_DIR"/lane-*; do
    [ -d "$d" ] || continue; n="${d##*-}"
    echo "lane $n  $(git -C "$d" branch --show-current)  http://localhost:$((3000 + 10 * n))  $d"
  done
}

cmd_down() {
  local n dir; n="$(lane_n "${1:-}")"; dir="$(lane_dir "$n")"
  if [ -d "$dir" ]; then
    if [ "${LANE_FORCE:-}" != 1 ] && [ -n "$(git -C "$dir" status --porcelain --untracked-files=no)" ]; then
      die "lane $n has uncommitted changes; commit them or set LANE_FORCE=1"
    fi
    git -C "$ROOT" worktree remove --force "$dir"
  fi
  psql_admin "drop database if exists app_lane$n with (force)" >/dev/null
  echo "lane $n removed (branch kept)"
}

case "${1:-}" in
  up) shift; cmd_up "$@" ;;
  exec) shift; cmd_exec "$@" ;;
  path) lane_dir "$(lane_n "${2:-}")" ;;
  list) cmd_list ;;
  down) shift; cmd_down "$@" ;;
  *) sed -n '2,12p' "$0"; exit 1 ;;
esac
