# Wasl — Project Handoff

**Snapshot:** 2026-10-28 · `main` at `c2c7bbd`, pushed to `origin` (`mohamedmaghraby20/Wasl`). See “Repository state” at the end.
**What this is:** the build history and current state of the project, written so another agent can continue without reading anything else.

## What Wasl is

A bilingual Arabic/English (RTL-aware) web app for finding, joining and running communities and events in Türkiye. Visitors can browse everything public without an account. Joining, registering, creating, chatting, reporting and managing all require a signed-in user. The flow is: **discover → evaluate → sign in to act → join/register → receive an admission outcome → participate → manage and communicate.**

The project is a learning build that will also run as a first MVP, so it uses one Supabase project for both development and the live app.

## Stack and layout

- `client/` — React 19, Vite, React Router, TanStack Query, Tailwind, i18next (EN/AR), Orval-generated API client, Vitest, Playwright (guest journeys), Storybook.
- `server/` — NestJS 11 on Fastify, Drizzle ORM, PostgreSQL (Supabase), Supabase Auth, Stream for realtime chat, Resend for transactional email.
- `shared/` — cross-package types and contracts.
- pnpm 10 workspaces on Node 24. `server/drizzle/` holds ordered SQL migrations; `server/openapi.json` and the generated client are build artifacts.

## Build history — all planned phases are closed

| Phase                                 | What shipped                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Foundation                         | pnpm workspace, client/server/shared packages, ESLint, Prettier, typecheck, Vitest, Drizzle setup, env templates, reference seed, health endpoint.                                                                                                                                                                            |
| 2. Public discovery                   | Home page, unified discovery with text/city/category filters and pagination, community and event detail pages, URL-backed filter state, EN/AR localization with RTL, SEO metadata, `robots.txt`, and a build-time sitemap.                                                                                                    |
| 3. Accounts and creation              | Supabase Auth with a stable Wasl identity mapping, private account data vs. public profile, profile editing, owner-scoped photo upload to Supabase Storage, community and event create/edit/archive/cancel, password recovery.                                                                                                |
| 4. Participation                      | Join/leave, register/cancel, status transitions with history, My Activity, organizer accept/reject, attendance marking, capacity limits, waitlists and FIFO promotion under concurrent requests.                                                                                                                              |
| 5. Organizations                      | Organizations with exactly one owner plus admins, public organization profile, organization-owned communities and organization-hosted events, single-use hashed admin invitations, ownership transfer, verification requests, platform-admin review.                                                                          |
| 6. Discussions and chat               | PostgreSQL discussions (one thread per event, community topics, one-level replies, author edits, manager moderation, explicit close); Stream-backed community and event chat with server-issued tokens, channel-scoped moderators and a membership reconciliation worker; direct messages, blocking and reporting.            |
| 7. Notifications, moderation, privacy | Notification records and an email queue with idempotency and retry, Resend delivery, user reports with a moderator queue, platform-admin MFA and review console. Privacy: 18+ age eligibility, versioned legal acceptance records, a user `/privacy` page (export, requests, history), in-app requester notices when a request is decided, deletion requests with provider actions and a retry queue, an admin privacy queue, and retention-policy slots. |
| 8. Release checks                     | Security headers and abuse limits, production dependency audit, email-recovery check, draft-restore rehearsal, guest browser journeys, a CI workflow, a Render blueprint and a database-readiness health check.                                                                                                               |

Everything that was planned to be **built** is built. What remains is shipping, plus the small gaps listed below.

## Providers and data

- **Supabase** — one project (`vuznrkujfmxrggonuvif`), used for development and, from now on, for the MVP. 23 migrations applied (`0000`–`0022`). 31 public tables, all with Row Level Security enabled. `pgmq` and the `notification_emails` queue exist. The `profile-photos` bucket is public with a 5 MB limit and JPEG/PNG/WebP only.
- **Sample data** — the database is seeded with labelled sample users, communities, events, memberships and registrations. This data ships with the MVP. The seed refuses to run when `NODE_ENV=production`.
- **Stream** — one app for community chat, event chat and DMs. Permissions are verified (`STREAM_PERMISSIONS_VERIFIED=true`).
- **Resend** — no verified sending domain yet. Development email goes out from `onboarding@resend.dev`.

## How it works

