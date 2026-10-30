# Task 039: Chart tooltips

- **Status:** done
- **Milestone:** M9
- **Zone / package:** `packages/ui`
- **Feature file:** none (component behavior; covered in component tests and Storybook)

## Why
Chart segments only have a native `title`, which is slow to appear, unstyled, and unavailable to touch and keyboard users.

## Scope
- `StackedBar` and `Meter` show a styled tooltip with the label, count and percentage on hover, keyboard focus and tap.

## Out of scope
- New chart types.

## Acceptance criteria
- [x] Hovering or focusing a segment shows "In progress: 4 (40%)".
- [x] Segments are focusable in order, and the tooltip is announced.
- [x] Storybook a11y shows no new violations in light and dark.

## Approach (brief)
Use the shadcn Tooltip primitive (Radix) in `packages/ui`. The dashboard needs no change because it already passes labels and counts.

## Test plan
- Component: tooltip appears on focus with the right text.
- Storybook: hover and focus states for each chart.

## Progress log
- 2026-10-30 – Drafted from the task 009 parking lot.
- 2026-10-30 – Started. No feature file (component behavior): red/green is component tests in `packages/ui`.
- 2026-10-30 – Red: all 8 new component tests fail (the 3 in `tooltip.test.tsx` because `./tooltip` does not exist; StackedBar has no focusable `img` segments; Meter isn't focusable). Green: `@repo/ui` 30/30 (was 22, +8 new). The tap test was switched from `fireEvent` to `user.pointer` touch during green (jsdom drops `pointerType` from `fireEvent`); checked that it fails without the tap handler.
- 2026-10-30 – Added the shadcn `Tooltip` (Radix `@radix-ui/react-tooltip`, exported as `@repo/ui/tooltip`) and an internal `ChartTooltip` client island. `StackedBar` and `Meter` stay server components; each non-empty segment is a focusable `role="img"` named "In progress: 4 (40%)", the Meter's progress bar is focusable and shows "Website Redesign progress: 40%". Hover and focus come from Radix; tap is added in `ChartTooltip` (Radix ignores touch). The tooltip describes its trigger (`aria-describedby`) while open; the native `title` is gone.
- 2026-10-30 – Stories: Tooltip (closed, open, on focus), StackedBar (segment focused, segment hovered), Meter (focused, hovered), with `play` checks. axe over every story in light and with `.dark`: no violations in Tooltip/StackedBar/Meter stories (only pre-existing: FieldError in dark, see Parking lot).
- 2026-10-30 – `pnpm lint`, `pnpm typecheck` clean; `pnpm test` 167 (dashboard 119, auth 13, db 5, ui 30). e2e `dashboard-home` 7/7. Full e2e 100/102: two `workspace-members` multi-user scenarios hit the 30s test timeout on cold dev servers; the same scenarios also time out with the pre-task `stacked-bar.tsx`/`meter.tsx`, so not caused by this change.
- 2026-10-30 – In review.
- 2026-10-30 – Merged to `main` in PR #12 (M9). Combined branch: 146/146 e2e, 223 unit tests, lint and typecheck clean. The Storybook build on Node 22 (CI) was fixed in PR #13.

## Parking lot
- `FieldError` story fails axe color-contrast in dark (`.dark`): `--destructive` has no dark value. Pre-existing, not from this task; belongs with dark mode.
- The repo has no Storybook test runner (`@storybook/addon-vitest` / test-runner), so story `play` functions and the a11y addon only run in the Storybook UI. Adding one would put the a11y check in CI.
