# Client code review: Phase 2 discovery

## Scope and basis

This review covers the React/Vite client paths used by Phase 2: app bootstrapping, routing, home, discovery filters and lists, public detail pages, API access, localization, metadata, styles and tests. It uses the approved architecture in `docs/IMPLEMENTATION_GUIDE.md` and `docs/context/`, plus React's guidance on component boundaries, data flow, Effects and state structure.

## Findings

### High priority

1. **`/discover` did not represent discovery.** `DiscoveryPage` treated every path except `/communities` as Events, so `/discover` silently became the Events listing. This also made the home search form route users to a single resource type.
2. **Submitting discovery search did nothing.** The form prevented submission, while the query was updated on every keystroke. Enter therefore had no submit behavior and each character could trigger another request. Search draft state and committed URL filters need a clear interaction.
3. **Generated API contracts were not usable as generated.** The feature hand-wrote resource, page, city and category types and called `waslFetch` directly, although Orval query clients were present. The generated fetch response types included status/data wrappers, while the mutator returned the raw JSON body; this was a type/runtime contract mismatch.
4. **One component owned too many concerns.** `discovery-page.tsx` combined route interpretation, query construction, filter updates, metadata DOM writes, list state and card presentation in long, compressed JSX. That makes behavior hard to review and regressions hard to isolate.
5. **Detail route IDs were parsed from `location.pathname`.** This duplicates router behavior and is brittle around trailing slashes or nested route changes; detail pages should consume the route parameter.

### Medium priority

6. **Locale-dependent UI mixed reactive and global translation access.** Some components used `useTranslation`, while cards/home sections called `i18n.t` directly and category labels read the global language. The latter hides the component's language dependency and can leave locale-sensitive formatting inconsistent.
7. **Date rendering depended on the visitor's browser locale/time zone.** Event filters are interpreted in Türkiye time by the API, but cards/details formatted dates with `undefined` locale and default browser time zone. This can display a different day/time than the discovery filter means.
8. **Reference-data failures were silent.** If cities or categories failed to load, their controls appeared empty and users could not tell whether no options existed or the API had failed.
9. **Pagination stopped at the first API page.** The list response was paginated, but there was no next/previous control, making later results unreachable.
10. **Copy-link failure was invisible.** Optional Clipboard API access could silently do nothing or reject without feedback.
11. **Document language/direction were updated only from the language button.** The HTML element's `lang` and `dir` were not tied to the current React/i18n state at the app boundary.
12. **Metadata was managed by a hand-written Effect.** It directly queried and mutated the document head, did not get component lifecycle/deduplication behavior, and took a freshly created JSON-LD object dependency on each render. The project explicitly selects Unhead.
13. **The error path was too weakly typed.** It identified 404 by searching an error message string; transport status should be represented as data on a typed API error.

### Test and delivery gaps

14. **Coverage did not exercise the risky interaction paths.** Discovery had one card-link test; home's test covered an unrelated email form. Playwright checked only the home heading. Search submission, filter URL state/history, 404 handling, route IDs, RTL and keyboard interaction lacked regression coverage.
15. **Phase 2 has external/configuration dependencies.** A sitemap cannot be populated without the actual public origin; Organization/User previews depend on profile and organization schemas. These are tracked in `docs/phase-2.md` and cannot be truthfully marked complete from repository-only evidence.
16. **An obsolete discovery placeholder remained unreferenced.** `discovery-placeholder-page.tsx` had no callers after the real discovery route was added and has been removed.

## Work in this review

- Findings 1–13 were addressed: discovery routing and submission, generated contracts/hooks, route params, typed errors, component boundaries, Unhead metadata, locale/RTL state, localized dates, reference-data errors, pagination and copy feedback.
- Split the client UI into focused route, section, pagination, detail and home preview components. Reused discovery cards on the home page and moved component files to PascalCase filenames.
- Added client coverage for home cards/search semantics, back/forward behavior for search and city filters, and keyboard-only discovery search/filter access. Server unit tests check generated visibility, search, city, category and date predicates; database-backed integration coverage remains gated on an isolated database.
- Removed the unused discovery placeholder. Fixed OpenAPI generation to compile DTO decorator metadata before Swagger schema generation.
- The database migration is applied to the active Wasl Supabase project. Phase 2 still needs the public site origin for sitemap generation and the profile/organization schemas for host previews, as tracked in `docs/phase-2.md`.

The project's Vite + React Router SPA foundation is valid for its approved client-only architecture. React's current docs recommend a framework for many new apps, while allowing a from-scratch setup where constraints make a framework unsuitable; the implementation gaps were primarily in component/data/state boundaries, not a need to replace the approved stack.

## React guidance consulted

- [Thinking in React](https://react.dev/learn/thinking-in-react)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [Creating a React App](https://react.dev/learn/creating-a-react-app)
