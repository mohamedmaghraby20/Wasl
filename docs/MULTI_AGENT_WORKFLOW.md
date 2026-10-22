# Wasl Multi-Agent Workflow and Progress

**Purpose:** Preserve the requirements and task IDs in [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) while documenting coordination options. This file does not replace product rules or acceptance criteria. The guide remains authoritative when details differ.

**Last progress review:** 2026-10-22. The latest phase evidence is in [`PROJECT_HANDOFF.md`](PROJECT_HANDOFF.md) and [`phase-1.md`](phase-1.md) through [`phase-4.md`](phase-4.md). Phase checks below are historical; they were not rerun when this ledger was reconciled.

**Active execution mode:** Single agent, sequential tasks, per the owner's latest instruction. Do not spawn agents unless the owner explicitly asks to resume delegation.

**Current starting point:** Phase 5, Tasks 96–112 (Organizations, ownership and staff). Phases 1–4, Tasks 1–95 are recorded complete in the handoff and their phase reports. Tasks 96–105 are complete; Task 106 is next.

## The approach

Keep one product and one deployable NestJS modular monolith. Develop the API as its own workstream and make its OpenAPI schema the handshake with the client. Client work can proceed against an agreed schema and generated client/MSW fixtures while backend implementation is underway. For a user-visible slice, merge both sides into the integration checkout and verify them together.

Use four kinds of work:

1. **API** — database migrations, server modules, authorization, business rules, endpoints, OpenAPI and server tests.
2. **Client** — routes, screens, forms and generated-client integration; never authoritative business rules or database access.
3. **Verification** — contract checks, focused tests, integration/browser flows, security and launch checks. This can be a separate assignment, but test ownership stays with the feature agent for focused tests.
4. **Integration/release** — shared contracts, generated artifacts, migration coordination, live integration, staging and deployment. One integrator owns final merges and resolves cross-track conflicts.

Agents are useful when a task can be split by ownership and has a stable interface. They do not make dependent work independent. In particular, agree on schema, API shapes, status names and error behavior before client/server work that shares them. Do not have two agents edit the same migration, generated files, shared contract, or root configuration at once.

## Parallel execution rules

- Follow the dependency IDs from the implementation guide as **minimum prerequisites**, then add the explicit cross-track gates below. A task is ready only when all its listed prerequisites are verified complete.
- The guide's current task dependencies form a mostly sequential chain. Parallel work starts only after a deliberate integrator reviews a task batch and confirms that the relevant contracts and file ownership are stable. Do not infer that adjacent task numbers are parallel-safe.
- API and client can proceed concurrently when the endpoint/schema contract is agreed and checked in. The client may use generated Orval code and MSW mocks; a mock proves UI behavior, not that the real API works.
- Database schema changes and migrations have one owner per feature batch. API agents can build separate modules concurrently only if migration files, shared tables and contracts do not overlap and public module contracts are agreed.
- Generated API files are produced from NestJS OpenAPI/Orval. Never hand-edit them. The integrator regenerates after API schema changes and checks the resulting diff.
- Each task is finished only when its guide acceptance criteria pass and evidence is recorded here. “Code exists” is not completion.
- Use short-lived feature branches. Integrate completed work into the main integration checkout frequently; do not let parallel branches drift for a whole phase.

## Workstreams and task grouping

Task IDs point to the complete descriptions and acceptance criteria in the implementation guide. The same task may touch more than one layer; the named lead owns coordination and should split implementation only after clarifying the contract.

