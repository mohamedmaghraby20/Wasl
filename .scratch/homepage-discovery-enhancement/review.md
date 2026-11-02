# Homepage final review — P2 corrections

Date: 2026-11-02. Scope: the two supplied final-review findings only, not a new full-codebase review.

## Review axes and disposition

### Standards P2 — malformed geometry poisons the boundary cache — resolved

- Before: `loadProvinceBoundaries` accepted `Polygon` with `coordinates: null`, cached that resolved asset, and failed later in `nearBoundary`. The later exception did not reset the loader promise, so another location action reused the malformed asset.
- After: validate the unknown JSON response before resolving the cached promise. Require nonempty province collections, nonempty string IDs, supported geometry types, nonempty polygon/multipolygon parts, closed rings with at least four positions, and finite numeric positions with valid longitude/latitude ranges. Invalid outer rings, holes and multipolygon parts reject through the existing cache-reset handler. No partial geometry is silently dropped or repaired.
- Point containment, holes, multipolygon union, overlap/edge rejection and the browser accuracy plus 100 m conservative margin are unchanged. No nearest-city fallback, external mapping service or asset changes.
- New browser regression returns malformed geometry on the first asset request and corrected geometry on the second. It preserves Istanbul after the first error, then selects Ankara with successful discovery and city-only persistence after another explicit action, without reload. Both location calls and asset requests total two.
- Thirteen focused public-loader cases reject malformed coordinate structures and then successfully load the actual bundled asset. Existing real-coordinate, sea/outside-country, hole, multipolygon, overlap and boundary tests remain passing.

### Specification P2 — unvalidated remembered city and disabled error-state reset — resolved

- Before: storage initialized the active city before reference validation. With `wasl-city=removed-city` and cities HTTP 503, homepage queries and search used the removed ID and the disabled picker prevented clearing it. Violated spec Location state and privacy: “Invalid remembered identifiers must not leave an unusable selection.”
- After: keep the remembered candidate separate from committed `cityId`. Discovery/search remain nationwide until references validate it. The existing shared setter consumes the candidate on restore, manual selection, location success or clear, preserving stale-location generation protection and city-only persistence. An explicit clear while references load cannot be undone by late reference success.
- The existing SearchableSelect remains enabled during pending/error references, with its existing translated nationwide option. Existing QueryError/retry feedback and location-action availability remain unchanged. No new controls, copy or styling. A reference refetch error retains already loaded reference data and the validated active city rather than erasing a usable selection.
- New browser coverage combines invalid storage and reference 503: nationwide collection heading, no city-scoped homepage API requests, nationwide keyword search URL, keyboard-accessible nationwide reset and removed persistence. Additional journeys verify delayed valid remembered restore, clear-before-reference-response protection, and a manually selected valid city surviving a later failed reference refetch with correctly scoped search and usable clear.

## Isolation and preparation

- Work only in `C:/Users/seif/AppData/Local/Temp/opencode/wasl-homepage-review`, branch `fix/homepage-review`, clean starting HEAD `c61ca17230f1460804cb5e37cc56c1b5af8a691b` (also the starting `feat/homepage-discovery`). Original dirty checkout and other worktrees were not edited/copied. No subagents.
- Read AGENTS, feature spec, tickets 03/02/07, issue/domain guidance and installed TDD skill plus tests/mocking references. Existing owner-confirmed seams are browser journeys, public API fixtures and focused mapping tests; no hook-internal tests or new architecture.
- Queried graph first: `graphify query "useHomeCity province-boundaries HomePage remembered city geolocation" --budget 1800`. Existing graph, 139 reachable nodes, 47 shown under the budget; source inspection resolved the scoped paths. Graph query cache remains untracked and unstaged.
- First baseline Vite build could not run because fresh-worktree dependencies were absent (`vite` not found). `corepack pnpm install --frozen-lockfile --offline` then passed, with unchanged lockfile and independent worktree dependencies. pnpm reported ignored dependency build scripts; actual builds below succeeded.
- Impeccable context allowed narrow incumbent-preserving hardening without new design documents. Read hardening/craft guidance; no redesign.

## TDD evidence

All browser commands used `$env:PLAYWRIGHT_PORT='4347'`, Chromium, one worker for tracers/reruns. Production bundles used loopback-only fixture values: `VITE_API_URL=http://127.0.0.1:3000`, `VITE_SUPABASE_URL=http://127.0.0.1:54329`, `VITE_SUPABASE_PUBLISHABLE_KEY=local-browser-fixture`. Public API/geolocation/boundary responses are deterministic interceptions, except the existing actual-bundled-asset/native-browser geolocation smoke journeys. No remote database access.

1. `corepack pnpm --filter @wasl/web exec vite build` passed for baseline browser reproduction after installing dependencies.
2. `corepack pnpm --filter @wasl/web exec playwright test e2e/home-geolocation.spec.ts -g 'malformed geometry can be retried' --reporter=line --workers=1 --output=test-results-review-red-geometry` — **1 failed**, expected Ankara after retry, received Istanbul. Applied loader validation only, rebuilt with the same Vite command, reran only this tracer with `--output=test-results-review-green-geometry` — **1 passed**.
3. `corepack pnpm --filter @wasl/web exec playwright test e2e/home-location.spec.ts -g 'invalid remembered city with failed references' --reporter=line --workers=1 --output=test-results-review-red-city` initially failed on incorrect test-copy wording. Corrected expected copy from “Could not load cities” to the incumbent “Cities could not load”; no product change.
4. Same command with `--output=test-results-review-red-city-confirmed` — **1 failed**, nationwide upcoming heading absent because removed-city was active. Applied candidate/committed separation and enabled the existing picker, rebuilt with the same Vite command, reran only this tracer with `--output=test-results-review-green-city` — **1 passed**.

