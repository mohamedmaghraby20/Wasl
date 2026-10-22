# WASL — Self-Contained Implementation Guide

**Purpose:** This document is the complete implementation handoff for a coding agent unfamiliar with WASL. **No access to Notion, Linear, previous chats, or external specifications is needed to understand the product requirements in this guide.** Consult `AGENTS.md` for coding rules and `docs/design/` for the owner's actual visual assets. Do not invent business rules that conflict with the specification below.

**Starting conditions:** The owner creates the folder and initializes Git. Never run `git init`. All project documentation lives in `docs/`; `AGENTS.md` is the only root agent document. Root package/configuration files are allowed. Use a pnpm monorepo with `client/`, `server/`, and `shared/`.

**Delivery model:** Implement working vertical slices with the easiest public/read-only features first, followed by authenticated creation, participation, capacity/waitlists, organization management, messaging, notifications, administration, and final hardening. Every completed slice has the necessary schema/API/UI and verification. Do not set up CI/CD until the final tasks. Run local tests throughout.

## 1. Product definition and scope

WASL helps Arabs across Türkiye discover, evaluate, join, and organize **Communities** and **Events**, then communicate afterward. The primary early audience is Arab university students, but the system must support other people and locations throughout Türkiye. The core user journey is **Discover → Evaluate → Authenticate when acting → Join/Register → Admission outcome → Participate → Manage/Communicate**. Organizers create/manage resources, process applicants and attendees, and communicate with participants. A person has one personal user account and may hold several resource-scoped roles.

**Included MVP:** public discovery, search/filters, public details, user profiles, community/event creation and management, community memberships, event registrations, approval/capacity/waitlists, personal activity, contextual moderators, organization owner/admin management and verification state, realtime group chats and direct messages, persistent discussions, in-app/email notifications, reporting/platform moderation, basic organizer counts, accessibility, SEO, privacy/security and Türkiye launch gates.

**Not MVP:** payments, ticketing or QR check-in, private Communities, advanced personalization/AI recommendations, newcomer Guides, paid plans, advanced analytics, following/reviews, push notifications, deep forum nesting, custom organization role systems, or replacing Stream with Socket.IO. Keep extensibility pragmatic, not speculative.

## 2. Fixed technology decisions

| Concern | Use | Operational rule |
|---|---|---|
| Package management | pnpm workspaces | One lockfile; workspace packages `client`, `server`, `shared` |
| Client | React 19, TypeScript, Vite, React Router Data Mode | SPA; **no Next.js or SSR architecture** |
| API state | TanStack Query | Owns server data; URL params own filters/navigation |
| Local UI state | React state; Zustand only for cross-screen client state | No redundant copy of server state |
| Forms/contracts | React Hook Form, Zod; NestJS OpenAPI + Orval Fetch/TanStack Query clients | Server revalidates inputs; generated clients follow API schema |
| UI | Tailwind CSS, shadcn/ui, Lucide React, Sonner | Consume `docs/design/` semantic design tokens |
| Language | i18next, react-i18next | Arabic/English from start, RTL/LTR from one layout system |
| SEO | Unhead, semantic HTML, appropriate JSON-LD, canonical/social tags | Public indexable only; no accidental private indexing |
| Client tests | Vitest, React Testing Library, MSW, Playwright, Storybook | Add useful fixtures/tests at feature implementation time |
| Quality | ESLint, Prettier, strict TypeScript | Local checks throughout |
| Server | Node.js, TypeScript, **NestJS on official Fastify adapter** | One modular monolith, not standalone Fastify or microservices |
| Database | PostgreSQL managed by Supabase, Drizzle ORM/Drizzle Kit, `pg` | Business authorization and transactions live on server |
| Identity | Supabase Auth, server-verified tokens | Supabase handles identity; NestJS owns product roles |
| Storage | Supabase Storage with signed/direct upload and CDN | Never expose private assets or service secrets |
| Chat | Stream Chat server SDK and React SDK | Wasl owns eligibility, stable IDs, mapping and revoke/sync |
| Email / background | Resend; Supabase Queues (pgmq) and Cron where necessary | Persist critical delivery/retry state |
| API infrastructure | NestJS Swagger/OpenAPI, `@nestjs/throttler`, `@nestjs/terminus`, global exceptions/security headers | One consistent error shape and scoped authorization |
| Deployment | Render static client, Render NestJS web service; Supabase/PostgreSQL; Stream; Resend | CI/CD and automated deployments in final phase |

**Illustrative directory layout:**

```text
wasl/
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── client/
│   └── src/{app,features,components,lib,assets}/
├── server/
│   └── src/{modules,common,config,db}/
├── shared/
│   └── src/{contracts,types}/
└── docs/
    ├── IMPLEMENTATION_GUIDE.md
    ├── design/             # Owner-provided tokens, CSS, HTML and guidelines
    └── tasks/              # Optional short task-specific prompts
```

Keep code close to its owning feature. Each NestJS module owns business logic and persistence. Route handlers never run raw SQL, client components never query the database, and other server modules must not import another module's repositories directly. Make replaceable provider boundaries only for real external systems. Build one API, not multiple network services.

## 3. Mandatory product and permission rules

### Identity, profiles, and access