| Workstream                              | Main task IDs                                | Scope                                                                                                                                                                                |
| --------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Foundation and integration contracts    | 1–25                                         | Workspace/tooling, server/client baseline, OpenAPI, shared contracts, generated client, test tools, local services and reference data. Stabilize this before feature agents fan out. |
| API: discovery and public reads         | 26–33, 40–42, 45–46                          | Locations/categories/resources and public listing/detail/search/filter/profile/organization summary APIs.                                                                            |
| Client: public discovery                | 34–39, 43–44, 47–48                          | Navigation, home, resource detail, discovery/search URL state and public metadata/indexing.                                                                                          |
| Verification: public discovery          | 49                                           | Functional and UX verification of discovery; requires the API and client slice integrated.                                                                                           |
| API: identity and resource authoring    | 50, 53–54, 56, 59, 61, 63, 65, 67, 69        | Auth verification, user/profile persistence, storage policy, Community/Event create/edit/cancel and server authorization.                                                            |
| Client: identity and resource authoring | 51–52, 55, 57–58, 60, 62, 64, 66, 68, 70–71  | Auth screens/return flow, profile pages/forms, uploads, resource forms and entry points.                                                                                             |
| Verification: identity and authoring    | 72                                           | Creator permissions, invalid host relationships and privacy checks after integration.                                                                                                |
| API: participation and capacity         | 73–77, 79–80, 82–87, 90–91, 93               | State models/transitions, joins/registrations, activity API, transactional capacity, waitlists, organizer decisions, removals/counts/attendance.                                     |
| Client: participation                   | 78, 81, 88–89, 92, 94                        | Join/register status, activity, organizer lists/counts and attendance management.                                                                                                    |
| Verification: participation             | 95                                           | Concurrency and lifecycle invariants against isolated PostgreSQL, after server/client integration.                                                                                   |
| API: organizations                      | 96–97, 99, 101, 103, 105–106, 108, 110       | Organization schema/public API, creation and management, resource authority, invitations, transactional transfer and verification workflow.                                          |
| Client: organizations                   | 98, 100, 102, 104, 107, 109, 111             | Public organization page and owner/admin management flows.                                                                                                                           |
| Verification: organizations             | 112                                          | Inherited owner/admin authority and host relationship checks.                                                                                                                        |
| API: discussions and messaging          | 113–114, 116, 118, 120–125, 128–130          | Persistent discussions and permissions; Stream mapping, adapter, eligibility, revocation, DMs, block/report and moderation.                                                          |
| Client: discussions and messaging       | 115, 117, 119, 126–127                       | Discussion views/forms, Stream React boundary and Messages screen.                                                                                                                   |
| Verification: messaging                 | 131                                          | Provider outage, retry and access transition checks.                                                                                                                                 |
| API: notifications and moderation       | 132–134, 136–139, 140, 142, 144–145, 147–149 | Delivery schema/APIs, Resend/queue, required notifications, report/moderator/admin APIs, privacy and compliance gates. Legal conclusions require designated qualified review.        |
| Client: notifications and moderation    | 135, 141, 143, 146                           | Notification UI, reports, contextual moderation and admin console.                                                                                                                   |
| Verification: release readiness         | 150–161                                      | Integrated E2E, cross-module permissions, security, accessibility/localization, SEO, load, performance, recovery, provider resilience, staging and launch checklist.                 |
| CI/CD and post-deploy                   | 162–164                                      | Intentionally last: pipelines, deployment wiring and non-destructive production health check.                                                                                        |

### Feature handoff contract

Before assigning an API/client pair, the integrator records in the task/PR description:

- task IDs and exact acceptance criteria being addressed;
- endpoint method/path, request and response schema, status codes, error shape, auth requirement and visibility rules;
- owner module and migration owner, if persistence changes;
- generated artifact command (`corepack pnpm api:generate`) and files that are generated;
- fixtures and the live integration check needed to call the slice done.

API lead implements the contract and server checks. Client lead consumes generated types and uses MSW only for isolated UI development. Integrator regenerates the client, reviews OpenAPI diff, applies migrations to the isolated development database, and runs the real client against the real API. If the contract changes, notify both sides and update the schema before merging dependent work.

## Dependency gates and suggested waves

The implementation guide is deliberately conservative and serial. The following waves permit parallel execution after the stated gate; they do not waive any numbered dependency. The integrator should explicitly record any dependency that is satisfied by an already-verified task.

