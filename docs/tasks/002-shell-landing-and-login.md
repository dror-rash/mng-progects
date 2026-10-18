# Task 002: Polish Shell Landing and Login Pages

- **Status:** done
- **Milestone:** M1
- **Zone / package:** `apps/shell`, `packages/ui`
- **Feature file:** `docs/features/landing-and-login.feature`

## Why
Provide a modern, cohesive landing page for the Project Management application and a polished card-based login experience, while preserving existing authentication flows and zone boundaries.

## Scope
- Add shadcn `Card` primitive to `packages/ui` with unit tests and Storybook stories.
- Redesign `apps/shell/app/page.tsx` into a modern landing page (Navbar, Hero with CTA, Feature showcases, Footer).
- Upgrade `apps/shell/app/login/page.tsx` with a centered Card layout and clear messaging.
- Maintain existing authentication scenarios and zone links.

## Out of scope
- Dashboard zone (`apps/dashboard`) and project/task persistence (handled in Task 003 / M2).
- Social OAuth authentication.

## Acceptance criteria
- [x] Visitor sees the landing page with hero headline and feature highlights.
- [x] Visitor can navigate from landing page to login and sign up.
- [x] Authenticated user sees personalized greeting and action buttons on the landing page.
- [x] Card component renders correctly across all subcomponents with test coverage.

## Approach (brief)
1. Write acceptance scenarios in `docs/features/landing-and-login.feature`.
2. Add `Card` component to `packages/ui` with unit test (`card.test.tsx`) and Storybook story (`card.stories.tsx`). Follow TDD (failing test first).
3. Update `apps/shell/app/login/page.tsx` and `apps/shell/app/page.tsx` using `Card`, `Button`, and `Input`.
4. Run acceptance and unit test suites to confirm green status.

## Test plan
- Acceptance: `docs/features/landing-and-login.feature`
- Unit/component: `packages/ui/src/components/card.test.tsx`
- Storybook: `packages/ui/src/components/card.stories.tsx`

## Progress log
- 2026-10-18 – Task created and prioritized as Milestone M1.
- 2026-10-18 – Card component implemented with unit tests and Storybook story; landing and login pages updated and 11 acceptance scenarios passed.

## Parking lot
- Dark/light mode switcher toggle in header.
