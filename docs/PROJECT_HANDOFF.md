# Wasl project progress and agent handoff

**Snapshot date:** 2026-10-23  
**Purpose:** Give the next coding agent a reliable starting point and a progress ledger to update. This snapshot was checked against the implementation guide, phase records, package scripts, migrations, and current repository layout. Update it as tasks are completed; the implementation guide remains the source of requirements.

## Current status

Wasl is a bilingual (Arabic/English) community and event discovery and participation app for people in Türkiye. The product flow is **discover → evaluate → sign in when acting → join/register → receive an admission outcome → participate → manage and communicate**. The client is a React SPA; the NestJS API owns authorization and business rules; PostgreSQL is managed through Supabase and accessed by the server.

| Phase                                                | Guide task IDs | Status      | Progress record                               |
| ---------------------------------------------------- | -------------: | ----------- | --------------------------------------------- |
| 1. Foundation and local tooling                      |           1–25 | Complete    | [phase-1.md](phase-1.md)                      |
| 2. Public discovery                                  |          26–49 | Complete    | [phase-2.md](phase-2.md)                      |
| 3. Accounts, profiles, first content creation        |          50–72 | Complete    | [phase-3.md](phase-3.md)                      |
| 4. Participation, approvals, capacity                |          73–95 | Complete    | [phase-4.md](phase-4.md)                      |
| 5. Organizations, ownership and staff                |         96–112 | Complete    | [phase-5.md](phase-5.md)                      |
| 6. Discussions and chat                              |        113–131 | Complete    | [phase-6.md](phase-6.md)                      |
| 7. Notifications, moderation, privacy and compliance |        132–149 | In progress | [phase-7.md](phase-7.md); Task 132 complete |
| 8. Hardening and launch                              |        150–164 | Not started | Requirements are in `IMPLEMENTATION_GUIDE.md` |

**Next work:** Continue Phase 7 at Task 133 (in-app notification creation). Task 132's notification and delivery schema is complete; see [phase-7.md](phase-7.md). Execution is sequential by the owner's instruction; do not delegate unless the owner asks to resume multi-agent work.

## Completed work

