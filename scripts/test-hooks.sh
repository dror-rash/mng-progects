#!/usr/bin/env bash
# Tests for .claude/hooks/guard.sh (task 067). Run: bash scripts/test-hooks.sh
# Each case feeds a PreToolUse JSON payload to the guard and checks: 0 = allowed, 2 = refused.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GUARD="$ROOT/.claude/hooks/guard.sh"
pass=0; fail=0

payload() { # tool, json-input
  jq -nc --arg tool "$1" --argjson input "$2" --arg cwd "$ROOT" \
    '{hook_event_name:"PreToolUse", tool_name:$tool, tool_input:$input, cwd:$cwd}'
}

expect() { # want-exit, name, tool, json-input
  local want="$1" name="$2" out code
  out="$(payload "$3" "$4" | GUARD_SKIP_CHECKS=1 bash "$GUARD" 2>&1)"; code=$?
  if [ "$code" = "$want" ]; then pass=$((pass+1)); echo "ok   - $name"
  else fail=$((fail+1)); echo "FAIL - $name (exit $code, want $want) $out"; fi
}

edit()  { jq -nc --arg p "$1" --arg s "${2:-x}" '{file_path:$p, old_string:"a", new_string:$s}'; }
write() { jq -nc --arg p "$1" --arg s "${2:-x}" '{file_path:$p, content:$s}'; }
bash_() { jq -nc --arg c "$1" '{command:$c}'; }

# Files
expect 2 "refuses editing an applied migration"        Edit  "$(edit "$ROOT/packages/db/migrations/0001_modern_blindfold.sql")"
expect 2 "refuses editing an applied migration snapshot" Write "$(write "$ROOT/packages/db/migrations/meta/0001_snapshot.json")"
LINK_DIR="$(mktemp -d)"; ln -s "$ROOT" "$LINK_DIR/repo"
expect 2 "refuses editing an applied migration through a symlinked path" Edit "$(edit "$LINK_DIR/repo/packages/db/migrations/0001_modern_blindfold.sql")"
expect 0 "allows writing a new migration"               Write "$(write "$ROOT/packages/db/migrations/9999_new.sql")"
expect 0 "allows editing the migration journal"         Edit  "$(edit "$ROOT/packages/db/migrations/meta/_journal.json")"
expect 2 "refuses editing .env"                         Edit  "$(edit "$ROOT/.env")"
expect 0 "allows editing .env.example"                  Edit  "$(edit "$ROOT/.env.example")"
expect 2 "refuses editing terraform.tfvars"             Write "$(write "$ROOT/infra/terraform.tfvars")"
expect 2 "refuses editing backend.hcl"                  Write "$(write "$ROOT/infra/backend.hcl")"
expect 2 "refuses editing Terraform state"              Write "$(write "$ROOT/infra/terraform.tfstate")"
expect 2 "refuses a drizzle-orm import in an app"       Write "$(write "$ROOT/apps/dashboard/features/x.ts" 'import { eq } from "drizzle-orm";')"
expect 0 "allows a drizzle-orm import in packages/db"   Write "$(write "$ROOT/packages/db/src/x.ts" 'import { eq } from "drizzle-orm";')"
expect 0 "allows an @repo/db import in an app"          Edit  "$(edit "$ROOT/apps/dashboard/features/x.ts" 'import { eq } from "@repo/db";')"

# Commands
expect 2 "refuses terraform apply"                      Bash "$(bash_ "cd infra && terraform apply -auto-approve")"
expect 2 "refuses terraform destroy"                    Bash "$(bash_ "terraform destroy")"
expect 0 "allows terraform plan"                        Bash "$(bash_ "cd infra && terraform plan -no-color")"
expect 2 "refuses gcloud run deploy"                    Bash "$(bash_ "gcloud run deploy shell --image x")"
expect 2 "refuses a force push"                         Bash "$(bash_ "git push --force origin main")"
expect 2 "refuses a short force push"                   Bash "$(bash_ "git push -f")"
expect 0 "allows a normal push"                         Bash "$(bash_ "git push -u origin feat/x")"
expect 0 "allows ordinary commands"                     Bash "$(bash_ "pnpm test")"
expect 0 "allows -n elsewhere in a commit command"     Bash "$(bash_ "git commit -m 'docs: x' && git log -n 1")"
expect 2 "refuses --no-verify on commit"                Bash "$(bash_ "git commit --no-verify -m 'feat: x'")"

# Commits, in a throwaway repo where "main" plays origin/main
REPO="$(mktemp -d)"; trap 'rm -rf "$REPO" "$LINK_DIR"' EXIT
git -C "$REPO" init -q -b main && git -C "$REPO" config user.email t@example.com && git -C "$REPO" config user.name t
mkdir -p "$REPO/packages/db/migrations" "$REPO/docs/features" "$REPO/apps/dashboard"
echo "select 1;" > "$REPO/packages/db/migrations/0001_init.sql"; echo "Feature: x" > "$REPO/docs/features/x.feature"; touch "$REPO/apps/dashboard/.gitkeep"
git -C "$REPO" add -A && git -C "$REPO" commit -qm init
commit() { # want-exit, name, message, setup
  local want="$1" name="$2" msg="$3" out code
  git -C "$REPO" reset -q --hard; git -C "$REPO" clean -qfd; (cd "$REPO" && eval "$4" && git add -A)
  out="$(jq -nc --arg c "git commit -m \"$msg\"" --arg cwd "$REPO" '{tool_name:"Bash", tool_input:{command:$c}, cwd:$cwd}' \
    | GUARD_SKIP_CHECKS=1 GUARD_BASE_REF=main bash "$GUARD" 2>&1)"; code=$?
  if [ "$code" = "$want" ]; then pass=$((pass+1)); echo "ok   - $name"
  else fail=$((fail+1)); echo "FAIL - $name (exit $code, want $want) $out"; fi
}
commit 2 "refuses a feat: commit that changes a feature file" "feat(dashboard): x"     'echo more >> docs/features/x.feature'
commit 2 "refuses a fix: commit that changes a feature file"  "fix: x"                 'echo more >> docs/features/x.feature'
commit 0 "allows a docs: commit that changes a feature file"  "docs(features): x"      'echo more >> docs/features/x.feature'
commit 0 "allows a test: commit that removes @wip"            "test: x, red"           'echo more >> docs/features/x.feature'
commit 2 "refuses a commit that changes an applied migration" "fix(db): x"             'echo more >> packages/db/migrations/0001_init.sql'
commit 0 "allows a commit that adds a migration"              "feat(db): x"            'echo "select 2;" > packages/db/migrations/0002_x.sql'
commit 2 "refuses a commit that adds a drizzle-orm import to an app" "feat: x"         "echo 'import { eq } from \"drizzle-orm\";' > apps/dashboard/x.ts"

echo; echo "$pass passed, $fail failed"
[ "$fail" = 0 ]
