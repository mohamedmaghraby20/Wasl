# Phase 4: Participation, approvals and capacity correctness

## Implemented

- Added constrained community membership and event registration states, unique resource/user relationships, and append-only transition history.
- Added authenticated join, leave, register, cancel, personal status, and My Activity APIs and UI. Visitors are sent to sign-in with a return path before taking a participation action.
- Added capacity-aware admission with row locks and transactions. Automatic admission waitlists when full and promotes the oldest eligible participant when capacity opens; manual approval keeps organizer control of approval and promotion.
- Added organizer participant lists, status decisions, scoped count/capacity summaries, removal, and event attendance/no-show marking. Authorization remains in NestJS.
- Capacity reductions are rejected when they would fall below current active/accepted attendance. Event attendance counts continue to occupy capacity.
- Added bilingual participation labels/actions and accessible pending, error, and empty states.
- Generated OpenAPI and Orval client code from the server API.

## Database

- Added and applied `server/drizzle/0006_nosy_talkback.sql` for participation statuses, current records, transition history, uniqueness, and indexes.
- Added and applied `server/drizzle/0007_revoke_participation_client_access.sql`. Participation tables have RLS enabled; direct `anon` and `authenticated` table reads are revoked. The Nest server role retains access.
- Both migrations were applied to the configured Wasl Supabase development project. Existing user records were preserved.

## Verification

- `corepack pnpm test:participation:postgres` — passed against the configured Supabase PostgreSQL database. The test creates a uniquely named temporary schema, runs concurrent capacity checks (12 community joins against capacity 3 and 12 event registrations against capacity 2), verifies one relationship after duplicate requests, then concurrently leaves/cancels multiple admitted participants and checks FIFO promotion for both resources without exceeding capacity. It drops the temporary schema and deletes its synthetic identity users in `finally` cleanup. A follow-up query confirmed zero leftover test schemas and users.
- `corepack pnpm test` — passed: 55 tests (34 server, 21 client); shared has no test files. Client participation coverage includes My Activity empty/status/action states and organizer count/approval actions. The discovery test emits the existing jsdom `window.scrollTo` warning.
- `corepack pnpm lint` — passed.
- `corepack pnpm typecheck` — passed.
- `corepack pnpm build` — passed, including OpenAPI and Orval generation. Vite reports the existing main bundle size warning (599.33 kB minified).
- `corepack pnpm db:generate` — passed; no schema changes remain ungenerated.
- `corepack pnpm db:migrate` — passed; no pending migrations.
- `corepack pnpm --filter @wasl/web test:e2e` — passed: 2 Chromium checks for the public starting page and mobile Arabic RTL navigation. These are general navigation checks, not an end-to-end authenticated participation flow; Vite logged unavailable Nest `/api` proxy requests because the API was not started for this browser run.

## Scope note

The local machine has no PostgreSQL/container runtime available, so the concurrency test uses an isolated temporary schema in the configured development Supabase database rather than a separate local PostgreSQL server. It does not touch public Communities or Events. No deployment configuration was added; this phase targets local development.