| Wave                           | Work that can run together                                                                                                      | Gate before starting                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Establish shared foundation | API platform, client shell and test harness may be split only where their files do not overlap.                                 | Tasks 1–25 complete and verified; local services documented; OpenAPI and generated client round-trip works.                                        |
| 1. Public discovery            | API tasks 26–33/40–42/45–46; client tasks 34–39/43–44/47–48; focused tests alongside each.                                      | Data model and endpoint contract agreed; relevant guide prerequisites satisfied. Public listing and details must be testable before UI acceptance. |
| 2. Auth and basic authoring    | Server identity/profile/resource endpoints alongside auth/profile/resource forms.                                               | Wave 1 is integrated; auth/session contract, profile projections, upload policy and create/update request schemas are stable.                      |
| 3. Participation               | Participation API and UI can progress together after status and transition contract is fixed.                                   | Authoring entities and ownership checks complete. Database transition model agreed. Do not parallelize capacity/migration edits.                   |
| 4. Organizations               | Public and management API/client can split by contract.                                                                         | Participation baseline integrated; owner/admin authority model agreed. Ownership transfer transaction stays server-owned.                          |
| 5. Discussions and messaging   | Persistent discussion API/UI may split; Stream server adapter and client feature may split only after identity/access contract. | Resource permissions and participation statuses are stable. Revocation and provider failure policy agreed before chat UI completion.               |
| 6. Notifications and trust     | Notification delivery/API and UI can split; reporting/moderation server and UI can split.                                       | Triggering feature events and recipient rules are stable; durable delivery and error/retry contract agreed.                                        |
| 7. Hardening and release       | Independent audits may run in parallel with separate evidence ownership.                                                        | Feature slices integrated, release E2E passes, staging environment configured. CI/CD remains at the end per guide.                                 |

When earlier tasks are being completed in order, do not start a later wave just because its files look independent; first confirm the corresponding dependency IDs and acceptance criteria have passed.

## Current work: Phase 5 — Organizations (Tasks 96–112)

The task sequence and acceptance criteria in `IMPLEMENTATION_GUIDE.md` remain authoritative. Phase 4 / Task 95 is recorded complete in `PROJECT_HANDOFF.md`; Phase 5 begins with Task 96. Keep this phase sequential unless the lead explicitly verifies a dependency-safe split and stable shared contracts.

| Lane                                   | Task IDs                    | Work                                                                                                                                                                                                      | Coordination gate                                                                                                                                                                                                           |
| -------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API/schema foundation                  | 96–97, 99                   | Model Organization with one current Owner and zero or more Admins; expose the approved public profile; create the Organization with creator as Owner.                                                     | One owner for schema/migration. Agree on stable organization ID, public projection, verification enum and ownership contract before client work. Apply migrations to the configured Supabase **development** database only. |
| Client: public and creation            | 98, 100                     | Public organization profile; creation flow under the signed-in personal User.                                                                                                                             | Build from the reviewed Task 97/99 API contract and generated client. Do not introduce a separate organization login.                                                                                                       |
| API: management and resource authority | 101, 103, 105–106, 108, 110 | Owner/Admin profile permissions and media, organization-owned resources, single-use/expiring admin invitations, invite/accept APIs, transactional ownership transfer, verification request/decision flow. | Server remains authoritative. Invite secrets stay out of logs. Transfer enforces exactly one Owner transactionally. Keep verification decision authorization separate from ordinary organization management.                |
| Client: organization management        | 102, 104, 107, 109, 111     | Management form, host eligibility, admin invites/removal, ownership transfer UX and truthful verification status.                                                                                         | Implement after the corresponding server contract is stable; never infer permissions from UI state.                                                                                                                         |
| Verification/integration               | 112                         | Test inherited Organization Owner/Admin authority over organization resources and Community-hosted Events.                                                                                                | Run after migration and API/client integration; include allowed and denied cases, then update this ledger and `PROJECT_HANDOFF.md`.                                                                                         |

### Phase 5 initial sequence

