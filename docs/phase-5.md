# Phase 5: Organizations, ownership and staff

## Implemented

- Added a durable Organization model with exactly one Owner, zero or more scoped Admins, public profiles, profile editing, and Organization-owned Communities/Events. Creators are recorded for resource audit without making the Organization dependent on its creator.
- Added Owner/Admin invitation persistence and APIs: invite an existing active Wasl account by normalized email, revoke a pending invitation, and accept a single-use token through the signed-in personal account. Only a SHA-256 token hash is stored.
- Added the Organization management page with role-aware controls: Owner-only invitation creation, pending-invitation revocation, Admin removal, and ownership transfer; Admin profile editing and inherited resource management. Admins never receive Owner-only destructive controls.
- Added transactional ownership transfer. Only the current Owner may transfer; the target must be an active Wasl user who is already an Admin of that Organization. In one transaction the Organization owner changes, the target Admin row is removed, and the previous Owner becomes an Admin. Exactly one owner remains after concurrent or failed transfers.
- Added Organization verification requests reviewed by platform administrators. Organizations request verification with an optional note; at most one request may be `PENDING` per Organization. A decision records the reviewer, note, timestamp, request state, and updates the public `verificationStatus` in the same transaction. Requesting verification for a `REJECTED` Organization reopens it as `PENDING`.
- Verification labels on the public Organization profile remain driven by the Organization's public status. Request notes, reviewer notes, reviewer identity, and staff data are not exposed publicly.
- Added inherited authority for Organization-owned resources. An Organization Owner/Admin can manage Organization-owned Communities and Organization-hosted Events, and Events hosted by an Organization-owned Community inherit the Organization's management authority. Client management controls resolve the same authority.
- Unverified Organizations may continue operating normally; verification is an independent trust label, not a payment/premium gate.
- Added English and Arabic strings for verification and ownership transfer, including empty, pending, rejected, loading, and error states.
- Regenerated OpenAPI and Orval client output from the Nest server contract.

## Database

- Added `organization_verification_requests` with request/decision state, optional notes, requester and decider IDs, timestamps, checks, indexes, RLS, and a partial unique index enforcing one `PENDING` request per Organization.
- Added `server/drizzle/0012_known_scarlet_witch.sql` and applied it to the configured Wasl Supabase development database. The migration enables RLS and revokes direct `PUBLIC`, `anon`, and `authenticated` table privileges; the Nest server role retains access.
- Verified in the development database that RLS is enabled, client-role grants are zero, and `organization_verification_requests_pending_unique` exists with a `WHERE status = 'PENDING'` predicate.
- Organization transfer and decision operations use row locks and transactions. The Organization owner column remains the single-owner invariant; Admin rows remain scoped by the unique `(organization_id, user_id)` constraint.

## Verification

- `corepack pnpm test` — passed: 128 tests total. Server: 84 tests in 14 files. Client: 44 tests in 15 files. Shared has no test files. The discovery suite still emits the existing jsdom `window.scrollTo` warning.
- `corepack pnpm test:organizations:postgres` — passed against the configured Supabase PostgreSQL database in a uniquely named temporary schema. It verifies that a non-Owner transfer is rejected, exactly one of two concurrent transfers succeeds, the previous Owner remains an Admin, the current Owner has no Admin row, only one of two concurrent verification requests is stored as `PENDING`, and only one of two concurrent platform decisions is applied with a matching public verification status. The test drops its temporary schema and synthetic `identity.users` records in `finally` cleanup.
- `corepack pnpm typecheck` — passed for shared, server, and client.
- `corepack pnpm lint` — passed with `--max-warnings=0`.
- `corepack pnpm build` — passed, including OpenAPI and Orval generation. Vite reports the existing main bundle size warning (615.83 kB minified).
- `corepack pnpm db:generate` — passed with “No schema changes, nothing to migrate”.
- Database check — confirmed the Task 108/110 migration is applied, RLS is enabled, client grants are empty, and the partial pending-request unique index is present.

## Platform administration

- Platform verification decisions are API-only in Phase 5, behind `SupabaseAuthGuard` plus the new `PlatformAdminGuard`.
- `PLATFORM_ADMIN_USER_IDS` is a server-only, comma-separated allowlist of Wasl `identity.users` IDs. An empty value means no platform administrators. The value belongs in the ignored server `.env`; `server/.env.example` documents it without a real ID.
- The Phase 7 admin console and stronger platform-admin security (for example MFA) remain Task 144 work. Do not treat the environment allowlist as the final platform-admin authorization design.

## Scope note

No live browser or authenticated API smoke journey was run for this phase. Verification is automated tests, the isolated PostgreSQL concurrency script, the database checks above, typecheck, lint, and the production build. No deployment configuration was added; this phase targets local development against the configured development database.
