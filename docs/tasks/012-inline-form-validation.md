# Task 012: Inline validation errors on forms

- **Status:** in-review
- **Milestone:** M6
- **Zone / package:** `apps/dashboard`
- **Feature file:** `docs/features/form-validation.feature`

## Why
Parked in tasks 007 and 009 and flagged in review: a name or title of only spaces passes the browser's `required` check, the server action throws, and the user lands on a generic error page with their input lost.

## Scope
- Create/edit project and create/edit task forms show the error under the field ("Project name is required", "Task title is required") and keep what the user typed.
- Server actions return `{ error }` instead of throwing for invalid input; authorization failures still throw.
- Sets the pattern the customer forms (013–015) reuse: `FieldError`, actions returning `{ error }`.
- Small client islands using `useActionState` around the existing forms; pages stay Server Components.
- `app/error.tsx` in the dashboard zone as a friendly fallback for unexpected errors.

## Out of scope
- Client-side validation libraries. Field-level validation beyond required/trimmed.

## Acceptance criteria
- [x] Submitting a project name of only spaces shows "Project name is required" and keeps the description.
- [x] Submitting a task title of only spaces shows "Task title is required".
- [x] No generic error page for invalid input.

## Approach (brief)
Each action gets a `(prevState, formData)` signature returning `{ error?: string }`. `FieldError` in `packages/ui` (`role="alert"`) and `invalid(error, formData)` in `features/forms/form-state.ts`, which returns the error plus the typed values for the form to show again.

## Test plan
- Acceptance: `form-validation.feature` (3 scenarios).
- Unit/component: form island renders the returned error with `role="alert"`.

## Progress log
- 2026-10-23 – Task created.
- 2026-10-23 – 3 scenarios red → green (stable over 3 repeats); `FieldError` component tests + story, `invalid` unit tests. Forms converted: create/edit project, add task, edit task. Full suite (43 e2e) green; lint, typecheck, Storybook and dashboard production build clean.

## Parking lot