1. **Task 96:** inspect current schema/migrations and Phase 4 ownership patterns; design the Organization and owner/admin association with exactly one Owner. One agent owns this migration batch.
2. **Tasks 97 and 99:** define the public profile and creation API contract, then implement and verify the endpoints. Regenerate OpenAPI/Orval; do not hand-edit generated files.
3. **Tasks 98 and 100:** build the public profile and creation UI against the approved generated contract. UI may use MSW while API implementation proceeds, then must be checked against the real local API/database.
4. **Tasks 101–107:** implement management, host eligibility and the admin invitation lifecycle in the guide's dependency order; integrate each API/UI handoff before moving on.
5. **Tasks 108–111:** implement and verify transactional ownership transfer and verification workflow/status UI.
6. **Task 112:** run the phase acceptance checks, record exact outcomes, and update both progress ledgers before starting Phase 6.

Do not treat this outline as changing the guide dependencies. Verify exact dependency IDs and acceptance criteria before implementation. The project owner clarified that Supabase is the local development database; older references calling it production are stale. Historical Phase 3/4 database checks do not authorize applying future migrations to a production target.

### Phase 5 contract and ownership readiness

The current schema has polymorphic `ownerType`/`ownerId` and `hostType`/`hostId` values that allow `organization`, but it has no Organization table, role model, module, generated client surface or authorization path. Current Community/Event management recognizes personal ownership and Community hosting only. This is the first integration gap to close.

| Owner              | Initial files/surface                                                                                                        | Exclusive responsibility                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| API/data agent     | `server/src/db/schema.ts`, new Organization module, one generated migration                                                  | Organization, current Owner, Admin association, public/create contracts, RLS/grants and server authorization.               |
| Client agent       | New organization feature/routes/forms after contract generation                                                              | Public profile and creation UI, using generated hooks; no guessed role checks.                                              |
| Integrator         | OpenAPI/Orval output, router/navigation, ResourceDetailsPage host links and management-context integration, shared i18n keys | Generated output, cross-feature edits, real API/browser checks and progress records.                                        |
| Verification agent | Focused server/client/integration tests                                                                                      | Owner/Admin/ordinary-user matrix, public projection, immediate revocation, migration access and transfer concurrency tests. |

Recommended Task 96 model: an `organizations` table owns a single non-null `owner_user_id` reference, while `organization_admins` has a unique `(organization_id, user_id)` association. This gives every Organization exactly one structural Owner and prevents duplicate Admin rows. Keep Organization public fields limited to name, logo, description, type/category, city/location, website/social link and `PENDING`/`VERIFIED`/`REJECTED` status. New public-schema tables need RLS and no direct browser data access because NestJS owns authorization.

The first stable client contract must include a public Organization profile, authenticated create/update responses containing the canonical slug, an authenticated “my manageable organizations” capability projection, and Organization host identity in public Community/Event responses. There is no Organization API tag in the generated client today; the integrator must regenerate it once, rather than an agent hand-editing generated files.

Two product decisions are deferred until Tasks 105–108, so they do not block Task 96: whether an ownership-transfer target must already be an Admin, and whether the previous Owner is atomically retained as an Admin or loses Organization access. The recommended default is an existing active Admin target and automatic demotion of the former Owner to Admin; record the owner's decision before invitation/transfer work starts.

## Remaining-program execution board (Tasks 96–164)

The remaining work uses a **pipeline**, not an API block followed by a client block. For every feature unit, the API/database lane first publishes a reviewed contract; the client lane then builds against generated types and mocks; the verification lane prepares the acceptance checks; the integrator joins the real application. The API lane may begin the next contract while the client lane completes the prior one only where the guide dependency is already met and file ownership does not overlap.

One integration lead owns the shared database migration sequence, OpenAPI document, Orval regeneration, route registration conflicts, and each final real-API/browser check. These are coordination roles, not separate products or network services.