- **Phase 1:** pnpm workspace, React/Vite client, NestJS/Fastify server, shared package, development tooling, local environment templates and reference-data seed. Phase 1 record documents the setup and intended secret boundaries.
- **Phase 2:** public Community/Event discovery, filters and details, URL-backed search state, localization/RTL, metadata and generated API clients. The record includes the original checks and known limits of discovery verification.
- **Phase 3:** Supabase Auth token verification and stable Wasl identity mapping; private account/public profile separation; profile editing and owner-scoped photo upload; Community/Event create, edit, archive/cancel and organizer controls. A live integration script exercised Auth, API, Storage and cleanup against the configured Supabase project.
- **Phase 4:** membership and registration state transitions/history; join/leave/register/cancel and My Activity; organizer decisions and attendance; capacity checks, waitlisting and FIFO promotion under concurrent requests. PostgreSQL concurrency verification used a temporary schema and cleaned it up.
- **Phase 5, Task 96:** added the Organization table with exactly one required owner and the scoped Organization Admin association. The generated `0008_outstanding_joystick.sql` migration enables RLS and revokes direct `PUBLIC`/`anon`/`authenticated` table privileges. It was applied to the configured development database. Focused schema tests, server typecheck and server lint passed.
- **Phase 5, Task 97:** added the public `GET /organizations/:slug` endpoint and Organization public projection. It returns approved identity, location, social, verification, Community, and public Event data while excluding owner, staff, invitations, and non-public resources. Migration `0009_flimsy_the_call.sql` was applied to the configured development database. OpenAPI/Orval output was regenerated; focused schema/service tests, server typecheck, lint, and formatting passed.
- **Phase 5, Task 98:** added the public `/organizations/:slug` client route with public identity, verification, location, safe external links, linked Communities/Events, and loading, retry, not-found, and empty states. English/Arabic strings and focused page tests were added. Client typecheck, lint, and production build passed. Live browser verification awaits a persisted Organization from Task 99.
- **Phase 5, Task 99:** added authenticated `POST /organizations`; its creator is stored as the sole initial Owner, without an Admin association. Profile fields, City, and HTTP(S) links are validated and slugs are generated safely. The Organizations module imports AuthModule so the protected route works in the generated OpenAPI document. Focused API tests, server typecheck, lint, formatting, and OpenAPI/Orval generation passed.
- **Phase 5, Task 100:** added an Organization choice to the Create surface and the guarded `/create/organization` form. It uses the generated creation client, validates Organization details, displays mutation failures, and redirects successful creation to the public Organization profile. English/Arabic strings and focused redirect, validation, success, and failure tests were added. Client typecheck, lint, and production build passed.
- **Phase 5, Task 101:** added protected `PATCH /organizations/:id` with Owner/Admin authorization and a safe profile/logo update projection. Logo paths reuse server validation of the signed-in user's uploaded image in the existing `profile-photos` bucket. Twelve focused tests, server typecheck/lint/formatting, and OpenAPI/Orval generation passed.
- **Phase 5, Task 102:** added the signed-in `/organizations/:slug/edit` route and form, using the generated authorized PATCH contract. The page preloads public values, supports safe URL validation and optional logo upload/removal, updates query data, and shows API 403 errors without guessing the caller's role. Three focused tests, client typecheck/lint, and formatting passed.
- **Phase 5, Task 103:** added optional `organizationId` to Community/Event creation contracts. The server checks Owner/Admin authority, stores the Organization as owner/host, and writes `created_by_user_id` for the acting Wasl user. Public resource responses provide the current Organization name and slug so details link to its profile. Migration `0010_unusual_strong_guy.sql` was applied to the development database; OpenAPI/Orval was regenerated. Nine focused server tests passed; server/client typechecks and linters plus the full workspace build passed. `db:generate` reported no outstanding schema changes.
- **Phase 5, Task 104:** added authenticated `GET /organizations/mine`, returning only organizations where the caller is Owner/Admin. Community/Event creation forms use the generated hook and show only those returned organizations; Event selection clears the competing Community host selection. Two focused client tests and 23 focused server tests passed, along with server/client typecheck, lint, full build, and no-pending-migration check. No additional schema migration was needed.
- **Phase 5, Task 105:** added `organization_admin_invitations` with existing-user target and inviter IDs, unique 64-character SHA-256 token hash, expiry, PENDING/ACCEPTED/REVOKED state, response timestamp, checks, foreign keys, and indexed lookup paths. RLS is enabled and direct `PUBLIC`/`anon`/`authenticated` privileges are revoked. Migration `0011_typical_hellcat.sql` was applied to the active Wasl development project. Three schema tests, server typecheck/lint, and no-pending-migration check passed. A read-only database query confirmed RLS, denied direct client SELECT, and the unique hash index.
- **Phase 5, Task 106:** added Owner-only invitation creation/list/revocation and authenticated target acceptance APIs. Invitations resolve an active Wasl account by normalized email, expire after seven days, return a 256-bit token once, and persist only its SHA-256 hash. Acceptance locks the Organization and invitation, checks target, expiry, unused state and current inviter ownership, then creates the Admin association and consumes the invitation in one transaction. OpenAPI and Orval client/MSW output were regenerated. Workspace tests (94), typecheck, lint and production build passed. Local API smoke returned health `200`, acceptance without authentication `401`, and pending-list without authentication `401`. No schema migration was needed; Task 105's invitation table is used. The production build retains the existing large main-chunk warning (605.31 kB minified).
- **Phase 5, Task 107:** added Owner/Admin manager listing and Owner-only admin removal (`GET /organizations/:id/admins`, `DELETE /organizations/:id/admins/:userId`), with the owner protected from removal and non-managers denied. The invitation acceptance response now includes the organization slug. Added `/organizations/:slug/manage` (role-aware roster, Owner-only invite/pending-invitation/revoke/remove controls, acceptance-link copy, and owner-only messaging for admins) and `/organizations/invitations/accept` (single-use token acceptance through the signed-in personal account). The public profile shows a management link only to that organization's Owner/Admin, and the edit page is reachable from management. English and Arabic strings were added. Focused verification: 28 organization server tests and 18 organization client tests passed; workspace tests passed with 108 tests (67 server, 41 client); workspace typecheck, lint and production build passed; `db:generate` reported no schema changes, so no migration was needed. The production build retains the existing large main-chunk warning (611.89 kB minified).
- **Phase 5, Tasks 108–112:** added transactional ownership transfer (`POST /organizations/:id/ownership-transfer`) with an active-Admin target, owner-only authorization, previous-owner-to-Admin behavior, and a single-owner invariant; verification request APIs (`GET`/`POST /organizations/:id/verification-requests`) and platform-admin queue/decision APIs (`GET /organizations/verification-requests`, `PATCH /organizations/verification-requests/:requestId`) behind the new `PlatformAdminGuard`; the management-page transfer and verification UI with EN/AR strings; and inherited authority for Organization-owned Communities, Organization-hosted Events, and Events hosted by Organization-owned Communities. Added `organization_verification_requests` with RLS, zero direct client grants, a partial unique pending-request index, and migration `0012_known_scarlet_witch.sql`, which was applied to the configured development database. Platform decisions require the server-only `PLATFORM_ADMIN_USER_IDS` allowlist of Wasl user IDs; an empty value grants no platform access. Verification: workspace tests passed with 128 tests (84 server across 14 files, 44 client across 15 files); `test:organizations:postgres` passed concurrent ownership-transfer, pending-request and decision checks in an isolated temporary schema; typecheck, lint and production build passed; `db:generate` reported no schema changes. The production build retains the main-chunk warning (615.83 kB minified). Full details are in [phase-5.md](phase-5.md).

