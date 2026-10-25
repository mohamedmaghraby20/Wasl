import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import type { Database } from '../src/db/database.module';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { NotificationEmailWorker } from '../src/modules/notifications/notification-email.worker';
import type { ResendEmailAdapter } from '../src/modules/notifications/resend-email.adapter';
import type { ConfigService } from '@nestjs/config';
import { ParticipationService } from '../src/modules/participation/participation.service';
import type { CommunitiesService } from '../src/modules/communities/communities.service';
import type { EventsService } from '../src/modules/events/events.service';
import { EventsService as EventManagementService } from '../src/modules/events/events.service';
import type { OrganizationsService } from '../src/modules/organizations/organizations.service';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for notification checks.');
const rollback = new Error('Rollback notification fixtures');

async function main(): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    await assert.rejects(
      drizzle(pool, { schema }).transaction(async (tx) => {
        const recipient = randomUUID();
        const stranger = randomUUID();
        for (const id of [recipient, stranger]) {
          await tx.execute(
            sql`insert into identity.users (id, normalized_email) values (${id}, ${`notice-${id}@example.test`})`,
          );
        }
        const service = new NotificationsService(tx as unknown as Database);
        const event = {
          recipientUserId: recipient,
          eventKey: `event-transition:${randomUUID()}`,
          type: 'event_accepted',
          contextType: 'event' as const,
          contextId: randomUUID(),
        };
        const id = await service.create(tx, event);
        assert.ok(id);
        assert.equal(await service.create(tx, event), null, 'replay cannot duplicate notification');
        assert.equal((await service.list(recipient)).length, 1);
        assert.equal((await service.list(stranger)).length, 0);
        assert.equal(await service.markRead(stranger, id), null, 'other user cannot mark read');
        const read = await service.markRead(recipient, id);
        assert.ok(read?.readAt);
        assert.equal(
          (await service.markRead(recipient, id))?.readAt?.getTime(),
          read.readAt?.getTime(),
        );
        const [stored] = await tx
          .select()
          .from(schema.notifications)
          .where(eq(schema.notifications.id, id));
        assert.equal(stored?.recipientUserId, recipient);

        const eventId = randomUUID();
        await tx.execute(sql`insert into public.events
          (id, slug, title, description, host_type, host_id, host_name, online, starts_at, admission_mode)
          values (${eventId}, ${eventId}, 'Notification test', '', 'user', ${stranger}, 'Organizer', true, '2099-01-01T00:00:00Z', 'approval')`);
        const participation = new ParticipationService(
          tx as unknown as Database,
          {} as CommunitiesService,
          { assertCanManageById: () => Promise.resolve({ id: eventId }) } as unknown as EventsService,
          undefined,
          service,
        );
        const member = { id: recipient, authUserId: 'member' };
        const organizer = { id: stranger, authUserId: 'organizer' };
        assert.equal((await participation.registerForEvent(member, eventId)).status, 'PENDING');
        const [registration] = await tx
          .select({ id: schema.eventRegistrations.id })
          .from(schema.eventRegistrations)
          .where(eq(schema.eventRegistrations.eventId, eventId));
        assert.ok(registration);
        assert.equal(
          (await participation.decideEvent(organizer, eventId, registration.id, 'approve')).status,
          'ACCEPTED',
        );
        const outcomes = await service.list(recipient);
        assert.equal(
          outcomes.filter((row) => row.type === 'event_accepted' && row.contextId === eventId)
            .length,
          1,
        );
        assert.ok(outcomes.some((row) => row.href === `/events/${eventId}`));
        assert.equal((await service.list(stranger)).length, 0);
        const pendingUser = randomUUID();
        const waitlistedUser = randomUUID();
        for (const other of [pendingUser, waitlistedUser]) {
          await tx.execute(sql`insert into identity.users (id, normalized_email) values (${other}, ${`notice-${other}@example.test`})`);
        }
        await tx.insert(schema.eventRegistrations).values([
          { eventId, userId: pendingUser, status: 'PENDING' },
          { eventId, userId: waitlistedUser, status: 'WAITLISTED' },
        ]);
        const eventManagement = new EventManagementService(
          tx as unknown as Database,
          {} as CommunitiesService,
          {} as OrganizationsService,
          service,
        );
        await eventManagement.cancel(organizer, eventId);
        await eventManagement.cancel(organizer, eventId);
        for (const expectedRecipient of [recipient, pendingUser, waitlistedUser]) {
          const rows = await service.list(expectedRecipient);
          assert.equal(rows.filter((row) => row.type === 'event_cancelled' && row.contextId === eventId).length, 1);
        }
        const [notice] = await tx
          .select({ id: schema.notifications.id })
          .from(schema.notifications)
          .where(eq(schema.notifications.contextId, eventId));
        assert.ok(notice);
        const [queued] = await tx
          .select()
          .from(schema.notificationEmailDeliveries)
          .where(eq(schema.notificationEmailDeliveries.notificationId, notice.id));
        assert.equal(queued?.status, 'PENDING');
        const sentMessages: Array<{ text: string }> = [];
        const worker = new NotificationEmailWorker(
          tx as unknown as Database,
          { get: () => 'http://localhost:5173' } as unknown as ConfigService,
          { send: (input: { text: string }) => {
            sentMessages.push(input);
            return Promise.resolve('mock-provider-id');
          } } as unknown as ResendEmailAdapter,
        );
        await worker.processPending();
        const [sent] = await tx
          .select()
          .from(schema.notificationEmailDeliveries)
          .where(eq(schema.notificationEmailDeliveries.notificationId, notice.id));
        assert.equal(sent?.status, 'SENT');
        assert.equal(sent?.attemptCount, 1);
        assert.equal(sent?.providerMessageId, 'mock-provider-id');
        assert.ok(sentMessages.some((message) => message.text.includes(`/events/${eventId}`)));
        const retryId = await service.create(tx, {
          ...event,
          eventKey: `event-transition:${randomUUID()}`,
          contextId: eventId,
        }, true);
        assert.ok(retryId);
        const failingWorker = new NotificationEmailWorker(
          tx as unknown as Database,
          { get: () => 'http://localhost:5173' } as unknown as ConfigService,
          { send: () => Promise.reject(new Error('simulated provider outage')) } as unknown as ResendEmailAdapter,
        );
        await failingWorker.processPending();
        const [retry] = await tx.select().from(schema.notificationEmailDeliveries)
          .where(eq(schema.notificationEmailDeliveries.notificationId, retryId));
        assert.equal(retry?.status, 'RETRY');
        assert.equal(retry?.attemptCount, 1);
        assert.ok(retry.nextAttemptAt > new Date());
        throw rollback;
      }),
      (error: unknown) => error === rollback,
    );
    console.log('Notification creation, replay, owner listing and read access passed.');
  } finally {
    await pool.end();
  }
}

void main();