| Phase                                          | API/data lane                                                                                                                           | Client lane                                                                                                              | Verification/integration lane                                                                                             | Hard gate                                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 5: Organizations, 96–112                       | Organization schema, public/create/manage APIs, resource authority, invitations, ownership transfer, verification workflow              | Public profile, create/manage forms, organization host choice, admin management, ownership transfer, verification status | Authority, transfer, invitation expiry and public/private projection checks; generated contract and real API/browser flow | Task 112 must pass before discussions or chat can rely on Organization roles.       |
| 6: Discussions and messaging, 113–131          | Discussion schema/read/write/moderation; Stream ID mapping, adapter, eligibility, revocation, DMs, block/report and provider moderation | Event discussion, comments, Community topics, Stream feature boundary and Messages screen                                | Permission matrix, provider access/revocation, outage/retry checks and real-provider development smoke                    | Task 131 must pass before notification delivery depends on messaging/account state. |
| 7: Notifications, moderation, privacy, 132–149 | Notification/delivery persistence, Resend adapter, pgmq worker/retry, report/moderation/admin APIs, consent/deletion workflows          | Notifications, reporting, contextual controls and platform moderation screens                                            | Delivery idempotency, access denial, queue/provider failure, privacy workflow and designated legal-decision tracking      | Task 149 records unresolved legal gates before release hardening starts.            |
| 8: Hardening and launch, 150–164               | Security, recovery and provider-resilience evidence; staging/deployment configuration at the guide-defined end                          | Accessibility/RTL/SEO/performance remediation and production smoke support                                               | E2E, authorization, abuse, accessibility, SEO, load, recovery, staging, launch checklist, CI, CD and post-deploy health   | CI is Task 162 and CD is Task 163. Do not configure either earlier.                 |

### Contract pipeline for every unit

1. **Contract owner:** records task IDs, Nest route/method, request/response DTOs, status/error behavior, visibility and server authorization rule. If database state changes, records table owner, migration owner, indexes, RLS/grants and test data cleanup.
2. **API/data agent:** implements server behavior and focused tests. One agent at a time changes `server/src/db/schema.ts` or creates a migration. For Supabase development changes, review the generated SQL, enable RLS as defense in depth, and keep direct client grants absent unless a task explicitly requires them.
3. **Client agent:** works in `client/src/features/<feature>/` after the contract is approved. It uses the generated Orval client and MSW only for isolated UI development; it owns loading, empty, error, keyboard, Arabic/English and RTL behavior.
4. **Verification agent:** writes or reviews the task acceptance matrix alongside implementation. It owns no schema migrations, generated clients or feature UI; it supplies reproducible server/client/integration checks.
5. **Integrator:** runs `corepack pnpm api:generate`, reviews generated output, applies the reviewed migration only to the configured development database, connects real client to real local API, and records the results in this ledger and `PROJECT_HANDOFF.md`.

### Phase 6 pipeline: discussions and messaging

| Unit                          | API/data owner                                                                                          | Client owner                                        | Verification before handoff                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 113–117 Event discussion      | Thread/post schema, read API and posting authorization                                                  | Detail-page display and comment/reply form          | Public/unlisted visibility, Accepted/organizer write access, one reply level, closed/cancelled behavior        |
| 118–120 Community discussions | Topic APIs and moderation decisions                                                                     | Topic list/thread/create flow                       | Active-member/organizer write access, public read visibility, author/moderator limits                          |
| 121–125 Stream access         | Stable Wasl-to-Stream mapping, server adapter, Community/Event eligibility, revoke/retry reconciliation | No Stream UI work yet                               | Tokens never expose server secret; role/removal/revocation changes are observed at provider boundary           |
| 126–130 Chat UI and DMs       | DM creation, blocks/reports and provider moderation API                                                 | Stream React boundary, Messages screen and controls | DMs and group access follow current Wasl authorization, not stale client state                                 |
| 131 Phase close               | Provider-failure/retry and access-transition tests                                                      | Any UI remediation found by tests                   | Real development-provider smoke where credentials are available; otherwise record exactly what remains blocked |

### Phase 7 pipeline: notifications, moderation and privacy

