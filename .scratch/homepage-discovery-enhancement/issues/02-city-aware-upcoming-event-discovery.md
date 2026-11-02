# 02: City-aware upcoming event discovery

**What to build:** Let visitors select and remember a city, discover up to four upcoming in-person events there, and continue the same journey through search or “View all.” Make nationwide discovery useful before selection and when local events are absent.

**Blocked by:** None (can start immediately).

**Status:** done

**Labels:** implemented, verified

- [x] Add an editable city dropdown using existing searchable selection controls. Keep one active city shared by its visible value, homepage queries, search and destinations; leave a usable integration point for explicit geolocation without implementing it here.
- [x] Initialize from a valid remembered city or nationwide discovery. Remember only the city identifier in that browser; clearing to nationwide clears the remembered selection. Invalid identifiers and unavailable storage do not block discovery.
- [x] Show up to four public, non-cancelled, in-person events with start instants strictly later than server time, ordered soonest first. Past, exactly-starting, ongoing, cancelled, online and unlisted events are excluded from this collection.
- [x] When a selected city successfully returns no eligible events, automatically show nationwide in-person events under a clearly nationwide heading. Do not top up nonempty local results with other cities or trigger fallback on a failed request.
- [x] Keep the selected city unchanged during nationwide fallback. Provide section loading skeletons, retryable errors and a concise nationwide empty state without blocking the rest of the homepage.
- [x] Preserve keyword, selected city and explicit upcoming/non-cancelled eligibility when submitting homepage search to combined discovery. In that context, in-person events match the city while online events remain nationwide; community filtering remains city-scoped.
- [x] In-person “View all” preserves eligibility and the collection's effective city/nationwide scope. Update discovery URL parsing, filter forwarding and server contracts end to end, regenerating clients/mocks as required.
- [x] Use explicit filter context rather than silently eliminating historical browsing from unrelated existing routes. Retain existing category/date/pagination behavior and public access.
- [x] API tests with controlled time cover eligibility, modality, city-plus-online search and preservation of existing unfiltered behavior. Browser journeys cover remembered/manual/cleared city, fallback versus error, search, destinations and rapid city changes.
- [x] Provide Arabic/English labels and accessible loading/error/focus states; verify RTL/LTR and mobile/desktop behavior. Accessible horizontal rows and final hero styling are completed in ticket 07, not prerequisites for this working slice.

## Comments

### Final-review Specification P2 correction — 2026-11-02

- Remembered candidate no longer becomes active until city references validate it. Pending/failed reference data uses safe nationwide discovery/search, while the existing picker retains a usable nationwide reset. Clear/manual/location commits consume the candidate; later failed refetches preserve an already validated city.
- Combined invalid remembered city plus cities 503 regression failed before the fix and passes afterward. Delayed valid restore, clear-before-reference-response and valid-city retention on later refetch failure also pass. Full exact evidence is in `.scratch/homepage-discovery-enhancement/review.md`.

### Implementation and verification — ticket 02

- Worktree: `C:/Users/seif/AppData/Local/Temp/opencode/wasl-homepage-02`; branch: `feat/homepage-02-location`. Clean initial HEAD and integration merge-base both `858177be0b44002b079424cbb52d4f295656fe16`. No resets or original-root source copies.
- Read the original TDD skill plus `tests.md`/`mocking.md`, frontend and Nest guidance; queried the existing original-root graph before locating source. Agreed seams: public discovery HTTP with real PostgreSQL, homepage/discovery components, browser journeys.
- Contracts: `modality=online|in-person`, `cityScope=strict|include-online` (default strict), `upcoming=true`, `nonCancelled=true`. Only explicit flags remove historical/cancelled events. Combined homepage search uses `cityScope=include-online`; community city predicates remain strict. The online row can use nationwide `modality=online` with both eligibility flags.
- `useHomeCity(cities)` exposes `cityId`, `selectedCity`, and `setCityId` for subsequent explicit geolocation integration. Browser storage key `wasl-city` contains only the identifier. Nationwide fallback does not mutate this selection.
- TDD evidence: the PostgreSQL HTTP eligibility tracer initially failed by returning past/ongoing/exactly-starting rows, then passed after implementation. The initial browser tracer failed on the missing upcoming section; the clear-city tracer failed on the absent nationwide option, then both passed with implementation.
- Independent dependencies: `corepack pnpm install --frozen-lockfile --offline` failed on missing cached `jest-axe`; `corepack pnpm install --frozen-lockfile` succeeded without lockfile changes.
- `corepack pnpm api:generate` — passed. Generated clients/mocks were regenerated, not hand-edited. Generation also reconciled pre-existing stale generated create-category/validation metadata with the actual committed server contracts.
- With `DISCOVERY_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/wasl_homepage_02`, `corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts test/discovery-postgres.integration.spec.ts` — **8 passed**. Isolated local PostgreSQL 18 cluster; fixture transaction rolled back. Covers strict clock boundary, ongoing exclusion, public/non-cancelled/modality eligibility, full/unlimited/approval events, city-plus-online versus strict community scope, dates, category, pagination, and unfiltered compatibility. No remote database changes.
- `corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts test/discovery.controller.spec.ts src/modules/discovery/discovery.controller.spec.ts` — **10 passed**.
- With `PLAYWRIGHT_PORT=4182`, `corepack pnpm --filter @wasl/web exec playwright test e2e/home-location.spec.ts --reporter=line` — **7 passed**. Covers nationwide entry, remembered/manual/cleared selection, persistence failures/invalid identifiers, local-empty fallback versus retryable errors, effective View-all URL and request, combined search forwarding, rapid delayed selection changes, Arabic mobile keyboard selection and no horizontal overflow. Port override avoids collisions with other worktrees.
- `corepack pnpm --filter @wasl/web exec vitest run --config vitest.config.ts src/features/home/HomePage.test.tsx src/features/discovery/discovery-page.test.tsx` — discovery **12 passed**, homepage **3 passed/1 failed** (incorrect heading assertion against the existing paragraph-based EmptyState). Corrected that assertion to observable copy, then `corepack pnpm --filter @wasl/web exec vitest run --config vitest.config.ts src/features/home/HomePage.test.tsx -t 'distinguishes a successfully empty'` — **1 passed/3 skipped**. Existing mocks needed a URL base to accept relative fetch URLs; no runtime fetch behavior changed.
- `corepack pnpm typecheck` — passed for shared/server/client. Focused ESLint across changed handwritten TypeScript files — passed (zero warnings).
- `corepack pnpm --filter @wasl/web exec vite build` — passed; existing third-party PURE-annotation and large-chunk warnings remain. Desktop LTR and mobile Arabic RTL screenshots captured and visually reviewed. Desktop capture: focused `playwright test e2e/home-location.spec.ts -g 'nationwide entry' --reporter=line` — **1 passed**.
- Deliberate boundaries: community ranking/counts/fallback ticket 04, geolocation ticket 03, nationwide online row ticket 05, categories ticket 06, horizontal rows/final hero polish ticket 07. This slice does not claim those later features or deployed-provider validation.
