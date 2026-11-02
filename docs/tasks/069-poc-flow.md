# Task 069: The POC flow, end to end on the deployed app

- **Status:** todo
- **Milestone:** POC (2026-11-13)
- **Zone / package:** `e2e`, `apps/dashboard` (demo seed)
- **Feature file:** `docs/features/poc-flow.feature` (written by the planner and spec-writer when tasks 056–061 and 064 are done)
- **Depends on:** tasks 056, 057, 058, 059, 060, 061, 064, 068

## Why
The POC is one story that a viewer can follow, from a customer to a report, on a public URL. This task proves that the story works as a whole, not just piece by piece.

## Scope
- **One long scenario** (`@poc`) with an admin, a worker and a partner user from the `people` fixture:
  - **Admin:**
    - creates a customer with a sub-company;
    - adds a site with an on-site contact;
    - creates a project at that site with two tasks;
    - publishes a reading form;
    - invites the worker and puts them on the project crew.
  - **Worker:**
    - logs a site visit;
    - adds a photo;
    - fills the reading;
    - moves a task to Done.
  - **Admin again:**
    - uploads a report;
    - sees the visit, photo, reading and report on the project.
  - **Partner:** sees only their own project's site and data (a short check, as the leak suite already covers the details).
- **Runs:** locally, and against the deployed preview (`BASE_URL`).
- **Demo data:** `seed:demo` adds sites, visits, readings and a report, so the deployed app has something to show. The seed runs on the deployed database for a demo account only (owner's choice: demo data, no real users).

## Out of scope
- Offline capture (tasks 062–063) and the generated PDF report (task 065): after the POC.

## Acceptance criteria
- [ ] `@poc` passes locally and against the preview URL.
- [ ] The demo account on the deployed app shows the whole flow.

## Progress log
- 2026-11-02 – Planned. The owner agreed to leave offline capture and the generated report out of the POC.
