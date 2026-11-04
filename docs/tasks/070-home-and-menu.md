# Task 070: The dashboard is home; a short menu for the POC

- **Status:** ready (approved 2026-11-04)
- **Milestone:** POC (2026-11-13)
- **Zone / package:** `apps/shell`, `apps/dashboard` (header), `e2e`
- **Feature file:** `docs/features/home-and-menu.feature`; one `@task:070` scenario in `docs/features/partner-access.feature`; existing scenarios changed or retired (list below)
- **Depends on:** nothing open (task 059 is merged into `main`). Runs in parallel with task 071. Part of the owner's 2026-11-04 request, split into tasks 070 (home and menu), 071 (the hierarchy in the database) and 072 (the hierarchy pages).

## Why
The POC shows one simple, clean flow. Visitors land on the login page and signed-in users land on the dashboard, not on a marketing page. The menu shows only the dashboard, the projects and the customers.

## Rules (owner, 2026-11-04)
- `/`: signed in → the dashboard overview; signed out → the login page. The shell's marketing landing page and its "Example zone" link go away.
- The dashboard menu keeps **Overview**, **All projects** and **Customers** (Customers for admins and auditors only, as today). **Partners**, **My tasks** and **Deleted** leave the menu.
- Those three pages stay reachable by their address, with today's access rules, so scenarios that open them by URL keep working (owner's preference).

## Scope
- **Shell `/` (`apps/shell/app/page.tsx`):**
  - The landing page is replaced by a server component that calls `getSession()`. It then calls `redirect("/dashboard")` when the visitor is signed in, and `redirect("/login")` when they aren't.
  - **Redirect, not rewrite** (*my call*). A rewrite of `/` to the dashboard zone would serve the overview at two addresses, `/` and `/dashboard`. Every link on that page points into `/dashboard/...` anyway, and the signed-out case needs a session check in the shell either way.
  - With a redirect, each page keeps one address and the dashboard zone doesn't change. The shell still owns `/` (ARCHITECTURE zone map), and nothing is imported across zones. The `Location` is relative, as ARCHITECTURE asks for cross-zone redirects.
- **After login and sign-up:** with no `next`, the login and sign-up forms land on `/dashboard` (`safeNext(next, "/dashboard")`), skipping the extra hop through `/`. A `next` still goes through `safeNext` unchanged.
- **Logging out:** no change. `SignOutButton` goes to `/`, which now sends the visitor to `/login`.
- **Dashboard header (`apps/dashboard/features/layout/app-header.tsx`):**
  - **Nav:** Overview, All projects, Customers (only when `canSeeCustomers(role)`). Partners and workers get Overview and All projects.
  - **Labels:** they stay as they are ("All projects" is not renamed).
  - **The "Home" button goes** (*my call*): it pointed at the landing page, and `/` now leads back to the overview. The "W" logo link stays and goes to the overview.
- **Pages kept, out of the menu:** `/dashboard/partners`, `/dashboard/my-tasks`, `/dashboard/deleted`. No change to their access: partners and workers still get "This page could not be found." on Partners and Deleted.
- **Example zone:** `/example` and `/example/account` stay (the zone is the template for new zones). Only the shell's link to it goes.
- **Screenshots script:** the `/` shot becomes the login page (signed out) and the overview (signed in).

### Existing scenarios changed or retired (one `docs(features):` commit, reasons in its body)
- **`landing-and-login.feature`:**
  - **Retired, replaced by `home-and-menu.feature`** (the landing page is gone):
    - "Visitor visits the landing page"
    - "Visitor navigates from landing page to login"
    - "Logged-in user views landing page"
  - **Changed: "Choosing dark mode carries across zones and reloads".** The landing page had the shell's only theme toggle, and there is no "Dashboard" link to follow any more. New steps:
    ```gherkin
    Given I am signed in with an existing account
    When I open "/dashboard"
    And I choose the "Dark" theme
    Then the page is dark
    When I log out
    Then I am sent to the login page
    And the page is dark
    When I reload the page
    Then the page is dark
    ```
    The theme still crosses zones: it is chosen in the dashboard and shown on the shell's login page.
  - **Changed: "The system theme follows the OS setting" and "Choosing light mode overrides a dark OS setting".** `Given I am on the home page` becomes `Given I am signed in with an existing account` + `When I open "/dashboard"`, because the toggle is only in the dashboard header now.
  - **Feature description:** "a clear, attractive landing page" becomes "a login page, and the dashboard as home".