- Visitors can view/search public Communities, public Events, public Organization pages, approved public User profiles, and Unlisted Events when given the direct URL. No sign-in wall for browsing or details.
- Sign-in is required to join/register, create/manage, write comments, use chats/DMs, report content, or modify a profile. After authentication, return the user to their original action/context.
- A human uses a personal User identity. Roles are contextual and may coexist: Community/Event organizer, contextual moderator, Organization Owner/Admin, Platform Admin.
- Public profile fields: name, photo, bio, city, interests; never include email or private account metadata. Users can view/edit their own profile, memberships, registrations and statuses.
- Authorization checks belong to NestJS on **every** protected command/read; client UI hiding is not protection. An Organization is a standalone managed entity, never a shared-login User account.

### Communities

- All MVP Communities are **public and discoverable**; no private Community feature. Each Community belongs to exactly one personal User or Organization.
- Public details show name, description, at least one category, city/location, owner/host identity, admission policy and useful participation information; provide a stable shareable URL.
- Community admission modes: instant/open, manual approval, or automatic acceptance until optional capacity. State values: **Pending, Waitlisted, Active, Rejected, Left, Removed**.
- If eligible and capacity exists: instant/automatic joins become Active; manual requests become Pending until a permitted organizer action. When capacity is exhausted, eligible requests use Waitlisted rather than a full-capacity rejection.
- Community organizers manage details, admission/capacity, applicants, members and waitlist; can approve/reject, remove, archive and assign/remove scoped moderators. Community organizers may create/manage Community-hosted Events. Archived Communities stop accepting joins and leave normal discovery; preserve history.

### Events

- An Event can be independently hosted by a User or hosted by a Community/Organization. Public Events appear in discovery; **Unlisted Events appear only through their direct links**. Both can be viewed without authentication when authorized by visibility.
- Event details include title, description, date/time, location or explicit Online, category, host, admission and optional capacity; provide stable share URL. Event visibility is separate from participation privileges.
- Admission: instant, automatic capacity-controlled, or manual approval. Registration statuses: **Pending, Waitlisted, Accepted, Rejected, Cancelled by User, Removed by Organizer, Attended, No-show**.
- Organizers configure admission/capacity, see registrants, approve/reject, remove, mark attendance manually, and cancel Events. Cancelled Events remain viewable and clearly labelled; do not accept new registrations.
- Community organizer inherits management rights over Community-hosted Events; Organization Owner/Admin inherits management over Organization-hosted Events. Moderators are scoped, not general owners.

### Participation invariants and concurrency

- Use explicit state transitions and history; never model joins/registration as one boolean. Reject/handle repeated requests idempotently; enforce uniqueness for one active request per user/resource.
- Define authoritative capacity as count of Active Community members or Accepted Event attendees (with attendance lifecycle handled consistently). Atomic database transactions and locking/conditional updates must prevent overbooking under concurrent requests.
- Automatic-admission waitlists promote eligible users in queue order when capacity opens. Manual-approval waitlists **preserve organizer selection control**, including waitlist approval and promotion. Waitlisted users gain no Active/Accepted privileges.
- Leaving/cancellation/removal can free a slot and trigger relevant promotion. Rejected/Removed/Left/Cancelled users lose resource-only privileges immediately. Preserve historical transitions and avoid impossible combinations.
- No silent failure of joins, approvals, waitlist promotions, owner transfers or permission revocation. Test retries, races, duplicate action submissions and provider failures.

### Organizations and verification

- Organization is independent of its initial creator and has exactly one current Owner plus zero or more Admins. Management occurs only through authenticated personal accounts.
- Organization public profile: name, logo, description, type/category, city/location, website/social link when present, verification state **Pending / Verified / Rejected**.
- Owner can invite/remove Admins and transfer ownership transactionally to an eligible User. Admin manages profile and Organization-owned Communities/Events but **cannot transfer ownership, remove the Owner, or perform Owner-only destructive actions**.
- Permissions must be recalculated after transfer/revocation; no orphan owner or double owner. Verification is independent of payments/premium and platform-admin controlled; future document uploads are not required in this MVP.

### Discovery and UX

- Public navigation: Home, Discover, Communities, Events, Organization and public User profiles. Authenticated views: My Activity, Messages, Notifications, Create, Profile/Settings. Organizer management appears in context for permitted users.
- Home emphasizes search and discovery, then Community/Event sections; list and detail screens use obvious status-aware calls to action. Users see details before authentication. Keep a clear route back after sign-in.
- Keyword search; city/location, category/interests, Event date filters; nationwide Türkiye location model and localized names. Each Community/Event has at least one category; Events have a physical location or Online explicitly.
- Use loading/empty/error states for remote data; display Pending/Waitlisted/Accepted/Active and Cancelled without ambiguity; responsive mobile-first behavior.
- Source of truth for visual design is the owner-provided `docs/design/` bundle (CSS/JSON tokens, previews, specs). Use semantic theme variables with Tailwind/shadcn. Light theme first; prepare for theme/mode variation without building extra themes now. Arabic Tajawal; English Manrope; use CSS logical properties, keyboard support, visible focus, reduced motion and sufficient contrast. Do not invent unapproved colors.

### Communication and discussions

- Realtime Stream Chat: Community channel for Active members/organizers/moderators; Event channel for Accepted attendees/organizers/moderators; authenticated Users can initiate DMs. Recipients can block/report. Revoke provider-side protected-channel membership as soon as authorization changes; retry/reconcile failed sync. Never issue Stream secrets in browser.
- Store stable Wasl conversation/resource IDs and provider mapping in Messaging-owned persistence; Stream owns realtime message bodies/history. Keep Stream SDK imports inside the Messaging backend adapter and frontend feature. Do not duplicate full message history into PostgreSQL.
- Persistent Event discussion has one thread with comments/simple replies. Community discussion supports lightweight topics (title, body), comments and one reply level. Store them in Wasl PostgreSQL, not Stream; reading follows parent visibility, writing/moderation follows resource policy. No separate forum engine.

