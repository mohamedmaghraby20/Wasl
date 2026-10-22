# Phase 2: Public discovery

## Implemented

- Added Turkish province reference data with Turkish, Arabic and English display fields. The reference seed has been run against the active Wasl Supabase production project; all 81 provinces and 3 categories are present.
- Added public Community and Event tables, category joins, visibility and lifecycle fields, location/host constraints, indexes and row-level security migrations.
- Added paginated public listing and direct-detail endpoints. Listings omit archived Communities and unlisted Events; direct Event details accept unlisted links. Search, city/category filters, locale selection and Türkiye-local Event date ranges are supported.
- Added generated OpenAPI response/query contracts and Orval Fetch/TanStack Query clients. Fetch response types now match the JSON body returned by the shared mutator.
- Replaced discovery placeholders with home sections, combined `/discover`, route-specific Communities/Events lists, URL-backed filters, pagination controls and public detail pages.
- Added loading/error/empty states, responsive navigation, Arabic copy and RTL layout behavior.
- Added Unhead for titles, descriptions, canonical/social tags, robots directives, JSON-LD and document language/direction. Unlisted Event details remain noindex.
- Added typed API errors, Türkiye-time date formatting, reference-data failure states, accessible filter labels, keyboard search submission and copy-link feedback.
- Added client regression tests for combined discovery results, search submission and back/forward URL history, keyboard-only discovery search/filter access, detail route params, 404 handling, city filter history and Arabic RTL metadata. Added home search/card coverage and a mobile viewport Playwright check.
- Split route views, result sections, pagination, detail pages and home preview rendering into focused client components. Home previews reuse discovery cards. Filter drafts stay synchronized with URL navigation while preserving focus.
- OpenAPI generation compiles the Nest server before generating the contract so Swagger receives DTO decorator metadata.

## Remaining work and inputs

- Migrations `0000` through `0003` were applied to the active Supabase project named `Wasl` (`vuznrkujfmxrggonuvif`) and verified in the Drizzle migration ledger. The project is not labeled as development/test in repository configuration; confirm its intended environment before seeding or applying future changes.
- The client supports same-origin `/api` requests. Vite development/preview proxy `/api` to Nest at `http://localhost:3000`; production hosting must proxy `/api` to the deployed Nest service. Alternatively, set `VITE_API_URL` to the API origin for a cross-origin deployment.
- Sitemap generation and its robots.txt reference still need the actual public site origin. No sitemap was created with a guessed domain.
- Organization and User preview endpoints depend on their owning schemas, which are introduced later in Phase 3 (Tasks 53 and 96).
- The active Wasl production project currently has 81 cities, 3 categories, 0 communities and 0 events. No community/event fixtures were added.
- Server tests inspect generated SQL predicates for visibility, search, city, category and date filters without connecting to a database. The migration schema and reference-data counts were verified on the active Wasl project; endpoint integration tests against populated community/event records remain pending.

## Verification

- `corepack pnpm --store-dir=F:\.pnpm-store\v10 --filter @wasl/web typecheck` — passed.
- `corepack pnpm --store-dir=F:\.pnpm-store\v10 --filter @wasl/web lint` — passed.
- `corepack pnpm test` — passed (18 tests across client and server; shared has no test files).
- `corepack pnpm build` — passed, including OpenAPI generation, Orval generation and workspace builds.
- `corepack pnpm --store-dir=F:\.pnpm-store\v10 --filter @wasl/server typecheck` — passed.
- `corepack pnpm --store-dir=F:\.pnpm-store\v10 --filter @wasl/server lint` — passed.
- `corepack pnpm lint` — passed.
- `corepack pnpm typecheck` — passed.
- Playwright reported both browser checks passing (home smoke and 375px mobile/Arabic RTL). The runner did not exit after reporting results, so it was interrupted during cleanup; treat the browser assertions as passed, but the command exit status as incomplete.
- Reviewed a 375x812 Playwright screenshot of `/discover`; that review found and led to the combined-view date-filter fix, which is now covered by the client test.
- Reviewed the 375x812 home screenshot after component changes; fixed the search field collapsing beside the browse buttons by assigning it a full mobile row.
- `corepack pnpm exec prettier --check ...` on changed source, test and review files — passed.
- Orval regeneration after correcting `includeHttpResponseReturnType` — passed.
- `corepack pnpm --filter @wasl/web exec vitest run --config vitest.config.ts src/api/fetcher.test.ts` — passed (2 tests covering same-origin and explicit API origins).
- `corepack pnpm --filter @wasl/web typecheck` — passed after same-origin API support.
- `corepack pnpm --filter @wasl/web lint` — passed after same-origin API support.
- `corepack pnpm --filter @wasl/web test` — passed (12 tests across 4 files).
- `corepack pnpm --filter @wasl/web build` — passed after same-origin API support.

The generated `server/openapi.json` is ignored by Git; Orval client files are generated from that contract and must not be hand-edited.