- **`authentication.feature` "User logs out":** `Then I see the "Log in" link` becomes `Then I am sent to the login page`. After logging out, `/` sends the visitor to the login page, which has a "Log in" button, not a link.
- **`zone-navigation.feature`:**
  - **Retired:** "Visitor opens the example zone from the shell" and "Visitor returns to the shell from the example zone", because the shell no longer links to the example zone.
  - **Retired:** "A phone can go back to Home from the dashboard", because there is no Home link.
  - **No text change:** "The dashboard header fits a <width>px wide screen". The step "every dashboard nav link is on screen" now expects 3 links, not 6.
- **`task-assignees.feature` "A task I just assigned to myself shows in My tasks without a refresh" (`@task:031`): retired.** It guarded against stale client-side navigation through the "My tasks" menu link. That link is gone, and opening the page by address always loads fresh. Parked: bring it back with the link.
- **`soft-delete.feature` "Auditors see the Deleted page without Restore":** `When the auditor opens the Deleted page from the header` becomes `When the auditor opens "/dashboard/deleted"`, using the existing step.
- **Still true, no change:**
  - `partners.feature` "the teammate sees no "Partners" link in the header";
  - `soft-delete.feature` "the header has no "Deleted" link";
  - `partner-access.feature` "the header has no "Customers" link".

## Out of scope
- **The hierarchy:** NOT NULL customer and site (task 071), and the Customers table and site pages (task 072).
- Removing the example zone or its rewrites.
- A theme toggle on the login and sign-up pages.
- Changing what Partners, My tasks or Deleted show.

## Acceptance criteria
- [ ] A signed-out visitor opening `/` gets the login page, and logging in lands on the overview. (`home-and-menu.feature`: "Opening the home address signed out…")
- [ ] A signed-in user opening `/` gets the overview. ("Opening the home address signed in…")
- [ ] Admins and auditors see the menu Overview, All projects, Customers, and no Home link. ("The menu is Overview, All projects and Customers")
- [ ] Partners, My tasks and Deleted still open by their address for admins. ("Pages left out of the menu still open…")
- [ ] Partners see Overview and All projects only. (`partner-access.feature`, `@task:070`)
- [ ] Every changed scenario above passes; the retired ones are deleted.

## Approach (brief)
- **Shell page:** about 10 lines (`getSession`, `redirect`). The landing page's markup and its unused imports go.
- **`navFor(role)`:** a pure function. Export it and unit test it per role (admin, auditor, partner, worker).
- **Login and sign-up forms:** pass the fallback to `safeNext`. `safeNext` itself doesn't change, because the example zone uses it too.
- **No ADR:** routing stays within ADR-0001 (the shell owns `/`).

## Test plan
- **Acceptance:** `home-and-menu.feature` (`@task:070`), the `@task:070` scenario in `partner-access.feature`, and the changed scenarios.
- **New step:** `the dashboard menu links are {string}` (the links in the "Dashboard" navigation, in order).
- **Unit:** `navFor` per role.
- **Storybook:** the `AppHeader` story (if any) loses Home, Partners, My tasks and Deleted. Check for it.

## Progress log
- 2026-11-04 – Drafted from the owner's request and answers (split from the hierarchy work into tasks 071 and 072).
- 2026-11-04 – Approved by the owner.
- 2026-11-04 – Feature changes committed (`docs(features)`); `@wip` removed, step `the dashboard menu links are {string}` added, nav count now 3, the heading step accepts any visible match (My tasks repeats its title). Red: the 5 new scenarios fail on the missing redirect and the 6-link menu, except "Pages left out of the menu…", which already passes.

## Parking lot
- Links to Partners and Deleted from the workspace page, for admins, after the POC.
- My tasks back in the menu, with the `@task:031` scenario restored.
- Removing the example zone (and its shell rewrites) once a real second zone exists.
- A theme toggle on the login page.
