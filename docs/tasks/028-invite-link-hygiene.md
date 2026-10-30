# Task 028: Invite link hygiene

- **Status:** in-progress
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
- [ ] Revoking a link while someone has its page open, then clicking "Join workspace", shows the invalid-link message and doesn't add them.
- [ ] A signed-out visitor who opens an invite link, then logs in, lands back on the invite and can join. The login URL doesn't contain the token.
- [ ] The invite page response carries `Referrer-Policy: no-referrer`.

## Approach (brief)
`joinWorkspaceAction` becomes `(prev, formData) => FormState`. The join button becomes a small client form. Only edit `joinWorkspaceAction` in `actions.ts`, because task 027 edits other functions there. Keep `safeNext` for the redirect (rule 11).

## Test plan
- Acceptance: the scenarios above, tagged `@task:028`. Check the header with `page.request` / the response.
- Unit: the token cookie helper (set, read once, clear).

## Progress log
- 2026-10-30 – Drafted from the task 026 parking lot.

## Parking lot
