# Task 004: Interactive Template Scaffolding Script

- **Status:** done
- **Milestone:** M3
- **Zone / package:** `scripts/create-project.sh`, root `package.json`
- **Feature file:** `docs/features/template-scaffold.feature`

## Why
Developers starting a new project need a fast, interactive, and automated way to scaffold a ready-to-run repository from this multi-zone template with customizable project names, fresh secret keys, git initialization, and dependency setup.

## Scope
- Create `scripts/create-project.sh` as an executable bash script.
- Prompt interactively for:
  - Destination directory / project name (default: `my-waypoint-app`)
  - Project display name / description
  - Port base / configuration confirmations
  - Whether to run `pnpm install` immediately (default: yes)
  - Whether to initialize a new git repository (default: yes)
- Copy clean template files (excluding `.git`, `node_modules`, `.next`, `.turbo`, `dist`, `.env`, temporary logs).
- Replace placeholders and customize `package.json` name.
- Generate a secure `.env` file with a freshly generated `BETTER_AUTH_SECRET`.
- Support non-interactive mode via flags (e.g., `--name <name> --dest <path> --skip-install --skip-git`) so it can be easily automated and tested.
- Add an automated integration test in `scripts/test-scaffold.sh`.
- Expose `"scaffold"` in root `package.json` scripts.

## Out of scope
- Automatic GCP cloud infrastructure provisioning (Terraform applies separately).
- Remote GitHub repo creation via GitHub CLI (instructions printed at the end).

## Acceptance criteria
- [x] Running the script scaffolds a clean directory with the template codebase.
- [x] Customized project name is applied to `package.json`.
- [x] `.env` is generated with a fresh 32+ character random `BETTER_AUTH_SECRET`.
- [x] Script supports interactive prompts with sensible defaults when running in a terminal.
- [x] Script supports non-interactive flags for automated workflows.
- [x] Automated tests verify scaffolding in a temporary directory.

## Approach (brief)
1. Write a failing integration test in `scripts/test-scaffold.sh` (Red run).
2. Implement `scripts/create-project.sh` with interactive `read` prompts, flag parsing, file copying, template substitutions, secret generation, and optional `pnpm install` / `git init`.
3. Add `"scaffold": "bash scripts/create-project.sh"` to root `package.json`.
4. Run integration tests to verify green status.

## Test plan
- Integration test: `scripts/test-scaffold.sh`
- Manual / CLI test: interactive execution verification

## Progress log
- 2026-10-18 – Task created for Milestone M3.
- 2026-10-18 – Implemented scripts/create-project.sh with interactive prompts, flag parsing, clean rsync/tar copying, secret generation, and tested via scripts/test-scaffold.sh.
