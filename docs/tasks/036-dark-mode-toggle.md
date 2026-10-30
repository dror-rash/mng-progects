# Task 036: Dark mode toggle

- **Status:** todo
- **Milestone:** M9
- **Zone / package:** `packages/ui`, `apps/shell`, `apps/dashboard`
- **Feature file:** `docs/features/landing-and-login.feature` (new scenario)

## Why
The theme already has dark tokens (`.dark` in `packages/ui/src/theme.css`), but users can't switch to them.

## Scope
- A `ThemeToggle` in `packages/ui` (light / dark / system) with a Storybook story.
- The choice is stored in a cookie readable by both zones, so it carries across shell and dashboard and is applied server-side without a flash.
- The toggle goes in the shell header and the dashboard header.

## Out of scope
- Any palette change.

## Acceptance criteria
- [ ] Choosing Dark on the landing page keeps the dashboard dark after navigating to it, and after a reload.
- [ ] "System" follows the OS setting.
- [ ] Storybook shows the toggle in each state with no new a11y violations.

## Approach (brief)
**Depends on task 030 for the dashboard header:** start in `packages/ui` and the shell, and add it to `AppHeader` after 030 merges. Each zone's root `layout.tsx` reads the cookie and sets the `dark` class on `<html>`. A tiny inline script handles "system". No `next-themes` unless the inline script proves insufficient; if it does, note it in an ADR.

## Test plan
- Acceptance: the cross-zone scenario above, tagged `@task:036`.
- Unit/component: `ThemeToggle` (selecting sets the cookie and class).
- Storybook: light, dark, system.

## Progress log
- 2026-10-30 – Drafted from the task 002 and 009 parking lots.

## Parking lot