### Notifications, moderation and counts

- Persist in-app notifications and email delivery status. Important events require **both in-app and email**: membership/registration accept/reject, waitlist promotion, Event cancellation, participant removal, Organization Admin invite and verification-status changes. Lower-priority chat activity may be in-app only.
- Use Resend for transactional email; durable queue/retry/idempotency for critical deliveries. Links lead to the related resource and never reveal private details to recipients without permission.
- Authenticated users can report users/resources/content. Contextual Community/Event moderators can act only within granted resource scope. Platform Admin reviews reports, suspends/restores Users, moderates resources and manages verification. Keep audit references for critical actions; no enterprise analytics dashboard.
- Organizer sees counts for Pending/Waitlisted/Active/Accepted, attendance and capacity usage computed from correct states rather than historical duplicates.

## 4. Cross-cutting quality, privacy and launch constraints

- **Security:** deny-by-default authorization, strict input validation and output projections, safe secrets handling, security headers/CORS, throttling on auth/report/DM/invites/recovery, proper exception mapping, access-revocation tests. Follow OWASP ASVS / OWASP Top 10 principles. Never trust provider membership as product authorization.
- **Privacy:** collect only needed data; separate public/private fields; support deletion and requests, consent/legal acceptance where applicable, retention rules, user blocking, and restrictions on sensitive operational records. Never leak emails, provider credentials or internal moderation records.
- **Türkiye/EU launch gates:** verify KVKK, 5651, copyright/UGC, child-age applicability, messaging and cross-border processing obligations with qualified counsel. Conditional GDPR/EU rules only when applicable. Technical implementation is not legal certification; do not turn conditional future payments/marketing into new MVP features.
- **Reliability:** health/liveness/readiness, structured logs with no secrets, actionable errors, graceful shutdown, backup/restore rehearsal, provider timeout/retry handling. Critical state transitions must remain correct after retries or outages.
- **Accessibility and language:** WCAG-oriented semantics, labels, keyboard, focus, screen readers, reduced motion, Arabic/English language/RTL correctness, responsive desktop/mobile. Use document-defined performance and Lighthouse targets; measure real routes rather than declare success on configuration alone.
- **SEO:** public indexable content has meaningful titles, descriptions, share metadata, canonical URLs, valid structured data, sitemap and robots. Unlisted Events, private/account/chat/management/admin screens must not be indexed. SPA is approved; do not introduce SSR/Next.js solely to satisfy SEO.
- **Performance and scale:** fast mobile initial load, sensible pagination/caching, indexes for observed query patterns, small-start growth with safe transactions and measurable load testing. Avoid premature distributed systems.

## 5. Task execution contract

- Execute tasks **in global numeric order unless dependencies and independent file ownership make concurrent work safe**. A dependency ID means that task must already pass its criteria. Never use stale task numbering from other plans.
- Inspect current code before changes. Skip already-verified completed work, don't recreate it. Keep one feature-focused branch per task/feature: `feature/auth`, `fix/login-redirect`, `chore/setup-typescript`; optional worktree `wasl-auth`. Clean up merged, clean temporary branches/worktrees automatically; preserve unmerged or dirty work.
- Each task description names the concrete work to do. Interpret it using **sections 1–4 of this file** as the full business and technical specification; no remote documents are required. For API work, specify methods/routes consistent with resource conventions, typed request/response shapes and status codes; avoid inventing extra endpoints.
- For each task, implement exact stated functionality, add success/failure/authorization tests where relevant, run local lint/types/test/build as applicable, then report changed files, verification evidence and any unresolved issue. Don't claim tests passed if not run.
- Parallel agent sessions are optional. Before parallelizing, check dependency IDs, shared schemas/contract stability, migrations and file ownership. One agent integrates the verified result.
- **CI/CD is intentionally last**. Local verification is mandatory at every stage. Never block early features on pipeline setup.

## 6. Implementation phases

| Phase | Task IDs | Scope |
|---|---|---|
| 1 | 1–25 | Local monorepo, tooling and development baseline |
| 2 | 26–49 | Read-only Community/Event content, homepage, search and details |
| 3 | 50–72 | Authentication, profiles, creation/editing and simple organizer actions |
| 4 | 73–95 | Membership/registration, admission, capacity, waitlists, attendance |
| 5 | 96–112 | Organization creation, admins, authority, transfer and verification |
| 6 | 113–131 | Persistent discussions and Stream-based group/DM chat |
| 7 | 132–149 | Notifications, moderation, privacy and compliance controls |
| 8 | 150–164 | E2E hardening, security, performance, staging, CI/CD, go-live |

## Phases and tasks

## Phase 1: Foundation and local tooling

### Task 1: Inspect repository and preserve existing work

**Description:** Check existing root files, Git status, and configured tools before making changes

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] No existing work is overwritten; missing foundation is identified.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** None.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 2: Configure pnpm workspaces

**Description:** Create pnpm-workspace.yaml for client, server, shared and root scripts; do not initialize Git

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] pnpm discovers every workspace and lockfile is reproducible.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 1.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 3: Create standard project directories

**Description:** Create client/, server/, shared/ and docs/design/; keep AGENTS.md as only root project guide

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Directories exist without moving or deleting user design artifacts.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 2.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 4: Configure Node and TypeScript baseline

**Description:** Pin supported Node/pnpm versions and strict tsconfig base inherited by packages

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Client and server use consistent strict TS settings.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 3.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 5: Set up root code quality tooling