| Unit                              | API/data owner                                                                                         | Client owner                                     | Verification before handoff                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 132–135 In-app notifications      | Notification schema, creation/list/read API                                                            | Notification screen                              | Recipient isolation, unread state, relevant safe links and empty/error behavior                                              |
| 136–139 Email delivery            | Resend adapter, pgmq durable queue/retry/idempotency, participation/organization/cancellation triggers | No new screen beyond status links                | Both in-app and email for required events; provider errors cannot lose core state                                            |
| 140–146 Reporting and moderation  | Report persistence/API, scoped moderator roles, platform-admin guard/MFA and decisions                 | Report action, scoped controls and admin console | User cannot forge report target; no UI-only authorization; standard Users, organizers and Admins have distinct denied paths  |
| 147–149 Privacy and launch policy | Consent/age and access/export/deletion workflows                                                       | Required account-facing notices/controls         | Qualified reviewers own legal conclusions; technical work records unresolved KVKK/5651/EU gates rather than inventing policy |

### Phase 8 pipeline: hardening and launch

Phase 8 tasks are sequential in the guide because each check consumes evidence from the prior one. Parallelize the **preparation** only: one agent can draft E2E coverage while another gathers security evidence, and another can prepare accessibility/SEO/performance test plans. The integrator runs and records them in Task order 150 through 164.

| Task group | Parallel preparation allowed                                                                      | Completion evidence                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 150–154    | E2E journeys, authorization matrix, abuse cases, accessibility/RTL review, SEO/indexing checklist | Passing browser/API checks with denied cases and explicit public/private indexing evidence                            |
| 155–158    | Load scenarios, performance audit configuration, recovery runbook, provider outage scenarios      | Measured concurrency, bundle/Lighthouse evidence, restoration/recovery evidence and provider retry/revocation results |
| 159–161    | Staging variable inventory, smoke fixtures and launch checklist draft                             | Confirmed isolated staging services, passed smoke journey and accountable launch decisions                            |
| 162–164    | CI workflow draft and deployment/post-deploy smoke procedure                                      | Only after Task 161: reproducible CI, approved CD integration and non-destructive production health evidence          |

### Agent assignments when a feature unit opens

Use up to four concurrent roles: **API/data**, **client**, **verification**, and **integrator**. The integrator can also handle a small task but must not simultaneously own a migration that another agent depends on. Assign worktrees only after the checkout has usable Git branches; the current handoff reports untracked paths, so first inspect `git status` and preserve the existing state. Do not create overlapping worktrees or point multiple stateful tests at the same mutable development schema.

Current readiness: all Phase 5–8 units are planned. **Tasks 96–105 are complete**; **Task 106** is next. Organization schema, public/creation/management APIs, client surfaces, host authorization, actor audit, and invitation persistence are in place. Phase 6–8 remain gated by Phase 5 acceptance.

## Worktrees: when and how

A **Git worktree** is another working directory attached to the same local Git repository. Each worktree checks out a branch, so agents can make changes without overwriting one another's uncommitted files. The Git objects and branch history are shared; each worktree has its own checkout and working files. A worktree does not isolate external services, database state, credentials, or port usage, and it does not merge changes automatically.

Worktrees fit this workflow when two agents need to edit in parallel and you want clean branch isolation. They are optional for read-only review or tasks with separate files. For Wasl, use one worktree per independent feature branch, e.g. `feature/discovery-api` and `feature/discovery-client`. Give each agent a narrow task and tell it not to edit shared/generated files unless assigned. The integrator reviews the diff, regenerates API artifacts if required, runs checks, merges the branch into the integration branch, then removes the worktree only after it is clean and merged. Preserve dirty/unmerged work.

Typical Git commands (run from the repository; choose branch names to match the task):

```powershell
git worktree add ..\Wasl-discovery-api -b feature/discovery-api
git worktree add ..\Wasl-discovery-client -b feature/discovery-client
git worktree list
# After review and integration, from the main checkout:
git worktree remove ..\Wasl-discovery-api
git worktree remove ..\Wasl-discovery-client
```

The sibling directories must be inside an allowed workspace location. Before removing a worktree, verify it is clean and that its branch is safely integrated. Never use a destructive cleanup command on an unknown or dirty worktree. Each worktree may need its own dependency install/build artifacts and unique ports. Do not point concurrent agents at the same mutable local database; use separate databases/schema instances or serialize migrations and stateful checks.

For a first multi-agent run, a single checkout with one agent implementing the API and another implementing the client is only suitable if they own disjoint files and coordinate through a checked-in contract. Use worktrees when simultaneous edits in the same repository would otherwise collide.

