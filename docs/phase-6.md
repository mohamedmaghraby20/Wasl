# Phase 6: Discussions, realtime chat and engagement

## Implemented

- Added native PostgreSQL discussions. Event discussions use one thread per Event; Community discussions use topics created by eligible members. Posts support a single reply level: a reply to a reply is rejected, keeping threads two levels deep.
- Added read APIs for Event discussions and Community topics, and write APIs for posting, editing, removing, and closing. Closed discussions reject posting for everyone, including managers; managers close an Event discussion explicitly through `PATCH /events/:id/discussion/close`.
- Enforced posting eligibility on the server. Event commenting requires an `ACCEPTED` or `ATTENDED` registration; Community posting requires an `ACTIVE` membership; authors edit and remove their own comments; Community managers moderate any comment in their Community; Event organizers and Organization managers moderate that Event.
- Soft deletion keeps removed content visible as a placeholder, with author and moderator IDs retained for audit. Archived topics stay readable and reject new topics and posts.
- Added the Event discussion UI with pagination, reply targeting, inline editing, removal, moderator close, and sign-in/eligibility/closed/empty states. Added the Community topic list and topic detail pages with creation, replies, and the same states.
- Defined messaging identity and mapping. Each Wasl user maps to a stable Stream user ID (`wasl_<id>`) through `messaging_user_mappings`; the mapping is created on first session and reused for every later token.
- Added the server-only Stream adapter. It derives tokens, keeps the API secret on the server, and creates channels with member-scoped roles. A channel moderator receives `channel_moderator` for that one channel only, so moderation never grants rights in unrelated channels.
- Chat eligibility is computed server-side from Wasl state, not from client input: `ACTIVE` Community membership for Community chat, `ACCEPTED`/`ATTENDED` registration (or organizer/manager authority) for Event chat. Pending, waitlisted, removed, and cancelled participants are denied before any channel is provisioned.
- Chat access changes are recorded in `messaging_member_sync` as desired versus observed provider state. A reconciliation worker retries revoked access every 30 seconds, so a provider outage cannot silently leave a removed participant in a channel.
- Stream tokens are gated: `/messaging/session` returns `503` until `STREAM_PERMISSIONS_VERIFIED=true`, because server-side channel permissions must be confirmed in the Stream dashboard before clients receive tokens. The flag is now enabled for the configured Stream app, whose `messaging` channel type was verified to deny channel reads, joins, and channel creation to non-members.
- Added the unified Messages screen: conversation list with Community, Event, and profile-derived titles, the Stream chat window, reply threads, and RTL layout. Direct messages can be started from the screen or from a public profile through `/messages?to=<userId>`.
- Added block, unblock, and report for direct messages. Blocking is enforced in the Wasl database for DM creation independent of the provider, and also revokes the blocked pair's DM channel membership. Reports are stored with reporter, conversation, reason, and timestamp.
- Added English and Arabic strings for discussions, chat, blocking, reporting, and the messaging states.
- Regenerated OpenAPI and Orval client output from the Nest server contract, including the new `discussions` and `messaging` client modules.

## Database

- `discussion_threads` and `discussion_posts`: one Event thread per Event, Community topics, and one reply level enforced by a `depth` check plus a composite parent reference to a root post in the same thread, author and deletion audit columns, and pagination indexes. RLS is enabled and direct `PUBLIC`/`anon`/`authenticated` privileges are revoked.
- `messaging_user_mappings`, `messaging_conversations`, `messaging_member_sync`, `messaging_user_blocks`, and `messaging_reports`: stable provider identity, one conversation per community/event/dm-pair, desired-versus-provider membership state, blocks, and reports. RLS is enabled on every table and client-role grants are revoked.
- Migrations `0013_curly_wendell_vaughn.sql`, `0014_motionless_serpent_society.sql`, `0015_sad_vin_gonzales.sql`, and `0016_white_nemesis.sql` were generated and applied to the configured Wasl Supabase development database.

## Verification