**Description:** Install ESLint and Prettier, configure scripts and ignore patterns

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Root lint and format checks run without modifying generated files.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 4.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 6: Initialize React and Vite client

**Description:** Create React 19 TypeScript SPA inside client without Vite demo assets

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] pnpm client dev and build work.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 5.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 7: Initialize NestJS Fastify server

**Description:** Create NestJS app using @nestjs/platform-fastify and TypeScript

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Server starts and returns minimal health response.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 6.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 8: Configure local environment templates

**Description:** Document separate public client and private server variables in .env.example

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Local configuration validates and no secrets are committed.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 7.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 9: Configure server module layout

**Description:** Create domain modules with module-owned services and database access; avoid placeholder service layers

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Module boundaries and imports follow architecture design.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 8.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 10: Configure Drizzle and PostgreSQL connection

**Description:** Install drizzle-orm, drizzle-kit and pg; set up migration workflow with Supabase-managed PostgreSQL

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Connection smoke test and migration generation work locally.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 9.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 11: Configure initial server security/error handling

**Description:** Set secure headers, validation pipeline, consistent exception response and safe CORS

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Invalid request gets safe consistent error and headers are present.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 10.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 12: Configure OpenAPI generation

**Description:** Use NestJS Swagger to generate versioned API schema for existing endpoints

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] OpenAPI document is generated with valid shapes.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 11.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 13: Configure shared contracts package

**Description:** Create shared TypeScript/Zod package for cross-boundary contracts without DB imports

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Client and server resolve shared package.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 12.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 14: Configure Orval generation

**Description:** Generate typed Fetch/TanStack Query client and MSW mocks from server OpenAPI

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Generated client compiles without manually duplicating API DTOs.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 13.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 15: Configure TanStack Query

**Description:** Add QueryClient/provider and central error handling strategy

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Client can perform typed request and cache response.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 14.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 16: Configure React Router

**Description:** Use React Router Data Mode with initial routes and 404 page

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Direct route navigation and refresh work.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 15.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 17: Configure Tailwind and shadcn

**Description:** Install Tailwind CSS v4, shadcn/ui, Radix dependencies as required

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] A styled accessible base component renders.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 16.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 18: Integrate approved design tokens

**Description:** Read docs/design HTML/CSS and tokens before implementing CSS variables, typography and theme mapping

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Theme uses approved semantic tokens without hard-coded rival palette.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 17.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 19: Configure localization and direction

**Description:** Set up i18next/react-i18next, Manrope/Tajawal and Arabic RTL/English LTR

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Language switch changes content and direction.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 18.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 20: Set up client UI utilities

**Description:** Configure lucide-react and Sonner; use Zustand only when true shared client state exists

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Icons and accessible feedback render; no redundant global server-data store.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 19.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 21: Configure form toolkit

**Description:** Install react-hook-form and Zod resolvers; establish reusable form error handling

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] A small sample form validates and announces errors.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 20.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 22: Configure local testing foundations

**Description:** Install Vitest, React Testing Library, MSW and Nest testing facilities

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Local test commands pass for one representative client/server test.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 21.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 23: Configure browser and component testing

**Description:** Set up Playwright and lightweight Storybook for actual reusable components

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Sample browser test and design-system story run locally.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 22.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 24: Set up Supabase development resources

**Description:** Document DB, Auth, Storage and migration connection with environment separation

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Local credentials work; privileged keys stay on server.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 23.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 25: Seed safe discovery reference data

**Description:** Prepare reversible development seeds for cities, categories and sample public resources

**Applicable requirements:** Sections 2, 4 and 5: infrastructure/quality in this document.

**Acceptance criteria:**
- [ ] Repeat runs do not duplicate seeded data.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 24.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

## Phase 2: Public read-only experience and discovery

### Task 26: Model locations and localized names

**Description:** Create city/location and translation schema supporting all Türkiye

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Location lookups are localized and not Istanbul-only.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 25.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 27: Model categories and translations

**Description:** Create categories/tags and their translation relationships

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Every resource can have a category and translated labels.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 26.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 28: Model public communities

**Description:** Create Community schema for public visibility, owner identity, admission, capacity and archive status

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Database constraints reject invalid owner/capacity states.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 27.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 29: Model public events

**Description:** Create Event schema for public/unlisted, host type, physical/online, dates and cancellation

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Unlisted status and host relations are persisted correctly.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 28.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 30: Create public community listing endpoint

**Description:** Build paginated public community read API excluding archived content

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Unauthenticated requests return sanitized public data.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 29.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 31: Create public event listing endpoint

**Description:** Build paginated event read API excluding unlisted content

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Unlisted events are never returned by public listing.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 30.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 32: Create community details endpoint

**Description:** Return approved public fields with stable ID/slug and host identity

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Missing or archived resources follow visibility policy.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 31.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 33: Create event details endpoint

**Description:** Return public/unlisted direct-link details with date/time, location and status

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Unlisted direct link works; no private data exposed.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 32.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 34: Create shared navigation shell

**Description:** Build accessible responsive header and mobile navigation from docs/design

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Keyboard/mobile navigation and RTL verified.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 33.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 35: Create homepage hero

**Description:** Build landing headline, search entry and primary discovery CTA using design tokens

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Visitor understands discovery without sign-in.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 34.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 36: Create homepage communities section

**Description:** Fetch and display actual public community records with loading/empty/error states

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Cards navigate to community details.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 35.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 37: Create homepage events section

