# Phase 7 — Notifications, moderation and privacy

## Task 132 — Notification and delivery schema

Status: complete. Branch: `feature/phase7-notification-schema`.

- `server/src/db/schema.ts` defines private in-app notifications with recipient, stable event key, type, resource context, read state and creation time. A unique `(recipient_user_id, event_key)` index prevents duplicate notifications for a replayed event; recipient and unread indexes support future list APIs.
- A one-to-one `notification_email_deliveries` row records retry status, attempt count/times, provider message ID, error and sent time. The primary key on `notification_id` prevents two delivery records for one notification. Provider-level duplicate-send prevention is still Task 136–137 work; the schema alone does not guarantee exactly-once external sends.
- Generated migration `server/drizzle/0017_spotty_greymalkin.sql` enables RLS and revokes direct `PUBLIC`, `anon` and `authenticated` grants for both tables. It was applied to the owner-confirmed development database, not production.
- Focused checks passed: `corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts src/db/notification-schema.spec.ts` (2 tests), `corepack pnpm --filter @wasl/server exec tsx test/notification-schema.integration.ts` (transaction-rolled-back duplicate recipient/event and delivery checks, retry state and database RLS/grants), `corepack pnpm --filter @wasl/server typecheck`, `corepack pnpm --filter @wasl/server lint`, and `corepack pnpm exec prettier --check server/src/db/schema.ts server/src/db/notification-schema.spec.ts server/test/notification-schema.integration.ts`. `corepack pnpm db:generate` reported no schema changes after generation and `corepack pnpm db:migrate` completed.

Next: Task 133, create in-app notifications for required transitions using the persisted event key. Tasks 134–149 remain open.

## Subsequent implementation (committed, not release-ready)

Tasks 133–143 have working server/client implementations in this worktree: transaction-bound notification creation, owner-only listing/read, a notification page, a Resend adapter with provider idempotency key, a pgmq email queue/worker with retry status, participation/organization/cancellation notices, report submission, and scoped moderator assignment with contextual controls. Migrations 0018–0020 are in the worktree. The separate external Resend service and a production worker deployment have not been verified; a successful local mock send does not establish live delivery.

Tasks 144–146 add AAL2 enforcement on all existing platform-admin endpoints, a transactional report-review API with recorded actor/decision and target-scoped suspension, restore, archive and cancellation actions, and a small MFA-enabled review screen at `/admin`. Admin cancellation produces the same participant notices as organizer cancellation. A user's pending Stream membership removal relies on the existing reconciliation worker; immediate provider-side revocation has not been verified for admin suspension.

### Launch-blocking policy and security decisions (Tasks 147–149)

These tasks are **not complete**. Neither the repository nor the owner has supplied an approved legal text/version, launch minimum age, consent basis, deletion/retention schedule, or an authorized review/sign-off. Do not silently impose an age threshold, claim legal compliance, or purge referenced identity/provider data based on a guessed rule. Before launch, the designated legal/privacy reviewer must approve:

- KVKK notices, lawful basis and retention periods (including reports, discussion history, messaging and 5651/copyright/UGC obligations), and the responsible data controller/contact and deletion exceptions.
- Child-age applicability and the age assurance/guardian flow; the versioned acceptance and consent texts for sign-up, with evidence of the user's affirmative action.
- Access/export/deletion request deadlines, identity checks, fulfillment and provider cleanup across PostgreSQL, Supabase Auth/Storage, Stream and Resend; an audit/retention exception for legal obligations.
- Whether GDPR/EU obligations apply, including cross-border transfers and data processor terms.

Until these are approved and implemented, Phase 7 cannot be honestly marked complete or release-ready. The server's administrator allowlist and MFA are technical controls, not legal sign-off.

### Verification of the uncommitted implementation

- `corepack pnpm api:generate` regenerated OpenAPI/Orval output after the admin report API change (ran twice, both succeeded). Generated artifacts were not hand-edited.
- `corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts src/modules/auth/platform-admin.guard.spec.ts src/modules/notifications/resend-email.adapter.spec.ts`: 7 passed (2 files).
- `corepack pnpm --filter @wasl/web exec vitest run --config vitest.config.ts src/features/moderation/PlatformModerationPage.test.tsx src/features/moderation/ReportAction.test.tsx src/features/notifications/NotificationsPage.test.tsx`: 10 passed (3 files).
- `corepack pnpm --filter @wasl/server exec tsx test/moderation.integration.ts` and `corepack pnpm --filter @wasl/server exec tsx test/notifications.integration.ts`: passed against the configured development PostgreSQL, with fixtures rolled back. The notification test simulates provider success/failure; no live Resend delivery was performed.
- `corepack pnpm --filter @wasl/server typecheck`, `corepack pnpm --filter @wasl/web typecheck`, `corepack pnpm --filter @wasl/server lint`, `corepack pnpm --filter @wasl/web lint`: passed after correcting generated nullable API types and guard lint. The initial client typecheck and server lint runs failed before those corrections.
- `corepack pnpm db:migrate` succeeded on the configured development database; `corepack pnpm db:generate` found no pending schema changes. No production migration was attempted.
- `corepack pnpm exec prettier --check` on the newly changed Phase 7 modules, admin screen/tests, router and this record: passed after formatting.
- Impeccable UI detector on the admin screen returned `[]`. No authenticated browser visual review was possible without a configured platform admin and second factor; this is not visual sign-off.

### Follow-up verification

- `corepack pnpm --filter @wasl/server exec tsx test/notifications.integration.ts` passed with additional rolled-back checks that a suspended recipient is not emailed and an archived notification is not sent again. Live Resend delivery remains unverified.