- **Reads:** browser route → generated API client → `/api/v1/...` → Nest controller → service → PostgreSQL → rendered by React.
- **Writes:** the client sends the Supabase access token; Nest verifies it, resolves or provisions the Wasl user, checks resource-scoped permission, then runs the action or transaction.
- **Uploads:** the browser uploads to Supabase Storage with the public client config; the server validates ownership, type, signature and size before storing the object path.
- **Chat:** the browser gets a Stream token from the API; channel membership is granted only to admitted users, and removals are reconciled by a worker.
- **Authorization:** lives only on the server. Roles are resource-scoped (platform admin, organization owner/admin, community manager, event organizer, participant) and never trusted from the client.
- **API contract:** generated from the Nest OpenAPI document, so server DTO changes require `pnpm api:generate`.

## Where the code is

- **Server modules** (`server/src/modules/`): `auth`, `users`, `communities`, `events`, `discovery`, `participation`, `organizations`, `discussions`, `messaging`, `notifications`, `moderation`, `privacy`. Shared HTTP concerns (health, filters, interceptors) live in `server/src/common/`.
- **Client features** (`client/src/features/`): `home`, `discovery`, `resources`, `auth`, `profile`, `creation`, `participation`, `organizations`, `discussions`, `messaging`, `notifications`, `moderation`, `privacy`, `not-found`. Routing is in `client/src/app/router.tsx`.
- **Public routes:** `/`, `/discover`, `/communities`, `/events`, `/communities/:slug`, `/events/:slug`, `/organizations/:slug`, `/users/:id`, `/communities/:id/topics/:topicId`.
- **Signed-in routes:** `/profile`, `/profile/edit`, `/activity`, `/messages`, `/notifications`, `/privacy`, `/create/*`, `/*/edit`, `/*/manage`, `/organizations/invitations/accept`, `/admin`.
- **Database:** `server/src/db/schema.ts` and `server/drizzle/*.sql`; applied migrations are immutable history.

## Verified state (2026-10-28, `main`)

- `pnpm typecheck` — passes.
- `pnpm lint` — passes with `--max-warnings=0`.
- `pnpm test` — **126 server tests / 21 files** and **87 client tests / 26 files** pass.
- `pnpm test:privacy:postgres` — passes against the project database: age/acceptance gate, under-18 refusal, organization-ownership block on deletion, cancellation, anonymization, provider failure and retry, export, retention blocker, admin age review, and the in-app notice created on a decision (with no email queued).
- `pnpm build` — passes: OpenAPI and Orval clients regenerate, server and client build, and the client build writes `sitemap.xml` (27 URLs on the seeded data) and a `robots.txt` with a `Sitemap:` line.
- `GET /api/v1/health/ready` — returns `200` with `database: "up"` against the project, and `503` when the database is unreachable.
- CI and the Render blueprint are committed but have not run yet: the repository is now on GitHub at `mohamedmaghraby20/Wasl` (`main`), so CI starts on the next push or pull request.

## Known gaps

- Legal and policy inputs for the privacy work are still owner/counsel decisions (`docs/launch-decisions.md`): no approved or published notice, terms or age policy, no chosen age-verification method, no approved retention periods, no named data controller, and no verified sending domain or sender identity for legal notices. Because the UI only lists `PUBLISHED` documents, `/privacy` shows no document to accept yet; the 18+ self-declaration gate is still enforced.
- Retention erasure is hard-disabled (`erasureEnabled: false`, `TBD_LEGAL` rows with no duration), so no irreversible deletion job can run until periods are approved.
- End-to-end tests cover guest journeys only; there are no automated signed-in journeys through the real API.
- `pnpm format:check` fails on 74 files (39 under `.opencode/`/`.agents/`, 35 in project source), so CI does not run it.
- Legal texts (privacy notice, terms, age policy) are drafts with placeholders; no published version exists.
- Public organization and user profiles are not in the sitemap because there is no public listing endpoint for them.
- One branch per phase, no staging environment; release checks ran locally.

## Repository state

Everything is merged into `main` and pushed to `origin` (`mohamedmaghraby20/Wasl`); `git status` is clean. The phase branches (`feature/phase7-notification-schema`, `feature/phase8-local-hardening`) and `master` are already contained in `main`. CI and the Render blueprint are committed but have never executed, so the first pipeline run and the first deploy are still ahead.

## Local commands

```sh
corepack pnpm install
corepack pnpm dev
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build          # api:generate + all builds + sitemap
corepack pnpm api:generate
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm test:e2e
corepack pnpm test:privacy:postgres
corepack pnpm test:participation:postgres
corepack pnpm test:organizations:postgres
corepack pnpm test:discussions:postgres
corepack pnpm test:messaging:postgres
corepack pnpm test:messaging:stream
```

Schema changes follow: edit `schema.ts` → `db:generate` → review the SQL (including RLS and grants) → `db:migrate` → `api:generate` if the API changed.