**Description:** Fetch and display actual public events with loading/empty/error states

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Cards show date, place/online, host and navigation.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 36.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 38: Create community details page

**Description:** Render community identity, details, admission summary and shareable link

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Details work without login and status is understandable.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 37.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 39: Create event details page

**Description:** Render date/time, location, capacity when shown, host, status and share link

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Public and unlisted URLs work; cancelled status distinct.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 38.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 40: Implement keyword search API

**Description:** Search indexed resource title/description using approved PostgreSQL approach

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Keyword queries match expected records and stay paginated.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 39.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 41: Implement city and category filters

**Description:** Apply validated location and category filtering in community/event API

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Combining filters returns matching results.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 40.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 42: Implement date filter for events

**Description:** Apply timezone-safe event date filtering and ordering

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Results match selected date range and Türkiye time behavior.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 41.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 43: Build unified discovery screen

**Description:** Implement discover route, tabs and results layout from UX spec

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Visitor can switch community/event result types.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 42.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 44: Connect search and filter controls

**Description:** Keep query, location, category and date in router URL params

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Refresh/back/share retain filters and show correct records.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 43.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 45: Add public organization summary endpoint

**Description:** Return safe organization host public identity needed by resource views

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] No privileged verification documents or admin data exposed.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 44.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 46: Add public profile previews

**Description:** Return only approved public user fields used on host/profile links

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Email and private account data never appear.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 45.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 47: Configure SEO metadata for public routes

**Description:** Use Unhead for title, description, canonical, social and relevant JSON-LD

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Public pages have meaningful metadata; unlisted pages noindex.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 46.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 48: Configure sitemap and robots rules

**Description:** Expose public indexable URLs and exclude unlisted/private routes

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] No confidential or unlisted URLs in sitemap.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 47.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 49: Add discovery functional tests

**Description:** Test listings, filters, visibility, links, responsive and RTL behavior

**Applicable requirements:** Sections 3: Discovery and UX; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Both API and browser tests cover public flows.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 48.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

## Phase 3: Accounts, profiles and first content creation

### Task 50: Connect Supabase Auth on server

**Description:** Verify signed-in JWTs server-side and map to local User identity

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Forged/expired credentials fail and valid session resolves user.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 49.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 51: Build sign-up and sign-in screens

**Description:** Implement provider-supported credentials, session UI and accessible errors

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] New/existing users authenticate successfully.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 50.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 52: Implement auth interruption return flow

**Description:** Preserve original join/create route during login; return to intended action

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Sign-in returns user to action context safely.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 51.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 53: Create user and profile schema

**Description:** Store private identity and public profile fields separately with uniqueness constraints

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Auth identity maps to one app user.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 52.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 54: Create current-user API

**Description:** Return authenticated identity and editable profile using explicit public/private projections

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Anon request denied and response contains only authorized fields.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 53.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 55: Build current-user profile view

**Description:** Show name, photo, bio, city, interests and account controls

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Authenticated user sees own data.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 54.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 56: Implement profile update API

**Description:** Validate and persist approved profile fields and user ownership

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Other users cannot edit profile; invalid fields rejected.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 55.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 57: Build profile editing form

**Description:** Use React Hook Form/Zod for profile fields and save states

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Editing persists and validation is accessible.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 56.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 58: Build public user profile page

**Description:** Display safe user fields and public identity links

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Private email/security attributes stay hidden.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 57.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 59: Configure media storage and upload policy

**Description:** Use Supabase Storage signed/direct upload with approved limits and content validation

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Profile media uploads securely without trusting client MIME alone.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 58.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 60: Integrate profile image upload

**Description:** Allow avatar upload/update and safe public media display

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Upload errors handled and no oversized data proxy through API.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 59.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 61: Implement create community API

**Description:** Validate details, location/category, owner, capacity, admission and initial creator organizer

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Authorized user creates public community with correct ownership.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 60.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 62: Build community creation form

**Description:** Use approved design system and validation for create fields

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Signed-in user creates community and reaches details page.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 61.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 63: Implement create independent event API

**Description:** Create user-hosted event with public/unlisted mode and valid date/location

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Independent event works without a community.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 62.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 64: Build independent event creation form

**Description:** Add host, date/time, online/place, visibility, admission and capacity inputs

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] User can create and share public/unlisted event.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 63.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 65: Implement community-hosted event creation

**Description:** Authorize community organizers and associate event with community host

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Unauthorized user cannot attach event to community.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 64.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 66: Build host selection for events

**Description:** Offer eligible personal/community contexts without impersonation

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Only authorized host options appear.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 65.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 67: Implement community edit and archive API

**Description:** Enforce organizer authorization; preserve history when archive stops joins/discovery

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Archive never silently destroys membership data.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 66.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 68: Build community edit/archive screens

**Description:** Offer contextual management controls, save states and explicit archive status

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Members are not shown privileged management controls.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 67.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 69: Implement event edit/cancel API

**Description:** Authorize organizers and preserve cancelled event detail state

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Cancellation idempotent and status stays visible.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 68.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 70: Build event edit/cancellation UI

**Description:** Provide organizer form with cancellation confirmation and cancelled banner

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Cancelled event visibly differs from future active events.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 69.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 71: Implement authenticated create entrypoints

**Description:** Add create navigation and guard while preserving intended route

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Visitor directed to auth; user can choose community or event.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 70.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 72: Test creator permissions and CRUD

**Description:** Cover owner-only modifications, invalid host relationships and public read privacy

**Applicable requirements:** Sections 3: Identity/profiles; Communities; Events in this document.

