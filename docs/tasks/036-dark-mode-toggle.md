# Task 036: Dark mode toggle

- **Status:** in-review (dashboard header toggle waits for task 030; see progress log)
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
- [x] Choosing Dark on the landing page keeps the dashboard dark after navigating to it, and after a reload.
- [x] "System" follows the OS setting.
- [x] Storybook shows the toggle in each state with no new a11y violations.

## Approach (brief)
**Depends on task 030 for the dashboard header:** start in `packages/ui` and the shell, and add it to `AppHeader` after 030 merges. Each zone's root `layout.tsx` reads the cookie and sets the `dark` class on `<html>`. A tiny inline script handles "system". No `next-themes` unless the inline script proves insufficient; if it does, note it in an ADR.

## Test plan
- Acceptance: the cross-zone scenario above, tagged `@task:036`.
- Unit/component: `ThemeToggle` (selecting sets the cookie and class).
- Storybook: light, dark, system.

## Progress log
- 2026-10-30 – Drafted from the task 002 and 009 parking lots.
- 2026-10-30 – Specified three `@task:036` scenarios in `landing-and-login.feature` (Dark carries across zones and reloads; System follows the OS; Light overrides a dark OS).
- 2026-10-30 – Red: the 3 scenarios failed at "I choose the … theme" (no Theme group on the page); the ui unit tests failed to import the missing `theme-toggle` / `lib/theme`.
- 2026-10-30 – Green: `@repo/ui/theme` (const list, `parseTheme`, labels, cookie, `systemThemeScript`) and `@repo/ui/theme-toggle`; both zones' root layouts set the `dark` class from the cookie, rendering the inline script only for "system"; toggle in the shell header. `landing-and-login` 6/6; ui unit 29 (7 new), all unit tests 166; lint and typecheck clean.
- 2026-10-30 – Storybook: ThemeToggle Light / Dark / System / DarkTokens. An axe scan of every story with the page forced dark found one real violation, `text-destructive` at 4.15:1 on the dark surface (`.dark` never overrode `--destructive`). Fixed with shadcn's dark step plus `dark:bg-destructive/60` on the destructive button (white text stays ≥4.5:1). Now 31/31 stories clean in dark and light.
- 2026-10-30 – Full e2e: 104/105. The one failure (`workspace-members` "A members page left open…") was a 30s timeout; reruns failed on other scenarios in that file, again timeouts, with dev requests taking up to 24s at load average 30–45 on 8 cores. The same file passes on the base commit, and 11/11 on this branch with `--workers=1`.
- 2026-10-30 – In review. **Remaining:** add `<ThemeToggle theme={…} />` to `AppHeader` (`apps/dashboard/features/layout/app-header.tsx`) after task 030 merges; read the theme with `parseTheme((await cookies()).get(THEME_COOKIE)?.value)`. Until then, the dashboard follows the theme chosen in the shell.

## Parking lot
- Example zone's root layout doesn't read the theme cookie yet (outside this task's zones).
- Reading the cookie in the root layouts makes every route dynamic (shell's /login and /signup were static).
- The acceptance tests check the `dark` class after load; they don't assert the server HTML, so "no flash" relies on the layouts rendering the class server-side.
