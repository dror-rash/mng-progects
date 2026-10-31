# Task 042: New project page

- **Status:** in-progress
- **Milestone:** unscheduled (requested directly)
- **Zone / package:** `apps/dashboard`, `e2e`
- **Feature file:** `docs/features/project-dashboard.feature`, `docs/features/dashboard-home.feature`, `docs/features/form-validation.feature`, `docs/features/customer-links.feature`

## Why
The create form sits at the top of All projects, above the list. As the list grows it pushes the projects down, and it leaves no room for the table and filters (task 043). Customers already have their own page (`/customers/new`); projects should work the same way.

## Scope
- `/projects/new`: a page with the project form (name, description, customer) and a Cancel link back to All projects.
- Creating a project opens the new project's page.
- All projects has a "New project" button instead of the inline form; the empty state points at it.
- Scenarios that created a project from `/projects` now start at `/projects/new` (feature-file change in its own commit).

## Out of scope
- New customer: already on its own page (`/customers/new`).
- Preselecting the customer when starting from a customer's page (Parking lot).

## Acceptance criteria
- [ ] "New project" on All projects opens `/projects/new`; creating "Golf" there opens the Golf project page.
- [ ] A blank name shows the error and keeps the description and chosen customer.
- [ ] Another user's or another workspace's customer is still refused.
- [ ] All projects no longer shows the form.

## Approach (brief)
New route `app/projects/new/page.tsx` like `customers/new`. `createProjectAction` redirects to `/projects/{id}` (like `createCustomerAction`). `ProjectForm` gets a Cancel link for new projects too. E2E helpers that create projects go through the new page and wait for the project page.

## Test plan
- Acceptance: the updated scenarios above, plus "All projects page lists every project and creates new ones" through the "New project" link.
- Unit: none (no new logic; `parseProjectInput` is unchanged).

## Progress log
- 2026-10-31 – Drafted from a direct request ("new customer and new project should get its own pages so it's scalable").

## Parking lot
- "New project" on a customer's page that opens `/projects/new?customer=<id>` with the customer chosen.
