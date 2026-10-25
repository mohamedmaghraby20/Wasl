import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for notification schema checks.');
const rollback = new Error('Rollback notification fixtures');

async function main(): Promise<void> {
  const pool = new Pool({ connectionString, max: 2 });
  try {
    const db = drizzle(pool, { schema });
    await assert.rejects(
      db.transaction(async (tx) => {
        const recipient = randomUUID();
        const otherRecipient = randomUUID();
        for (const id of [recipient, otherRecipient]) {
          await tx.execute(
            sql`insert into identity.users (id, normalized_email) values (${id}, ${`notification-${id}@example.test`})`,
          );
        }

        const eventKey = `membership-transition:${randomUUID()}`;
        const values = {
          recipientUserId: recipient,
          eventKey,
          type: 'membership_accepted',
          contextType: 'community',
          contextId: randomUUID(),
        };
        const [created] = await tx.insert(schema.notifications).values(values).returning();
        assert.ok(created);
        const duplicate = await tx
          .insert(schema.notifications)
          .values(values)
          .onConflictDoNothing()
          .returning();
        assert.equal(duplicate.length, 0, 'replayed event must not add a notification');
        const [other] = await tx
          .insert(schema.notifications)
          .values({ ...values, recipientUserId: otherRecipient })
          .returning();
        assert.ok(other, 'a distinct recipient must still receive the event');

        const [delivery] = await tx
          .insert(schema.notificationEmailDeliveries)
          .values({ notificationId: created.id })
          .returning();
        assert.equal(delivery?.status, 'PENDING');
        assert.equal(delivery?.attemptCount, 0);
        assert.equal(delivery?.sentAt, null);
        const duplicateDelivery = await tx
          .insert(schema.notificationEmailDeliveries)
          .values({ notificationId: created.id })
          .onConflictDoNothing()
          .returning();
        assert.equal(
          duplicateDelivery.length,
          0,
          'replayed event must not enqueue a second delivery',
        );
        const [retry] = await tx
          .update(schema.notificationEmailDeliveries)
          .set({ status: 'RETRY', attemptCount: 1, lastAttemptAt: new Date() })
          .where(eq(schema.notificationEmailDeliveries.notificationId, created.id))
          .returning();
        assert.equal(retry?.status, 'RETRY');

        const security = await tx.execute(sql`select c.relname, c.relrowsecurity,
          has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
          has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
          has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert
          from pg_class c where c.oid in ('public.notifications'::regclass, 'public.notification_email_deliveries'::regclass)`);
        assert.equal(security.rows.length, 2);
        for (const row of security.rows) {
          assert.equal(row.relrowsecurity, true, `${String(row.relname)} must enable RLS`);
          assert.equal(row.anon_select, false);
          assert.equal(row.authenticated_select, false);
          assert.equal(row.authenticated_insert, false);
        }
        throw rollback;
      }),
      (error: unknown) => error === rollback,
    );
    console.log('Notification schema idempotency, retry state and client isolation passed.');
  } finally {
    await pool.end();
  }
}

void main();
