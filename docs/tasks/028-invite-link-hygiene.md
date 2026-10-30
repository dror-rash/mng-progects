# Task 028: Invite link hygiene

- **Status:** in-review
- **Milestone:** M9
- **Zone / package:** `apps/dashboard`, `apps/shell`, `e2e`
- **Feature file:** `docs/features/workspace-members.feature` (invite scenarios only)
- **ADR:** `docs/adr/0005-workspaces-and-authorization.md`

## Why
Invite tokens are secrets, but today they show up in `next=` URLs, logs and `Referer` headers. Joining with a link that was revoked while the page was open goes to the error page.

## Scope
- Joining with a link that was revoked or expired after the page loaded shows "This invite link is invalid or has expired" on the page (`FormState`, not a throw).
- A signed-out visitor opening an invite link logs in and comes back without the token appearing in the login URL's `next=` parameter. For example, the invite page stores the token in a short-lived httpOnly cookie and redirects to login with `next=/invite`.
- `Referrer-Policy: no-referrer` on the invite route (`next.config.ts` headers).
- `features/workspaces/invite-token.ts` imports `server-only`.
- No log line includes a token. Check the request logging in middleware and the auth redirect.

## Out of scope
- Members page actions (task 027).

## Acceptance criteria
- [x] Revoking a link while someone has its page open, then clicking "Join workspace", shows the invalid-link message and doesn't add them.
- [x] A signed-out visitor who opens an invite link, then logs in, lands back on the invite and can join. The login URL doesn't contain the token.
- [x] The invite page response carries `Referrer-Policy: no-referrer`.

## Approach (brief)
`joinWorkspaceAction` becomes `(prev, formData) => FormState`. The join button becomes a small client form. Only edit `joinWorkspaceAction` in `actions.ts`, because task 027 edits other functions there. Keep `safeNext` for the redirect (rule 11).

## Test plan
- Acceptance: the scenarios above, tagged `@task:028`. Check the header with `page.request` / the response.
- Unit: the token cookie helper (set, read once, clear).

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.
- 2026-10-30 – Design: `/invite/<token>` is now a route handler that stashes the token in an httpOnly, `sameSite=lax`, 30-minute cookie scoped to `/dashboard/invite` and 303s to `/dashboard/invite` (the join page), so the token leaves the address bar at once. The dashboard middleware lets `/invite/<token>` through; the join page calls `requireSession("/invite")`, so the login URL is `next=/dashboard/invite` (still consumed by `safeNext`). `joinWorkspaceAction(prev, formData) => FormState` reads the token from the cookie (no hidden field), returns the invalid-link message, and clears the cookie on success. On failure the cookie is left to expire: changing a cookie in an action re-renders the page and would drop the message.
- 2026-10-30 – Headers: `Referrer-Policy: no-referrer` on `/invite/:token`; `same-origin` on `/invite`, because with `no-referrer` the browser sends `Origin: null` on the join POST and Next rejects the server action (500, seen in the green run). The step checks the link's own response. `logging.incomingRequests.ignore` keeps `/invite/<token>` out of the dev request log; no app code logs (no `console.*` in apps/packages; the auth middleware and `requireSession` only build URLs).
- 2026-10-30 – Red: unit 4 failed (cookie helpers missing); e2e the 3 new scenarios failed for the right reasons (login URL contained the token; join threw instead of showing the message; no `Referrer-Policy` header). Green: unit 123/123 dashboard (163 across packages); e2e workspace-members 13/13, full suite 104/104. `pnpm lint`, `pnpm typecheck` clean. The old "signed-out visitor is sent to log in" scenario (it asserted `next=/dashboard/invite/<token>`) is replaced by the log-in-and-come-back scenario.

## Parking lot
- Submitting any `useActionState` form before hydration fails on the Turbopack dev server (`TypeError: Cannot read properties of undefined (reading 'bind')`, POST 500). Reproduced with JavaScript disabled on both the join form and the existing `LeaveForm`. Check whether production builds handle it (progressive enhancement) and fix or document.
- In production, Cloud Run / load balancer request logs will still record `/dashboard/invite/<token>` (the first hop). Consider exclusion filters in `infra/`, or putting the token in the URL fragment.