## Live testing and the “ready for next agent” gate

“Live” here means running the Wasl client and API locally against the intended development services, not deploying to production. Every slice moves through this gate:

1. **Feature checks:** API unit/integration tests and client component tests pass for the changed behavior; lint/type checks pass as applicable. Run commands from the implementation guide/actual package scripts and record the exact command/output summary.
2. **Contract check:** regenerate OpenAPI and Orval client; inspect the schema/client diff. Confirm MSW fixtures match the contract. Generated files are not edited by hand.
3. **Local services:** start the API and client with `corepack pnpm dev` after configuring the documented development environment. Apply pending migrations using `corepack pnpm db:migrate`; seed only safe development data if needed. Do not use production credentials or production data for local checks.
4. **API smoke check:** inspect the generated OpenAPI document at the configured local route (see `server/src/openapi.ts` and `server/src/config/api.ts` for the actual route), call the changed endpoint with public and authenticated cases, and confirm status, payload, validation errors and denied access. Use the health endpoint as an initial readiness signal, not proof of feature correctness.
5. **Browser check:** visit the actual route in the running client; exercise loading, success, empty/error, signed-out and authorized/unauthorized states that apply. For Arabic, switch to RTL and check layout and navigation. For stateful actions, verify the persisted result through the UI/API and confirm a refresh still shows it.
6. **Integration handoff:** the integrator records commit/branch, task IDs, changed paths, migration state, exact checks, live URLs/routes, known failures and whether the next task's dependencies are now satisfied. Only then is the task marked complete and handed off.

Use a disposable local/dev database for migrations and concurrency tests. For provider-dependent features, use provider test/development credentials or a documented local adapter/test double; test doubles do not replace at least one real-provider staging smoke check before launch. If required credentials are unavailable, mark that particular live/provider check blocked with the missing dependency; do not claim it passed.

To keep concurrent live runs from colliding, assign distinct client/server ports and isolated DBs per worktree, or have only the integrator run the shared integration app. A shared app is the final authority for cross-layer behavior.

## Progress ledger

Status meanings: **Not assessed** = no acceptance review; **In progress** = active work with owner; **Blocked** = a named external/input dependency prevents progress; **Done** = acceptance criteria passed and evidence is linked or summarized. Do not mark done from file presence alone.

Current snapshot: `PROJECT_HANDOFF.md` and phase reports 1–4 supersede the initial repository-only audit in this document. They record Phase 1–4 tasks as complete and provide implementation and verification notes. Their checks are historical and were not rerun during this reconciliation. The current phase is 5. Project paths were reported untracked in the handoff; preserve existing work and do not assume commits/branches exist.

Update this table after each integrated task batch. Record task IDs individually when they do not share the same status/evidence.

