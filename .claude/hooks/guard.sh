#!/usr/bin/env bash
# PreToolUse guard for the agent team (task 067, ADR-0010).
# Exit 2 refuses the tool call; stderr goes back to the agent as the reason.
# Env: GUARD_BASE_REF (default origin/main): what counts as "applied" for migrations.
#      GUARD_SKIP_CHECKS=1 skips lint/typecheck on commit (tests only).
set -uo pipefail

input="$(cat)"
tool="$(jq -r '.tool_name // ""' <<<"$input")"
cwd="$(jq -r '.cwd // empty' <<<"$input")"; cwd="${cwd:-$PWD}"

deny() { echo "Refused by .claude/hooks/guard.sh: $*" >&2; exit 2; }

base_ref() { # $1 = repo root
  local ref="${GUARD_BASE_REF:-origin/main}"
  git -C "$1" rev-parse -q --verify "$ref" >/dev/null 2>&1 && { echo "$ref"; return; }
  git -C "$1" rev-parse -q --verify main >/dev/null 2>&1 && echo main
}

is_applied_migration() { # $1 = repo root, $2 = path relative to root
  case "$2" in
    packages/db/migrations/meta/_journal.json) return 1 ;;
    packages/db/migrations/*) ;;
    *) return 1 ;;
  esac
  local ref; ref="$(base_ref "$1")"; [ -n "$ref" ] || return 1
  git -C "$1" cat-file -e "$ref:$2" 2>/dev/null
}

imports_drizzle() { grep -Eq "(from|require\(|import\()[[:space:]]*['\"]drizzle-orm" ; }

# ---------- file edits ----------
case "$tool" in
  Edit|Write|MultiEdit|NotebookEdit)
    path="$(jq -r '.tool_input.file_path // .tool_input.notebook_path // ""' <<<"$input")"
    name="$(basename "$path")"
    case "$name" in
      .env.example) ;;
      .env|.env.*) deny "$name holds local secrets and is never edited by agents (CLAUDE.md rule 7). Change .env.example instead and tell the owner." ;;
    esac
    case "$path" in
      *.tfvars|*/backend.hcl|*.tfstate|*.tfstate.*)
        deny "$name is Terraform config/state the owner keeps out of the repo (CLAUDE.md rule 10). Change variables.tf or the .example files." ;;
    esac
    dir="$(dirname "$path")"; while [ ! -d "$dir" ]; do dir="$(dirname "$dir")"; done
    path="$(cd "$dir" && pwd -P)${path#"$dir"}" # resolve symlinks, as git does for the root
    root="$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || true)"
    if [ -n "$root" ] && is_applied_migration "$root" "${path#"$root"/}"; then
      deny "${path#"$root"/} is an applied migration (it is in $(base_ref "$root")). Never edit applied migrations (CLAUDE.md rule 12): change packages/db/src/schema.ts and run pnpm db:generate for a new one."
    fi
    case "$path" in
      */apps/*)
        if jq -r '[.tool_input.new_string, .tool_input.content, (.tool_input.edits // [] | .[].new_string)] | map(select(. != null)) | join("\n")' <<<"$input" | imports_drizzle; then
          deny "apps import query operators from @repo/db, not drizzle-orm (CLAUDE.md rule 12)."
        fi ;;
    esac
    exit 0 ;;
  Bash) ;;
  *) exit 0 ;;
esac

# ---------- shell commands ----------
cmd="$(jq -r '.tool_input.command // ""' <<<"$input")"

grep -Eq '(^|[^[:alnum:]_-])terraform[[:space:]]+(.*[[:space:]])?(apply|destroy)([[:space:]]|$)' <<<"$cmd" \
  && deny "terraform apply/destroy runs only in CI or by the owner (CLAUDE.md rule 10). Run terraform plan and put its output in the PR."
grep -Eq 'gcloud[[:space:]]+run[[:space:]]+(deploy|services[[:space:]]+(update|update-traffic|delete))' <<<"$cmd" \
  && deny "Deploys go through .github/workflows/deploy.yml, never by hand (CLAUDE.md rule 10)."
grep -Eq 'git[[:space:]]+push([[:space:]].*)?[[:space:]](--force|--force-with-lease|-f)([[:space:]=]|$)' <<<"$cmd" \
  && deny "No force pushes. Add a commit instead, or ask the owner."

grep -Eq 'git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?commit([[:space:]]|$)' <<<"$cmd" || exit 0

commit_part="$(grep -Eo 'commit([[:space:]][^;&|]*)?' <<<"$cmd" | head -1)"
grep -Eq '[[:space:]](--no-verify|-n)([[:space:]]|$)' <<<"$commit_part" && deny "Commits never skip checks (--no-verify)."

root="$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)" || exit 0
type="$(grep -Eo '(feat|fix|refactor|test|docs|chore|perf|build|ci|style)(\([^)]*\))?!?:' <<<"$cmd" | head -1 | sed -E 's/[(!:].*//')"

# What the commit will contain: the index, plus the working tree when the same command stages (git add / commit -a).
changes="$(git -C "$root" diff --cached --name-status)"
staging=0
if grep -Eq 'git[[:space:]]+add|commit[[:space:]]+(.*[[:space:]])?-[[:alnum:]]*a' <<<"$cmd"; then
  staging=1
  changes="$changes"$'\n'"$(git -C "$root" diff --name-status)"
fi

if [[ "$type" =~ ^(feat|fix|refactor)$ ]] && grep -Eq $'\tdocs/features/[^\t]*\.feature$' <<<"$changes"; then
  deny "a $type: commit must not change docs/features/*.feature (CLAUDE.md rule 2). Commit feature changes on their own as docs(features): with the reason, or remove @wip in the task's test: commit."
fi

while IFS=$'\t' read -r status file rest; do
  [ -n "${file:-}" ] || continue
  case "$status" in M*|D*|R*) ;; *) continue ;; esac
  is_applied_migration "$root" "$file" && deny "$file is an applied migration and must not change (CLAUDE.md rule 12). Unstage it and generate a new migration."
done <<<"$changes"

if { git -C "$root" diff --cached -U0 -- apps; if [ "$staging" = 1 ]; then git -C "$root" diff -U0 -- apps; fi; } | grep '^+' | imports_drizzle; then
  deny "the commit adds a drizzle-orm import under apps/. Import query operators from @repo/db (CLAUDE.md rule 12)."
fi

if [ "${GUARD_SKIP_CHECKS:-}" != 1 ]; then
  if ! out="$(cd "$root" && pnpm -s lint 2>&1 && pnpm -s typecheck 2>&1)"; then
    deny "pnpm lint && pnpm typecheck must pass before any commit. Last lines:
$(tail -n 30 <<<"$out")"
  fi
fi
exit 0
