# ADR-0002: Cloud Run, Workload Identity Federation, per-PR previews

- **Status:** accepted
- **Date:** YYYY-MM-DD

## Context
Each zone must deploy independently, scale to zero, and be testable per pull request without long-lived credentials.

## Decision
- One Cloud Run service per zone, each with its own runtime service account.
- GitHub Actions authenticates with Workload Identity Federation, restricted to this repository.
- PRs deploy no-traffic revisions tagged `pr-<N>`; Playwright runs against the preview; tags are removed when the PR closes.
- Terraform owns infrastructure; GitHub Actions owns image deploys (Terraform ignores image and traffic drift).
- The shell is built with the example zone's URL because Next.js evaluates rewrites at build time.

## Alternatives considered
- GKE – more control, far more operational overhead for this scale.
- Service account JSON keys in GitHub secrets – simpler, but long-lived credentials.
- Firebase App Hosting / Vercel – easier previews, but outside the chosen GCP-only stack.

## Consequences
- **Good:** no stored keys, scale-to-zero cost, real preview per PR, zones deploy independently.
- **Bad / trade-offs:** shell must be rebuilt when a zone URL changes; previews share the production project; both zones deploy on every run.
- **Follow-ups:** separate preview/prod deployers, registry cleanup policy, change detection, load balancer for a single domain.