## Focused verification — actual results

- `corepack pnpm --filter @wasl/web exec vitest run --config vitest.config.ts src/features/home/province-boundaries.test.ts src/features/home/HomePage.test.tsx src/features/home/HomeInterests.test.tsx --reporter=dot` — **35 passed, 3 files**.
- `corepack pnpm typecheck` — **passed shared/server/client**.
- `corepack pnpm exec eslint client/src/features/home/HomePage.tsx client/src/features/home/useHomeCity.ts client/src/features/home/province-boundaries.ts client/src/features/home/province-boundaries.test.ts client/e2e/home-geolocation.spec.ts client/e2e/home-location.spec.ts --max-warnings=0` — **passed**. After the browser fixture corrections below, checked only changed `client/e2e/home-location.spec.ts` with the same ESLint flags — **passed**.
- `corepack pnpm --filter @wasl/web exec playwright test e2e/home-geolocation.spec.ts e2e/home-location.spec.ts e2e/home-interests.spec.ts --reporter=line --workers=4 --output=test-results-review-focused` — **55 passed, 2 failed** (57 distinct journeys, 39.6 s). All geolocation and interests journeys passed, including stale browser/polygon callbacks, newer-location precedence, unmount, city-only persistence, actual map and outside-country checks.
  - Inherited “failed local request” test counted the intentionally nationwide initial request before remembered-city validation as a fallback. Its setup now explicitly selects Ankara after nationwide entry, clears the preselection request history, and retains zero nationwide in-person requests after selection. Added assertions excluding nationwide heading/content on the local error. This tests the same no-error-fallback contract without forbidding safe prevalidation discovery.
  - New transient-reference test initially dispatched a non-bubbling event on `document`, so it did not reach TanStack's `window` visibility listener. Changed only its browser clock/event fixture, not product logic. An intermediate rerun still used `document` and failed that test.
- Failure-only rerun: `corepack pnpm --filter @wasl/web exec playwright test e2e/home-location.spec.ts -g 'failed local request|validated city survives' --reporter=line --workers=1 --output=test-results-review-rerun` — **1 passed, 1 failed** (reference fixture above).
- Final failure-only rerun after dispatching on `window`: `corepack pnpm --filter @wasl/web exec playwright test e2e/home-location.spec.ts -g 'validated city survives' --reporter=line --workers=1 --output=test-results-review-rerun-reference` — **1 passed**. **All 57 distinct journeys have passing evidence across the main run and focused reruns; not a single all-green 57-test run.** Passing checks were not reloaded after fixture-only corrections.
- With explicit local-only `$env:DISCOVERY_TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55432/wasl_homepage_02'`: `corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts test/discovery-availability.spec.ts test/discovery-postgres.integration.spec.ts test/discovery-categories.integration.spec.ts test/discovery.controller.spec.ts src/modules/discovery/discovery.controller.spec.ts --reporter=dot` — **31 passed, 5 files**. Controlled-clock/fixture PostgreSQL HTTP eligibility, scope, counts/ranking/categories and controller checks. No schema changes or remote database; fixture rollback/disposable-schema cleanup is owned by existing suites.
- `corepack pnpm -r build` — **passed shared/server/client**, with the loopback browser configuration above and `SITEMAP_API_URL=http://127.0.0.1:1`. Existing third-party Zod PURE-annotation and >500 kB messaging-chunk warnings remain. Sitemap intentionally used the four-static-URL fallback; no claim of dynamic sitemap/deployment validation. No generated clients or lockfile changed.
- `.opencode/skills/impeccable/scripts/impeccable.cmd detect --json client/src/features/home/HomePage.tsx` — **[]**. `git diff --check` — **passed** (only informational core.autocrlf conversion warnings).

## Visual evidence and limits

- Opened and visually inspected `reference-error-nationwide-reset.png` from the new combined-error journey: enabled original picker, visible nationwide option, internal keyboard focus, unchanged compact hero/search and nationwide discovery. This screenshot captures the open popover; it naturally overlays the reference-error text behind it. Assertions separately check that feedback before opening the picker.
- Also opened all four `home-geolocation-{desktop,mobile}-{ltr,rtl}.png` images from this run. Checked 1280px/375px layout, Arabic/English feedback, manual correction, readable wrapping, icon hit areas, focus and absence of page overflow. No unrelated UX changes.
- Preserved all own red/green/focused/rerun artifacts and the two intermediate build logs under ignored `client/test-results/review/`; original output-directory names are preserved there. Screenshots/logs are local evidence, not committed product assets.
- No remaining unresolved finding within the supplied two-P2 scope. Not claimed: independent fresh full-feature review, unrelated workspace-wide lint, Firefox/Safari, physical GPS/devices, real permission-prompt interaction, assistive-technology announcements, production policies/provider configuration, exhaustive map ground truth or production data parity. API and UI production code outside the two findings is unchanged.

## Commit/integration

- Fix/evidence commit: `47ea3057110c059682028bc00bafd9b167aa7084` (`fix: recover homepage location retries and validate remembered cities`).
- Ran `git merge --no-ff feat/homepage-discovery -m "merge: preserve latest homepage discovery integration in review fixes"` after committing: **Already up to date**. Latest integration was still `c61ca17230f1460804cb5e37cc56c1b5af8a691b`, already an ancestor. No synthetic merge, conflicts, reset or runtime changes; no impacted checks to rerun.
- `git diff --name-only -- server client/src/api shared pnpm-lock.yaml` returned no files before commit. Tracked worktree clean after commit/merge; only preserved untracked `graphify-out/cache/` remained. This final update records integration evidence only.
