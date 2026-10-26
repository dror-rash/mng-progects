# ADR-0004: One typed directory for customers and other external organizations

- **Status:** accepted
- **Date:** 2026-10-23

## Context
Tasks and projects need to relate to outside parties. Customers come first; external services, suppliers and partners are expected later. Each has a name, contact details, notes and people to talk to. We want a new kind to be cheap to add, and a task to be able to point at any of them.

## Decision
- One `organization` table with a `kind` column (`customer` first). Kinds are defined once in code, the same way task statuses are.
- Shared fields: name, kind, status (`lead` / `active` / `past`), phone, email, address, website, company/tax ID, general information, tags (`text[]`).
- Child tables keyed by organization: `organization_contact` (name, role, phone, email) and `organization_note` (dated log entry).
- Links: `project.organization_id` and `task.organization_id`, both nullable, `ON DELETE SET NULL`. A task can point at a different organization than its project.
- Organizations are owned by a user (`owner_id`), like projects, until sharing arrives (M8).
- Lives in the `apps/dashboard` zone at `/dashboard/customers`, since tasks and projects link to it and zones can't import each other.

## Alternatives considered
- Separate table per kind (`customer`, `vendor`, …) – fields could differ per kind, but every new kind means a new table, pages, links from task and project, and migrations.
- Polymorphic "related entity" link on tasks (`entity_type`, `entity_id`) – flexible, but no foreign keys, so deletes can leave dangling links.
- A separate `customers` zone – independent deploys, but the task and project pages need the data directly; sharing it would mean moving queries into a package early.

## Consequences
- **Good:** adding a kind is a code change plus UI labels; task and project links work for every kind with no schema change; one list, one detail page, one set of tests.
- **Bad / trade-offs:** fields that only make sense for one kind go in shared columns or need a later per-kind extension table. Status values are shared across kinds.
- **For now:** only customers have pages, so project/task pickers and links resolve kind `customer` only; a link to another kind would show as "No customer" until that kind gets UI.
- **Follow-ups:** revisit ownership with the sharing/authorization ADR (M8). Add per-kind fields only when a real kind needs them.