| Task IDs | Status      | Owner/branch       | Evidence / next step                                                                                                                                                                                                                                                                                                                         |
| -------- | ----------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–25     | Done        | Phase 1 record     | [phase-1.md](phase-1.md); setup and tooling complete.                                                                                                                                                                                                                                                                                        |
| 26–49    | Done        | Phase 2 record     | [phase-2.md](phase-2.md); discovery complete. Sitemap awaits actual public site origin; populated-record endpoint integration was noted as pending in the historical report.                                                                                                                                                                 |
| 50–72    | Done        | Phase 3 record     | [phase-3.md](phase-3.md); auth/profile/creation complete. Leaked-password protection was recorded disabled and should be enabled before production.                                                                                                                                                                                          |
| 73–95    | Done        | Phase 4 record     | [phase-4.md](phase-4.md); participation, concurrency and waitlist work complete. Browser run was navigation coverage, not authenticated participation E2E.                                                                                                                                                                                   |
| 96       | Done        | Phase 5 API/data   | Organization and scoped Admin schema/migration applied to the development database. Focused schema tests, server typecheck and server lint pass.                                                                                                                                                                                             |
| 97       | Done        | Phase 5 API/data   | Public Organization profile endpoint and approved projection implemented. Migration `0009_flimsy_the_call.sql` applied to the development database; OpenAPI/Orval artifacts regenerated; focused tests, server typecheck, lint and formatting pass.                                                                                          |
| 98       | Done        | Phase 5 client     | Public Organization profile UI, route, English/Arabic strings, and focused state tests completed. Client typecheck, lint, and production build pass. Live browser verification awaits a persisted Organization from Task 99.                                                                                                                 |
| 99       | Done        | Phase 5 API/data   | Authenticated Organization creation assigns the creator as sole Owner, validates profile fields, and publishes generated API artifacts. Focused API tests, server typecheck, lint, formatting, and OpenAPI/Orval generation pass.                                                                                                            |
| 100      | Done        | Phase 5 client     | Signed-in Organization creation flow, route, bilingual form, and focused state tests completed. Client typecheck, lint, and production build pass.                                                                                                                                                                                           |
| 101      | Done        | Phase 5 API/data   | Owner/Admin Organization profile and media management completed; 12 focused tests, server typecheck/lint/formatting, and generated API artifacts pass.                                                                                                                                                                                       |
| 102      | Done        | Phase 5 client     | Organization edit route/form uses the generated PATCH, validates profile URLs, supports existing safe photo flow, and surfaces server 403. Three focused tests, client typecheck/lint/formatting pass.                                                                                                                                       |
| 103      | Done        | Phase 5 API/data   | Community/Event creation accepts an authorized organization; actor stored as `created_by_user_id`; public resource projection includes current organization name/slug. Migration `0010_unusual_strong_guy.sql` applied; 9 focused server tests, server/client typecheck and lint, full workspace build, and no-pending-migration check pass. |
| 104      | Done        | Phase 5 API/client | Authenticated managed-organization list and Community/Event host selectors completed. Scoped API and controller guard tests, two focused UI tests, typecheck, lint, build, and no-pending-migration check pass.                                                                                                                              |
| 105      | Done        | Phase 5 API/data   | Invitation schema stores only a unique SHA-256 hash, target/inviter IDs, expiry, state, and response time. Migration `0011_typical_hellcat.sql` applied; RLS/direct grants verified with a database query; schema tests, server typecheck/lint, and no-pending-migration check pass.                                                         |
| 106      | In progress | Phase 5 API/data   | Owner invite, target accept, revoke, and pending-invitation APIs.                                                                                                                                                                                                                                                                            |
| 107–112  | Not started | —                  | Continue in implementation-guide dependency order after each task is accepted.                                                                                                                                                                                                                                                               |
| 113–131  | Not started | —                  | Phase 6; follows Phase 5 dependency chain.                                                                                                                                                                                                                                                                                                   |
| 132–149  | Not started | —                  | Phase 7; follows Phase 6 dependency chain.                                                                                                                                                                                                                                                                                                   |
| 150–164  | Not started | —                  | Phase 8; hardening, staging, CI/CD and launch. CI/CD remains last.                                                                                                                                                                                                                                                                           |

Phase checks are recorded in `PROJECT_HANDOFF.md` and the corresponding phase reports. Do not present those historical results as newly run. Rerun the relevant checks when Phase 5 is implemented.

For every update, include at least: task IDs, owner/branch or PR, status, exact checks and outcomes, migration/schema state, generated artifacts if applicable, live integration route/result, unresolved issue, and newly unblocked task IDs. Update `PROJECT_HANDOFF.md` and this ledger together when a phase completes.

## Starting a multi-agent task

Use a request like this, replacing the IDs and files with the task at hand:

> Use two agents for tasks 30–39. Agent A owns server endpoint task 30 and its server tests; Agent B owns the client presentation tasks after reviewing the agreed response schema. Do not overlap migration/shared/generated files. First report the contract and ownership split; then implement. Keep work in separate feature branches/worktrees. The integrator owns OpenAPI/Orval regeneration, real API + browser verification, progress ledger update, and merge. Do not mark a task done until its guide acceptance criteria pass.

If the shared contract or dependency gate is unclear, have agents inspect and report first; the integrator resolves it before parallel implementation.
