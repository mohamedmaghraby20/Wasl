# Frontend Development Rules

Scope: `client/`. Follow the repository's `AGENTS.md` and use `docs/DESIGN.md` and `docs/design/` for UI and visual decisions.

## 1. Stack

- Use React 19, TypeScript, and Vite.
- Use React Router (Data Mode), TanStack Query, Zustand, React Hook Form, and Zod for their respective responsibilities.
- Use Tailwind CSS v4, shadcn/ui, Lucide React, and Sonner. Follow the approved design system; do not introduce a competing UI library.
- Use i18next and react-i18next for localization.
- Use Unhead for page metadata and Orval-generated clients from the backend OpenAPI specification.

## 2. Components and Structure

- Organize related code by feature; keep shared components in the common location only when genuinely reused.
- Write small, focused functional components. Extract components or helpers when responsibilities become distinct, not to satisfy arbitrary line counts.
- Separate presentation, data fetching, and business-related UI logic.
- Prefer straightforward composition and existing project patterns over new abstractions.
- Use descriptive names; avoid unclear abbreviations and oversized components.

## 3. State Management

- Use TanStack Query for server data, caching, loading states, mutations, and invalidation.
- Use URL search parameters for shareable search, filter, and navigation state.
- Use React Hook Form for form state and Zod for validation.
- Use Zustand only for client state genuinely shared across unrelated components.
- Keep component-only state local. Do not duplicate server state in Zustand.

## 4. Routing and API Integration

- Define routes using React Router Data Mode and follow established route conventions.
- Lazy-load routes or heavy features when it improves initial loading.
- Use Orval-generated typed API clients and query hooks where available; never edit generated code manually.
- Keep request and response handling outside presentational components.
- Handle loading, empty, error, and success states for data-driven screens.
- Treat backend authorization as authoritative; never rely on hiding a button as an access check.

## 5. Forms and User Feedback

- Use React Hook Form with Zod schemas for nontrivial forms.
- Show accessible field errors and preserve entered values when requests fail.
- Prevent duplicate submissions and show clear pending/success/failure feedback.
- Use Sonner for transient notifications; show important persistent errors inline.

## 6. Internationalization and Accessibility

- Support Arabic and English from the start, including RTL/LTR layouts.
- Translate user-facing text through i18next; do not hardcode English or Arabic in components.
- Use semantic HTML, accessible labels, keyboard navigation, and visible focus indicators.
- Target WCAG 2.2 AA; respect reduced-motion preferences.
- Use logical CSS properties where direction matters.

## 7. Performance and SEO

- Prioritize Core Web Vitals and strong Lighthouse performance on mobile.
- Avoid unnecessary dependencies, rerenders, network requests, and large bundles.
- Use appropriate image sizing, loading strategies, and query caching.
- Set route-specific titles, descriptions, canonical URLs, and relevant social/structured metadata with Unhead.
- Keep private, unlisted, and authenticated pages out of public search indexing as required.
- Do not introduce SSR or Next.js; WASL uses a Vite SPA.

## 8. Testing and Verification

- Use Vitest and React Testing Library for component and behavior tests.
- Use MSW when mocking API interactions; use Playwright for critical end-to-end journeys.
- Test important loading, error, permission, keyboard, and RTL states.
- Run the relevant lint, typecheck, test, and build commands for changed code. Report actual results; never claim tests ran if they did not.
- Use Storybook for reusable components when it provides practical value; do not create stories for every trivial element.
- (Ask for approval first) Run react-doctor after significant React changes and resolve relevant findings before completing the task.

## 9. Code Quality

- Follow the documentation and naming rules in `AGENTS.md`.
- Add clear file-purpose headers and useful JSDoc for functions, including behavior, assumptions, and important edge cases; avoid comments that simply restate the code.
- Keep changes focused. Do not reformat or refactor unrelated files.
- Avoid premature optimization and unnecessary layers, patterns, or global state.

## 10. Agent Skills

| Skill | Use for |
| --- | --- |
| `react-best-practices` | React rendering performance, data-fetching efficiency, and bundle optimization (Vercel). |
| `frontend-design` | Implementing and improving page layouts and visual UI. |
| `ui-ux-pro-max` | Exploring UI/UX patterns and improving usability. |
| `shadcn` | Building and customizing shadcn/ui components. |
| `web-design-guidelines` | Reviewing accessibility, usability, and responsive UI. |
| `react-doctor` | Diagnose React correctness, performance, accessibility, and maintainability issues after frontend changes.. |

## 11. Resources

<!-- Add project-approved frontend references, documentation links, patterns, and examples here. -->