**Acceptance criteria:**
- [ ] Authorized create/edit works and unauthorized writes denied.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 71.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

## Phase 4: Participation, approvals and capacity correctness

### Task 73: Create community membership state model

**Description:** Create membership records/status constraints and history with unique active relationship

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] No duplicate current membership and allowed states persisted.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 72.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 74: Create event registration state model

**Description:** Create registration records/status constraints and history

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] No duplicate active registration and statuses constrained.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 73.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 75: Build central participation transition rules

**Description:** Specify allowed transitions, eligibility and idempotent repeat actions per use cases

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Illegal or repeated transitions do not corrupt state.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 74.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 76: Implement simple open community join

**Description:** Authenticated user joins open uncapped community directly as Active

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Repeated join cannot duplicate membership.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 75.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 77: Implement simple instant event registration

**Description:** Authenticated user registers uncapped instant event as Accepted

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Repeated registration remains one record.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 76.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 78: Build Join and Register action UI

**Description:** Show authenticated actions and clear resulting statuses

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] User sees Active/Accepted and sign-in interruption works.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 77.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 79: Implement leave and cancel registration

**Description:** User transitions membership to Left and registration to Cancelled

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Only participant can change own record and privileges update.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 78.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 80: Build My Activity API

**Description:** Return own community memberships and event statuses

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] No other user's private participation returned.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 79.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 81: Build My Activity screen

**Description:** Display own memberships/registrations and leave/cancel actions

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Status badges match backend state and page handles empty state.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 80.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 82: Implement capacity transaction checks

**Description:** Use PostgreSQL transactions/locking for each admission decision

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Concurrent requests cannot exceed accepted/active capacity.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 81.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 83: Implement automatic full-capacity waitlisting

**Description:** When full, eligible new participants enter Waitlisted

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Waitlisted participant does not consume capacity or member privileges.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 82.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 84: Implement automatic queue promotion

**Description:** Promote oldest eligible waitlisted user transactionally when capacity opens

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Correct FIFO order and capacity guarantee under concurrency.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 83.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 85: Implement manual-approval requests

**Description:** Create Pending for configured manual policy without granting member privileges

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Repeated requests do not create duplicates.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 84.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 86: Implement organizer approval/rejection API

**Description:** Allow resource-scoped organizer to decide eligible Pending requests

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Unauthorized decisions rejected and status history recorded.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 85.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 87: Implement manual waitlist selection

**Description:** Keep organizer control of selection/promotions under manual policy

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] No automatic FIFO promotion overrides manual selection.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 86.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 88: Build organizer membership list

**Description:** Display Pending, Waitlisted and Active with actionable approvals

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Statuses and authorization match backend.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 87.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 89: Build organizer registration list

**Description:** Display Pending, Waitlisted and Accepted with approve/reject controls

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Attendee state updates without refresh and errors visible.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 88.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 90: Implement organizer participant removal

**Description:** Remove active/accepted participant, release capacity and trigger policy-specific promotion

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Removed participant loses privileges and history retained.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 89.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 91: Implement participant count and capacity API

**Description:** Return accurate scoped member/attendee/waitlist counts

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Aggregates reflect current states, not history duplicates.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 90.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 92: Build organizer count widgets

**Description:** Display actual counts and capacity usage with design-system patterns

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Counts match data and no advanced analytics dashboard built.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 91.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 93: Implement manual attendance marking

**Description:** Allow organizers to mark accepted attendees Attended or No-show

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] Nonaccepted users cannot be marked attended.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 92.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 94: Build attendance management UI

**Description:** Show eligible accepted users and mark Attended/No-show

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] State preserved and accessible status shown.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 93.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 95: Test concurrency and participation invariants

**Description:** Run parallel registration, removal, repeated action and promotion cases with isolated PostgreSQL

**Applicable requirements:** Section 3: Participation invariants and concurrency in this document.

**Acceptance criteria:**
- [ ] No overbooking, stale privileges or inconsistent states.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 94.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

## Phase 5: Organizations, ownership and staff

### Task 96: Model organization owner and admins

**Description:** Create organization, exactly-one-owner and admin associations

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] One current owner and scoped admin uniqueness enforced.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 95.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 97: Build public organization profile API

**Description:** Expose approved fields, verification label and resource links

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Visitors see public organization without private members.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 96.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 98: Build public organization profile screen

**Description:** Show organization logo, description, location, links and verified state

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Public view follows design tokens and RTL.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 97.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 99: Implement organization creation API

**Description:** Create first-class organization with creator as initial owner

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Organization persists independently of owner identity.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 98.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 100: Build organization creation form

**Description:** Create approved fields with logged-in owner context

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] User can register organization without separate login.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 99.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 101: Implement organization profile management

**Description:** Enforce owner/admin permissions for edits and media

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Unauthorized users cannot change organization.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 100.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 102: Build organization management form

**Description:** Edit organization identity through authorized personal account

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Changes appear on public profile.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 101.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 103: Implement organization-owned resource creation

**Description:** Authorize Owner/Admin and set organization as resource owner

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Resource displays organization identity and actor audit maintained.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 102.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 104: Build organization host selection

**Description:** Allow authorized org contexts when creating community/event

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] No unauthorized organization appears.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 103.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 105: Create organization admin invitation model

**Description:** Store invitation token expiry, target and state

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Tokens are single-use/expiring and not exposed in logs.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 104.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 106: Implement invite and accept admin APIs

**Description:** Owner invites, target accepts through personal account

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Admin permissions activate only after proper acceptance.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 105.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 107: Build organization admin management UI

