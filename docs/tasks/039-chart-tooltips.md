# Task 039: Chart tooltips

- **Status:** in-progress
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
- [ ] Hovering or focusing a segment shows "In progress: 4 (40%)".
- [ ] Segments are focusable in order, and the tooltip is announced.
- [ ] Storybook a11y shows no new violations in light and dark.

## Approach (brief)
Use the shadcn Tooltip primitive (Radix) in `packages/ui`. The dashboard needs no change because it already passes labels and counts.

## Test plan
- Component: tooltip appears on focus with the right text.
- Storybook: hover and focus states for each chart.

## Progress log
- 2026-10-30 – Drafted from the task 009 parking lot.
- 2026-10-30 – Started. No feature file (component behavior): red/green is component tests in `packages/ui`.

## Parking lot
