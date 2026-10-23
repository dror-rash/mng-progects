# Task 008: Send expired sessions in the dashboard zone to the shell login

- **Status:** done
- **Milestone:** M4
- **Zone / package:** `apps/dashboard`
- **Feature file:** `docs/features/project-dashboard.feature`

## Why
Found in code review of M4. Dashboard pages call `redirect("/login")` when `getSession()` is null. Under `basePath: "/dashboard"` that becomes `/dashboard/login` (a 404), and the return path is lost. It happens whenever a session cookie exists but the session is expired or revoked — middleware only checks the cookie exists.

## Scope
- One zone helper `requireSession(path)` that redirects to the shell's `/login?next=<path>` on the public origin (same rule as `redirectToLoginIfNoSession`).
- Use it in every dashboard page.

## Out of scope
- Changing `@repo/auth` middleware.

## Acceptance criteria
- [x] A visitor with an expired session opening a project page lands on `/login` with `next` set to that page.
- [x] Same for `/dashboard`.

## Approach (brief)
`features/auth/require-session.ts` using `getSession`, `loginUrl`, `resolvePublicOrigin` from `@repo/auth`, redirecting to an absolute URL so the basePath isn't added.

## Test plan
- Acceptance: 2 scenarios using a bogus session cookie.

## Progress log
- 2026-10-22 – Task created from code review.
- 2026-10-22 – 2 scenarios red (landed on `/dashboard/login`) → green; full suite (29 e2e) green.
- 2026-10-22 – Merged in PR #1.

## Parking lot