**Description:** Invite/remove admins and view pending invitations

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Admin cannot remove owner or alter owner-only settings.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 106.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 108: Implement transactional organization ownership transfer

**Description:** Verify eligible target, single owner invariant and previous-owner result

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Exactly one owner after concurrent/failed transfers.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 107.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 109: Build ownership transfer UX

**Description:** Show clear confirmation, target selection and updated role context

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Transfer is reflected without recreating resources.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 108.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 110: Create organization verification request workflow

**Description:** Store pending/verified/rejected requests and authorized platform decision

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Unverified org may operate according to approved policy.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 109.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 111: Build verification status UI

**Description:** Show actual status to organization managers and public viewers where approved

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] No false verified badge or exposed evidence.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 110.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 112: Test inherited resource authority

**Description:** Verify owner/admin access to org resources and community-host event management

**Applicable requirements:** Section 3: Organizations and verification in this document.

**Acceptance criteria:**
- [ ] Permission changes take effect promptly across resources.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 111.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

## Phase 6: Discussions, realtime chat and engagement

### Task 113: Create discussion thread and post schema

**Description:** Create persistent event single thread, community topics, comments and one-level replies

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Schema prevents deeper nesting and handles lifecycle.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 112.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 114: Implement event discussion read API

**Description:** Return ordered paginated comments/replies following event visibility

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Visitor read follows parent visibility and exposes only safe author data.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 113.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 115: Build event discussion display

**Description:** Render comments/replies on event details with empty/loading states

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Discussion is readable without Stream dependency.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 114.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 116: Implement authorized event discussion posting

**Description:** Validate signed-in users and approved posting eligibility including resource rules

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Unauthorized posts rejected and edits do not bypass permissions.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 115.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 117: Build event commenting form

**Description:** Post and reply with one-level nesting and accessible errors

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Comment appears after success with correct author.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 116.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 118: Implement community topic APIs

**Description:** Create/list/detail lightweight topics with resource permissions

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Topics stored in PostgreSQL and associated with community.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 117.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 119: Build community topics UI

**Description:** List topics, create when eligible, and open thread

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] UI follows membership/visibility behavior.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 118.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 120: Implement discussion moderation

**Description:** Allow author/authorized moderator actions and record necessary moderation info

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] No scope escalation or unauthorized deletion.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 119.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 121: Define messaging identity and mapping

**Description:** Map stable Wasl users/resources/conversations to Stream identifiers

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] No Stream IDs replace domain identifiers.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 120.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 122: Integrate Stream server adapter

**Description:** Provision authorized users/channels and issue short-lived client tokens server-side

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Stream secret never exposed to browser.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 121.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 123: Implement community chat eligibility

**Description:** Only Active members/organizers/moderators are provisioned to correct channel

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Pending/Waitlisted/Removed access denied.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 122.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 124: Implement event chat eligibility

**Description:** Only Accepted attendees/organizers/moderators have event channel access

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Cancelled/rejected/removed users cannot access restricted chat.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 123.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 125: Implement chat access revocation

**Description:** Synchronize leave/remove/role changes with provider and handle retry/reconciliation

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Revoked participant cannot retain chat access after failure.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 124.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 126: Integrate Stream React feature boundary

**Description:** Keep SDK/hooks and UI inside client messaging feature

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Other client features contain no direct Stream imports.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 125.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 127: Build unified Messages screen

**Description:** Offer permitted group chats and DMs in UX-defined navigation

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Chats update realtime; empty/error/offline states usable.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 126.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 128: Implement direct-message creation

**Description:** Authorize signed-in sender and recipient according to MVP policy

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Users can start DMs without exposing provider credentials.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 127.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 129: Implement block and report DM actions

**Description:** Persist user blocks and enforce bilateral applicable DM behavior

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Blocked users cannot continue disallowed communication.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 128.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 130: Implement chat moderation controls

**Description:** Authorize contextual moderators for provider-managed chat actions

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] Moderator cannot obtain unrelated admin rights.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 129.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 131: Test messaging outage and access transitions

**Description:** Simulate provider failure, retry and role changes

**Applicable requirements:** Section 3: Communication and discussions in this document.

**Acceptance criteria:**
- [ ] No privilege leak, protected secret leak or silent provisioning failure.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 130.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

## Phase 7: Notifications, moderation and privacy

### Task 132: Create notification and delivery schema

**Description:** Store recipient, context, read state and email delivery attempt status

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] No duplicate delivery for same idempotent event.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 131.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 133: Implement in-app notification creation

**Description:** Produce notifications for required participation and organizer events

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Correct users receive contextual notification once.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 132.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 134: Implement notifications listing and read API

**Description:** Return user-owned notification list and mark-read action

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Users cannot read or mark others notifications.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 133.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 135: Build notifications screen

**Description:** Show unread state, relevant links and accessible feedback

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Links navigate to correct context.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 134.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 136: Configure Resend email adapter

**Description:** Send transactional emails through server-only credentials and provider adapter

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Email payload is safe and retries are tracked.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 135.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 137: Add durable email processing

**Description:** Use Supabase Queues pgmq and appropriate worker/retry for required notifications

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Transient provider outages do not lose required messages.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 136.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 138: Wire participation notifications

**Description:** Notify approvals/rejections, waitlist promotions and participant removal both in-app and email

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Event IDs and recipient statuses correspond to actual transition.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 137.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 139: Wire organization and cancellation notifications

