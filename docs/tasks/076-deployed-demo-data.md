# Task 076: Demo data on the deployed app

- **Status:** todo (blocked on the open questions below)
- **Milestone:** POC (2026-11-13)
- **Zone / package:** `apps/dashboard` (`scripts/seed-demo.ts`, `features/demo/`), `.github/workflows/`, possibly `infra/`
- **Feature file:** none (no visible behavior of the app; the seed's own tests and a check by hand on the deployed app)
- **Depends on:** tasks 058–061 and 064 (visits, photos, reading forms, readings, reports: done), 068 (the deploy pipeline: done). Split from task 069 on 2026-11-07.

## Why
The POC is shown on the deployed app, and a viewer should find a customer's whole story there (sites, visits, photos, readings, a report), not an empty dashboard. The owner chose demo data in a demo account only, no real users (2026-11-02).

## Scope
- **`seed:demo` adds the field data** to the demo projects it already makes (customers, sub-companies, sites with on-site contacts, projects and tasks): visits with notes and the people who were there, a published reading form with readings on some visits, and, depending on the answer to question 2, photos and a report. Reruns keep replacing only the demo data (customers tagged `demo` and what hangs off them).
- **The seed reaches the deployed database through CI only** (rule 10: no change to the database by hand, no credentials outside Secret Manager), for one demo account that the owner signs up through the app on the `main` URL. The route is open question 1.
- **Never on previews' throwaway accounts or any account but the one named**; the script keeps refusing an email with no account.

## Out of scope
- Generated PDF reports (task 065) and offline capture (062–063).
- Demo data on previews.
- Resetting or deleting anything on the deployed database other than the demo account's demo data (`reset:local` stays local-only).

## Acceptance criteria
- [ ] Locally, `seed:demo` gives every demo project's site a visit history, some with a reading of the demo form (and photos and a report, per question 2); the seed's tests cover it.
- [ ] On the deployed app, the demo account shows the whole flow on at least one project: customer → sub-company → site → project with tasks, a visit, a photo, a reading and a report.
- [ ] The seed ran through CI (the run is linked here); nothing was changed on the deployed database by hand.

## Approach (brief)
Depends on question 1. Whatever the route, the seed connects as the database's owner login through the Cloud SQL proxy, as the deploy job's migration step does, and its secrets come from Secret Manager.

## Test plan
- Unit: the demo plan (`features/demo/seed-plan`) gains visits and readings; its existing tests extend.
- DB: the seed against a local database: field data exists for the demo projects, a rerun replaces it, nothing outside the demo customers changes.
- By hand: sign in as the demo account on the `main` URL and walk the flow.

## Open questions (for the owner)
1. **How does the seed reach the deployed database?** Today only a push to `main` may use main's deployer (Workload Identity, `infra/main.tf`: `workflow_dispatch` is refused on purpose).
   - **(a) Recommended default:** a step in `deploy.yml`, on `main` deploys only, after the migrations, that runs `seed:demo --email "$DEMO_EMAIL"` when the repository variable `DEMO_EMAIL` is set, and only when the demo workspace has no demo data yet (so a later deploy never wipes what was added by hand). No Terraform change and no new identity: it uses the owner login the migration step already has. To reseed, clear the demo data with a flag variable or wait for a new account.
   - (b) A manually run workflow ("Seed demo", `workflow_dispatch` on `main`) with its own narrow identity (a `demo-seeder` service account: Cloud SQL client and the database password only), allowed by a new Workload Identity target. Clearer to run on demand, but a Terraform change the owner applies, and a third identity that can write as the owner login.
   - (c) No seed on the deployed app: the owner, signed in as the demo account, walks the flow by hand through the app (about 15 minutes), using the `@poc` scenario as the script.
2. **Photos and a report in the seed?** Seeding them means writing objects to the main bucket from CI, which main's deployer can't do today (a Terraform grant). **Recommended default:** the seed leaves files out; after it runs, the owner uploads one photo and one report on the demo project through the app.
3. **Which email is the demo account?** It must not be a real person's address in the repo; with (a) or (b) it lives in a repository variable or a workflow input, not in a commit. **Recommended default:** an address the owner controls, set as the `DEMO_EMAIL` repository variable.

## Progress log
- 2026-11-07 – Split from task 069: the demo data on the deployed app needs a decision on how a seed reaches the deployed database through CI, which doesn't belong in 069's e2e change. Three open questions for the owner, each with a recommended default.

## Parking lot
- Reset the demo account's data from CI (a "reseed" flag), if the owner wants a clean demo before each showing.
