# ADR-0010: An agent team with enforced rules

- **Status:** accepted
- **Date:** 2026-11-02

## Context
Until now one agent session did each task from start to finish: planning, tests, code, review and validation. The rules in `CLAUDE.md` held because that session remembered them. M9 showed that parallel lanes (one agent and worktree each) work, but they were set up by hand each time. The POC (2026-11-13) needs about nine tasks in eight days.

## Decision
- **One job per agent.** The work is split across seven agents defined in `.claude/agents/`: planner, spec-writer, implementer, access-auditor, reviewer, infra and qa. The main session orchestrates and doesn't write task code itself.
- **Tool limits back up the prompts.** Read-only roles (access-auditor, reviewer) get no edit tools. The infra agent can't apply Terraform or deploy by hand.
- **Hard rules are hooks.** The rules that must never break (applied migrations, secrets files, `drizzle-orm` imports in apps, lint and typecheck before commits, feature-file commits, apply/deploy/force-push) are `PreToolUse` hooks in `.claude/hooks/`, not instructions.
- **Lanes are scripted.** Each task runs in its own worktree with its own database and ports (`scripts/lane.sh`).
- **Fixed pipeline.** Each task goes planner → spec-writer (red) → implementer (green) → access-auditor and reviewer in parallel → qa → merge.

## Alternatives considered
- **One general agent per task, as before.** It's simpler, but its review is anchored on its own work, and rules hold only through memory.
- **Many narrow agents** (for example one per zone or per layer). That means more hand-offs, and each hand-off loses context. Seven matches the steps in `WORKFLOW.md`.
- **Enforcement in CI only.** That catches problems too late: the agent has already built on the broken rule.

## Consequences
- **Good:**
  - Review isn't done by the author.
  - The non-negotiable rules are enforced.
  - Lanes can run in parallel without clashing over ports or the database.
- **Bad / trade-offs:**
  - More tokens per task (two reviewers, qa).
  - Hand-offs can drop detail, so the task file is the shared memory and each agent updates its progress log.
  - Hooks add a lint and typecheck run to every commit.
- **Follow-ups:**
  - Measure the tokens and time per task on the first two POC tasks and adjust the pipeline (for example, skip the access auditor on docs-only tasks).