**Description:** Notify invites, verification changes and event cancellation to required audience

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Cancellation handles Accepted/Pending/Waitlisted recipients.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 138.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 140: Implement reporting schema and API

**Description:** Let authenticated users report resources, content and users with validation

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Reports are durable and reporter cannot forge target identity.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 139.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 141: Build report action UI

**Description:** Offer contextual report flow on relevant public/interactive views

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Report confirmation/error visible and unauthenticated action gated.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 140.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 142: Implement scoped moderator assignments

**Description:** Add Community/Event moderator roles with approved powers

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Moderator cannot become owner or org admin.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 141.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 143: Build contextual moderation controls

**Description:** Show only moderation actions current user can perform

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] No hidden button relied upon for authorization.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 142.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 144: Implement platform admin guard and MFA

**Description:** Restrict internal operations to platform admin and stronger authentication

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Normal users/admins cannot access platform tools.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 143.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 145: Implement report review and decision API

**Description:** List reports to platform admins and record moderation actions

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Decision has accountable actor and authorized target.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 144.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 146: Build minimal platform moderation console

**Description:** Review reports, suspend/restore users, moderate resources and verify orgs

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] No advanced analytics or enterprise audit product introduced.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 145.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 147: Implement privacy consent and age gates

**Description:** Record approved legal acceptance, age assurance and consent data according to

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Underage/consent behavior matches approved launch policy.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 146.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 148: Implement privacy request and deletion path

**Description:** Handle access/export/deletion requests and retention rules through server workflow

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Restricted records and provider cleanup follow configured policy.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 147.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 149: Review compliance and security gates

**Description:** Validate KVKK/5651, conditional EU and other SRS legal decisions with designated review

**Applicable requirements:** Sections 3–4: Notifications, moderation, privacy and security in this document.

**Acceptance criteria:**
- [ ] Unresolved launch-blocking legal decisions explicitly tracked.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 148.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

## Phase 8: Final integration, hardening, deployment and CI/CD

### Task 150: Complete functional E2E journeys

**Description:** Automate browse-to-action, creation, approval, waiting, chat, org and moderation flows

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Playwright journeys pass with denied-access tests.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 149.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 151: Test cross-module authorization

**Description:** Exercise acting-as-owner/admin/moderator/participant and blocked/suspended states

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] No cross-resource privilege escalation.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 150.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 152: Run security and abuse checks

**Description:** Verify validation, rate limits with @nestjs/throttler, secrets, headers and OWASP ASVS critical controls

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] No known critical/high security defects.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 151.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 153: Run accessibility and localization checks

**Description:** Test keyboard, semantics, RTL/LTR, contrast, screen reader labels and reduced motion

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Approved WCAG baseline demonstrated on key screens.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 152.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 154: Verify SEO and public indexing

**Description:** Test titles, canonicals, JSON-LD, sitemap, robots and unlisted noindex

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Sensitive/unlisted pages not indexed.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 153.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 155: Load-test transactional paths

**Description:** Test realistic concurrency for admission, queues and critical changes

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Capacity never exceeded and SRS performance baseline met.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 154.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 156: Measure frontend performance

**Description:** Audit mobile Core Web Vitals/Lighthouse against explicit SRS gates

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Recorded evidence meets gates or documented approved exceptions.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 155.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 157: Verify recovery and backups

**Description:** Test database restoration plan, migration rollback approach and service recovery

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Backup recovery evidence recorded without destructive production trial.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 156.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 158: Review dependency and provider resilience

**Description:** Check Stream, Supabase, Resend fail/retry and account lifecycle

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Provider outage/revocation does not silently corrupt core state.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 157.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 159: Prepare Render environments

**Description:** Configure Render static client and NestJS service, staging and production env vars

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Staging app connects to correctly isolated services.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 158.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 160: Run staging smoke tests

**Description:** Verify public, signed-in, upload, chat, notification and admin journeys

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Staging meets acceptance gates before production.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 159.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 161: Prepare launch operational checklist

**Description:** Document monitoring, privacy pages, support paths, security and legal sign-offs

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Go/no-go checklist has accountable decisions.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 160.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 162: Configure CI pipelines at project end

**Description:** Add GitHub Actions for pnpm install, lint, TS, tests, build, scans and relevant gates

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Pull requests run checks with reproducible pinned dependencies.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 161.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 163: Configure CD at project end

**Description:** Connect approved Git/Render deployment triggers and protected secrets

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Successful verified main integration deploys intended environment.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 162.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

### Task 164: Verify post-deploy health

**Description:** Run end-to-end production smoke checks with non-destructive fixtures

**Applicable requirements:** Sections 4–5: release quality gates in this document.

**Acceptance criteria:**
- [ ] Services healthy, key flows correct, rollback path documented.
- [ ] Task-specific success, failure, authorization, and empty-state cases are verified where applicable.
- [ ] Changed code passes relevant local type checks, linting, and tests; completion records exact commands and results.

**Dependencies:** Task 163.
**Parallelization:** May run concurrently only with dependency-ready tasks that do not share mutable contracts, migration files, or code ownership; otherwise sequential.

## 7. Explicitly out of scope

Do not implement payments, paid events/tickets, QR check-in, Guides, AI ranking/personalization, premium subscriptions, private Communities, advanced analytics, enterprise logs, arbitrary organization roles, deep forum nesting, push notifications, a custom Socket.IO chat backend, microservices, Kafka or Kubernetes. Store no provider-specific chat IDs as core User/Community/Event primary keys. Treat `docs/design/` as the only visual design file requirement; the owner adds it.

**Total numbered tasks: 164.**
