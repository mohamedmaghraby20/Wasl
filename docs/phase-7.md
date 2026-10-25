# Phase 7 — Notifications, moderation and privacy

## Task 132 — Notification and delivery schema

Status: complete. Branch: `feature/phase7-notification-schema`.

- `server/src/db/schema.ts` defines private in-app notifications with recipient, stable event key, type, resource context, read state and creation time. A unique `(recipient_user_id, event_key)` index prevents duplicate notifications for a replayed event; recipient and unread indexes support future list APIs.
- A one-to-one `notification_email_deliveries` row records retry status, attempt count/times, provider message ID, error and sent time. The primary key on `notification_id` prevents two delivery records for one notification. Provider-level duplicate-send prevention is still Task 136–137 work; the schema alone does not guarantee exactly-once external sends.
- Generated migration `server/drizzle/0017_spotty_greymalkin.sql` enables RLS and revokes direct `PUBLIC`, `anon` and `authenticated` grants for both tables. It was applied to the owner-confirmed development database, not production.
- Focused checks passed: `corepack pnpm --filter @wasl/server exec vitest run --config vitest.config.ts src/db/notification-schema.spec.ts` (2 tests), `corepack pnpm --filter @wasl/server exec tsx test/notification-schema.integration.ts` (transaction-rolled-back duplicate recipient/event and delivery checks, retry state and database RLS/grants), `corepack pnpm --filter @wasl/server typecheck`, `corepack pnpm --filter @wasl/server lint`, and `corepack pnpm exec prettier --check server/src/db/schema.ts server/src/db/notification-schema.spec.ts server/test/notification-schema.integration.ts`. `corepack pnpm db:generate` reported no schema changes after generation and `corepack pnpm db:migrate` completed.

Next: Task 133, create in-app notifications for required transitions using the persisted event key. Tasks 134–149 remain open.
