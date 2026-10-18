# ADR-0001: Monorepo with multi-zone Next.js

- **Status:** accepted
- **Date:** YYYY-MM-DD

## Context
Projects started from this template should support multiple teams and independent deployments without a rewrite later.

## Decision
Use a Turborepo + pnpm monorepo. Each zone is a separate Next.js app deployed to its own Cloud Run service, with a shell zone routing to the others via rewrites.

## Alternatives considered
- Single Next.js app – simpler, but couples deploys and team ownership as it grows.
- Module Federation / runtime micro-frontends – more flexibility, much higher complexity and weaker App Router support.

## Consequences
- **Good:** independent deploys, clear ownership, affected-only CI.
- **Bad / trade-offs:** hard navigation between zones, shared state needs explicit contracts, more infra to manage.
- **Follow-ups:** document the auth/session contract (ADR-0002).