- **Phase 6, Tasks 113-131:** added native PostgreSQL discussions (`discussion_threads`, `discussion_posts`) with one Event thread per Event, Community topics, one-level replies, author edit/removal, manager moderation, explicit close, and server-enforced eligibility. Added Stream-backed Community and Event chat with stable Wasl-to-Stream identity mapping, server-only credentials, channel-scoped moderator roles, fail-closed token issuance behind `STREAM_PERMISSIONS_VERIFIED`, durable desired-versus-provider membership reconciliation with a 30-second retry worker, direct messages, blocking, and reporting. Migrations `0013`-`0016` enable RLS and revoke direct client grants and were applied to the configured development database. Verification: workspace tests passed with 163 tests (109 server across 19 files, 54 client across 19 files); `test:discussions:postgres`, `test:messaging:postgres`, and live `test:messaging:stream` passed; 3 Chromium E2E tests passed; typecheck, lint, build and `db:generate` passed. The entry chunk is 418.38 kB with no circular-chunk warnings; the lazy `MessagesPage` chunk is 1,755.63 kB because it carries the Stream SDK, and its size warning is accepted. Full details are in [phase-6.md](phase-6.md).

- **Phase 7, Task 132:** created notifications and email-delivery persistence with recipient/event-key idempotency, read and retry state, private RLS and revoked direct client grants. Generated migration `0017_spotty_greymalkin.sql` was applied to the configured development database. Focused schema tests, rolled-back PostgreSQL integration check, server typecheck/lint, formatting and no-pending-schema-diff check passed. Full evidence is in [phase-7.md](phase-7.md).

The phase records are the detailed evidence. Their checks are historical results recorded at completion; they were not rerun while preparing this handoff.

## Architecture and user/data flow

- `client/`: React 19 + Vite SPA, React Router, TanStack Query, bilingual UI and generated Orval API clients.
- `server/`: NestJS on Fastify. Feature modules own endpoints, validation, authorization, business logic and persistence. Supabase Auth verifies identity; it does not replace Wasl’s resource-scoped authorization.
- `shared/`: cross-package contracts and types.
- `server/src/db/schema.ts`: Drizzle database schema. `server/drizzle/`: ordered SQL migrations. The current migration chain contains `0000` through `0017`.
- Typical read: browser route → generated API client → same-origin `/api` → Nest controller/service → PostgreSQL → response rendered by the client.
- Typical authenticated action: browser obtains Supabase Auth session → sends access token to Nest → Nest verifies token and resolves/provisions the Wasl user → service checks resource-level permission and applies the action/transaction → database state is returned to the UI.
- Profile photos upload to Supabase Storage from the browser using the public client configuration; the server validates ownership, file type/signature and size before persisting the object path. Privileged keys and database credentials remain server-side.

Never query PostgreSQL from client code or place authoritative authorization/business rules in the client. Generate API clients from Nest OpenAPI; do not edit generated files by hand.

## Supabase and local development

The configured Supabase project is the **development database used by the local app**, per the owner’s clarification. The phase 2 record and some older setup notes incorrectly call it “production”; treat those labels as stale. No production frontend/API deployment or production hosting URL has been provided, and no deployment has been configured. Do not infer that the connected project is a production target.

Migrations through `0017` were applied to the configured development project; `0013`–`0016` cover Phase 6 discussions and messaging, and `0017` covers Task 132 notification/delivery persistence. `0007_revoke_participation_client_access.sql` revokes direct client-role table access to participation data; the server retains access through its configured database role. Phase 3 reports the `profile-photos` bucket and its owner-scoped upload controls.

For later schema work, follow the repository’s Drizzle workflow and verify the target before applying changes:

1. Inspect `server/src/db/schema.ts`, existing migrations, environment selection, callers, and the relevant task acceptance criteria.
2. Change the Drizzle schema; generate the migration with `corepack pnpm db:generate` and review the SQL, RLS/grants, indexes and rollback implications.
3. Apply with `corepack pnpm db:migrate` only to the configured development database. Check the migration result and any data/security invariants affected by the change.
4. Regenerate API artifacts with `corepack pnpm api:generate` if the Nest OpenAPI contract changed. Never hand-edit generated clients.

Local secrets belong in ignored `.env` files (server credentials only on the server). Use `.env.example` as the safe template. Never copy secret values into this handoff, client variables, commits, or agent prompts. The project owner has authorized the next agent to perform required development-database and migration work as part of each task; that does not identify a production target.

