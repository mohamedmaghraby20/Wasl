# Development sample data

Run from the repository root:

```powershell
corepack pnpm db:seed
```

The seed checks the latest Drizzle migration hash before writing. If it is missing, inspect the configured database target and run `corepack pnpm db:migrate` first. `server/.env` selects the database and Supabase Storage credentials. Production-mode execution is refused. Local and production environment files can point at the same project: this is not a disposable-database reset.

## Coverage

- 18 fictional adult attendees plus the synthetic fallback host, with profile pictures, bios, cities, and interests.
- 12 communities: personal and organization ownership, open/approval/automatic admission, several finite capacities, unlimited membership, a full queue, an archived community, and an empty community.
- 16 events: community/personal/organization hosts, all admission modes, public/unlisted visibility, online/in-person locations, upcoming/past/cancelled dates, limited/unlimited capacities, and full waitlists.
- Every community status: active, pending, waitlisted, rejected, left, and removed.
- Every event status: accepted, pending, waitlisted, rejected, user-cancelled, organizer-removed, attended, and no-show. Attendance outcomes belong to past events only.
- Transition histories with timestamps, actors, and reasons; large enough request queues to exercise five-row previews and the full review page.
- Three fictional organizations with complete public fields/logos, verification outcomes, admins, and pending/accepted/revoked invitations (including an expired invitation).
- Community topics, event discussion threads, root comments/replies, closed discussions, removed-comment placeholders, moderators, report review states, and read/unread in-app notifications.

`dev-seed-community-01` is a full approval community with pending and waitlisted requests. `dev-seed-community-12` is empty. `dev-seed-event-13` and `dev-seed-event-14` have attendance history; `dev-seed-event-15` is cancelled; `dev-seed-event-16` is a full two-person event. Public slugs and display names clearly identify samples.

Community and event IDs are text, including these stable sample IDs; moderation, editing, archive/cancel, and reporting accept them. User, participant, organization, and post IDs remain UUIDs. Browser API access requires CORS to allow `PUT`, `PATCH`, and `DELETE` as well as reads and creation.

## Safety and reruns

Existing sample IDs are reused. Optional `WASL_SEED_OWNER_EMAIL` selects an existing signed-up owner; otherwise the existing signed-in owner of sample community 01 is preserved, falling back to the synthetic host only when necessary. The signed-in sample owner's blank city, bio, photo, and interests receive demo defaults. Existing profile values are preserved and the seed grants no platform-admin access.

A signed-in sample owner also gets active, pending, and waitlisted memberships plus upcoming registrations and past attendance. The fictional host owns those sample communities so the signed-in account can use participant actions. Existing memberships and registrations for the signed-in account take precedence over these fixtures. The signed-in owner also personally owns five active sample communities, including the full approval community, and can manage their discussions and requests.

Rerunning refreshes sample resource fields, dates, categories, synthetic participation states and their histories. It does not delete real accounts, real memberships/registrations, or non-sample resources. Finite sample capacities are raised if needed to accommodate existing real participants. Reserved user IDs are checked against email addresses and authentication mappings before sample writes. Existing sample image files are reused.

Synthetic users use `@wasl.invalid` addresses and have no Supabase Auth login. Invitation hashes are random with no saved redemption token. No email jobs, Stream channels/messages, real age-verification evidence, or approved legal text are fabricated. Legal documents stay draft; retention decisions remain `TBD_LEGAL`.

Some nulls are deliberate: unlimited capacity, a personal event's community link, unreviewed requests' decision fields, unread notifications, and non-deleted posts' deletion fields. Filling those with arbitrary values would make the scenarios invalid.

Focused checks:

```powershell
corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts src/db/development-seed-data.spec.ts
corepack pnpm --filter @wasl/server typecheck
corepack pnpm --filter @wasl/server exec tsx test/development-seed-postgres.integration.ts
```