- `corepack pnpm test` — passed: 163 tests. Server: 109 tests in 19 files. Client: 54 tests in 19 files. Shared has no test files.
- `corepack pnpm test:discussions:postgres` — passed against the configured Supabase PostgreSQL database in an isolated temporary schema. It verifies the discussion schema constraints, RLS, and zero client grants, then exercises Event discussion posting, one-level reply rejection, non-attendee denial, moderation, and cleanup.
- `corepack pnpm test:messaging:postgres` — passed against the same database with fixtures rolled back. It verifies identity mapping, channel eligibility for Community and Event chat, revocation retry while the provider fails, DM creation and its unique pair, and block/unblock membership effects.
- `corepack pnpm test:messaging:stream` — passed against the configured Stream app. It verifies the `messaging` channel-type grants, a member reading and sending in a real channel, a non-member receiving an access error and failing to send, channel-scoped `channel_moderator` and `channel_member` roles, rejection of an expired token, and the 900-second token lifetime issued by the server adapter. Temporary users and the channel are deleted afterwards.
- `corepack pnpm typecheck` — passed for shared, server, and client.
- `corepack pnpm lint` — passed with `--max-warnings=0`.
- `corepack pnpm test:e2e` — passed: 3 Chromium tests, including the mobile Event discussion and the mobile Arabic RTL navigation check.
- `corepack pnpm build` — passed, including OpenAPI and Orval generation. The entry chunk is 418.38 kB and the build emits no circular-chunk warnings. The lazily loaded `MessagesPage` chunk is 1,755.63 kB (516.97 kB gzip) because it contains the Stream React SDK and its locales; Vite reports its chunk-size warning. Splitting it further produced circular chunk graphs and no meaningful reduction, so the chat bundle is accepted as a lazy route.
- `corepack pnpm db:generate` — passed with "No schema changes, nothing to migrate".
- `corepack pnpm db:migrate` — reported no pending migrations.
- UI review: the Event discussion was checked in Chromium at 1280×900 and 375×812 with a stubbed public API, and the unauthenticated Messages gate at both sizes. The pagination controls were hidden for single-page discussions as a result. The signed-in chat surface itself was not visually reviewed because it requires a signed-in Supabase session; its setup-pending and offline states are covered by unit tests.

## Configuration

- `STREAM_API_KEY`, `STREAM_API_SECRET`, and `STREAM_PERMISSIONS_VERIFIED` are server-only. `server/.env.example` documents all three.
- `STREAM_PERMISSIONS_VERIFIED` defaults to false and is set to `true` only for the configured Stream app, after its channel permissions were confirmed to deny non-members. While it is false, `/messaging/session` returns `503`, desired membership changes are still persisted, provider revocations are still attempted, and participation responses report `messagingSyncPending: true` instead of failing the join/leave action.
- The `messaging` channel type grants `read-channel-owner` but not `read-channel` or `join-channel` to the `user` role, so non-members cannot read or join a channel by ID. `channel_member` can read and send, while `channel_moderator` adds moderation actions scoped to that one channel and holds no global `ban-user` or `create-channel` grant. Anonymous and guest roles are denied.
- The `create-channel` grant was removed from the `user` role because Wasl provisions every channel with the server SDK. Clients were never allowed to create app channels, and the change closes that provider-side path without affecting token issuance, DMs, or resource channels.
- `PLATFORM_ADMIN_USER_IDS` from Phase 5 is unchanged.

## Live provider verification

Live Stream verification was run against the configured Stream app and passed: token issuance with a 900-second lifetime, member reads and sends, non-member access denial for reads and sends, channel-scoped moderator and member roles, and expired-token rejection. The checks are repeatable through `corepack pnpm test:messaging:stream`, which skips when credentials are absent and deletes its temporary users and channel.

Reconnection after a dropped connection is rendered by the Messages screen and covered by a client test that drives the `connection.changed` event. The signed-in chat surface itself was not visually reviewed because it needs a real signed-in Supabase session; the `503` setup-pending state and the offline state are covered by unit tests.