## Historical verification recorded for Phases 3–4

The phase records report these checks passed at the time of completion:

- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm test` — 55 tests (34 server, 21 client)
- `corepack pnpm build` — includes OpenAPI and Orval generation
- `corepack pnpm db:generate` — no outstanding schema diff at that checkpoint
- `corepack pnpm db:migrate` — no pending migrations at that checkpoint
- `corepack pnpm test:phase3:integration` — real Auth/API/Storage/profile/resource flow with cleanup
- `corepack pnpm test:participation:postgres` — capacity/concurrency/FIFO checks with temporary schema cleanup
- `corepack pnpm --filter @wasl/web test:e2e` — two Chromium navigation/mobile Arabic RTL checks

See [phase-3.md](phase-3.md) and [phase-4.md](phase-4.md) for exact scope and caveats. The E2E checks are not an authenticated end-to-end participation journey; Phase 4 reports unavailable `/api` proxy requests during that browser run because Nest was not started. The client build previously reported a main-bundle size warning (599.33 kB minified); the current Vite configuration splits vendor, router, query, i18n, icon and Supabase chunks, and the latest build is warning-free. These were reported as follow-ups, not blockers to the completed phase criteria.

## Open follow-ups and constraints

- **Phase 5 is complete.** Tasks 96–112 are recorded in [phase-5.md](phase-5.md).
- **Phase 6 is complete.** Tasks 113–131 are recorded in [phase-6.md](phase-6.md). Phase 7 Task 132 is complete; Task 133 is next.
- **Stream is configured and verified.** `STREAM_API_KEY`, `STREAM_API_SECRET`, and `STREAM_PERMISSIONS_VERIFIED=true` are set in the ignored server `.env`. Live verification on 2026-10-23 confirmed the `messaging` channel type denies non-members reads, joins, and channel creation, that members can read and send, that `channel_moderator` is channel-scoped, and that expired tokens are rejected. The `create-channel` grant was removed from the `user` role because only the server provisions channels. Re-run with `corepack pnpm test:messaging:stream`; it skips without credentials and deletes its temporary users and channel. The signed-in chat surface still has no visual review because it needs a real signed-in Supabase session.
- **Platform verification access is environment-configured.** `PLATFORM_ADMIN_USER_IDS` is a server-only, comma-separated allowlist of Wasl user IDs. An empty value means no platform administrators, so verification decisions return `403`. This allowlist is the Phase 5 implementation; the Phase 7 admin console and stronger platform-admin security (for example MFA) remain Task 144 work.
- **Supabase Auth hardening:** Phase 3 reports leaked-password protection is disabled. Enable it in the Supabase project’s Auth password-security settings before production. It is a dashboard/Auth configuration item, not a SQL migration; do not claim it was fixed.
- **Production remains future work:** no production deployment URLs, hosting configuration, or release validation are present. The implementation guide reserves CI/CD, staging and go-live for Phase 8.
- **Phase 2 stale environment wording:** update that record when convenient so it no longer calls the owner-confirmed development project “production.”
- `docs/MULTI_AGENT_WORKFLOW.md` retains coordination guidance for possible future delegation, but its active mode and task ledger are reconciled to the owner's current single-agent, sequential instruction.
- **Git history exists for Phases 1-6.** The repository has sequential commits for Phase 1 through Phase 6, and `git status --short` reflects only later uncommitted work. Because the worktree was entirely untracked before those commits, the phase boundaries are retrospective file groupings rather than replayed snapshots; shared files carry their final content in the phase where they were introduced. Do not rewrite this history to "correct" it without owner approval.

## Guidance for the next agent and parallel work

Read `AGENTS.md`, `docs/IMPLEMENTATION_GUIDE.md`, relevant `docs/context/` materials, and the complete Phase 7 task descriptions before editing. Follow global task order and dependencies. Preserve current work; keep changes focused and include focused tests and exact verification evidence as required by the repository instructions.

Parallel agents can help only after the lead confirms dependencies, stable API/schema contracts and separate file ownership. Assign one owner for each shared contract, migration batch, generated API output and root configuration change. Do not let multiple agents concurrently edit migrations or generated files. Client work may proceed against an agreed API contract, but integration must verify the real API/database flow. The lead agent integrates results, checks migrations and generated output, runs verification, updates this handoff and the phase/workflow records, and does not mark a task complete merely because code exists.

Useful root commands (`package.json`):

```powershell
corepack pnpm install
corepack pnpm dev
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm api:generate
corepack pnpm test:e2e
corepack pnpm test:organizations:postgres
corepack pnpm test:discussions:postgres
corepack pnpm test:messaging:postgres
```

Run the checks relevant to each task and report actual results. Do not describe the historical checks above as newly run.
