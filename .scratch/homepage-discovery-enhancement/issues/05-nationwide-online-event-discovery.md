# 05: Nationwide online-event discovery

**What to build:** Give visitors a separate collection of upcoming online activities that remains useful regardless of their selected city, with a matching destination for deeper browsing.

**Blocked by:** 02 — City-aware upcoming event discovery.

**Status:** done

**Labels:** done

- [x] Add a separate homepage collection of up to four online events nationwide, using public, non-cancelled, strictly future-start eligibility and soonest-first ordering.
- [x] City selection, remembered city and local/nationwide fallback in other collections never restrict the online collection, including online events with no city or a different city.
- [x] “View all” opens online-only nationwide event discovery with upcoming/non-cancelled filters preserved through URL state, server queries, pagination and navigation history.
- [x] Hide this section only after a successful empty response. While loading show the appropriate loading state; on failure show an independent retryable error rather than hiding the section as empty.
- [x] Use existing shared event cards without duplicating metadata or availability logic; ticket 01's image/count enhancements apply independently.
- [x] Extend existing API/browser tests for online modality, time/cancellation/visibility boundaries, city independence, the four-result cap, matching destinations and loading/error/empty/retry behavior. Regenerate any changed contracts/mocks.
- [x] Translate the section and feedback in Arabic/English and verify RTL/LTR and responsive presentation. Final horizontal-row styling belongs to ticket 07.

## Comments

Implemented on `feat/homepage-05-online`, preserving the interrupted agent's changes. Reuses ticket 02's server eligibility filters and URL-backed discovery state, and ticket 01's shared cards. Distinct section IDs avoid duplicate event heading IDs. Integration branch `feat/homepage-discovery` at `4312e83` was merged/checked: already up to date.

Verification (commands run from this ticket's isolated worktree):

- `corepack pnpm install --frozen-lockfile` — passed; independent local node_modules, unchanged lockfile.
- `corepack pnpm --filter @wasl/web exec vitest run --config vitest.config.ts src/features/home/HomePage.test.tsx` — 8 passed.
- `DISCOVERY_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55405/postgres corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts test/discovery-postgres.integration.spec.ts test/discovery.controller.spec.ts` — 15 passed, 2 failed: the added online fixtures exposed stale combined/historical fixture expectations. Corrected those explicit expected resource lists (not the production filters).
- Same local database, `corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts test/discovery-postgres.integration.spec.ts -t 'includes nationwide|keeps historical'` — both failed checks passed; 7 previously passing cases intentionally not rerun. All 17 discovery checks passed across the focused runs.
- `PLAYWRIGHT_PORT=4195 corepack pnpm --filter @wasl/web exec playwright test e2e/home-location.spec.ts --grep 'online|mobile Arabic' --workers=2` — 9 passed, including online loading/error/empty/retry, four-card cap, city independence, destination flags, pagination and back/forward history.
- After correcting browser fixtures to include ticket 01's accepted registration count, `PLAYWRIGHT_PORT=4195 corepack pnpm --filter @wasl/web exec playwright test e2e/home-location.spec.ts --grep 'readable and keyboard navigable' --workers=2` — 4 passed. Visually inspected all four refreshed screenshots in `client/test-results/home-location-online-colle-*/online-{en,ar}-{375,1440}.png`: readable covers/counts/online metadata, translated headings, RTL/LTR, visible destination focus, no page overflow, reduced-motion mode and keyboard activation. Existing responsive grid retained; ticket 07 owns horizontal scrolling controls.
- `corepack pnpm typecheck` — all three workspace packages passed.
- Focused ESLint on the seven changed TypeScript files with `--max-warnings=0` — passed.
- `corepack pnpm build` — passed, including OpenAPI/client/mock regeneration (no generated content diff). Existing Rollup dependency annotation and messaging chunk-size warnings remain.
- `git diff --check` — passed.

Local database note: PostgreSQL 18 was started solely for these tests at loopback port 55405 using a new disposable cluster. The standard migration command encountered the existing Supabase-specific `storage.buckets` dependency; the current repository schema was materialized locally instead. Drizzle push then reported its existing identity-schema drop issue after creating the tables; the HTTP tests ran successfully against those actual tables. This is discovery behavior verification, not a migration/Supabase deployment claim. No remote database, original dirty repository, dependency source or production data was accessed or copied. No new schema or contract changes were required. Initial red evidence for the inherited UI implementation is unavailable; this continuation does not claim to have recreated that history.
