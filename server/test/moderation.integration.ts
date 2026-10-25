import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { ModerationService } from '../src/modules/moderation/moderation.service';
import type { Database } from '../src/db/database.module';
import type { CommunitiesService } from '../src/modules/communities/communities.service';
import type { EventsService } from '../src/modules/events/events.service';
import { ForbiddenException } from '@nestjs/common';
import { NotificationsService } from '../src/modules/notifications/notifications.service';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for moderation checks.');
const rollback = new Error('Rollback moderation fixtures');

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await assert.rejects(
      drizzle(pool, { schema }).transaction(async (tx) => {
        const reporter = randomUUID();
        const target = randomUUID();
        for (const id of [reporter, target]) {
          await tx.execute(
            sql`insert into identity.users (id, normalized_email) values (${id}, ${`report-${id}@example.test`})`,
          );
        }
        const service = new ModerationService(
          tx as unknown as Database,
          {} as CommunitiesService,
          {
            assertCanManageById: (actor: { id: string }) =>
              actor.id === reporter
                ? Promise.resolve({})
                : Promise.reject(new ForbiddenException()),
          } as unknown as EventsService,
          new NotificationsService(tx as unknown as Database),
        );
        await assert.rejects(
          service.report(reporter, { targetType: 'user', targetId: reporter, reason: 'Self' }),
          /cannot report yourself/,
        );
        await assert.rejects(
          service.report(reporter, {
            targetType: 'user',
            targetId: randomUUID(),
            reason: 'Missing',
          }),
          /not found/,
        );
        const result = await service.report(reporter, {
          targetType: 'user',
          targetId: target,
          reason: '  Spam  ',
        });
        const [stored] = await tx.select().from(schema.moderationReports);
        assert.equal(result.id, stored?.id);
        assert.equal(stored?.reporterUserId, reporter);
        assert.equal(stored?.targetId, target);
        assert.equal(stored?.reason, 'Spam');
        await assert.rejects(
          service.decideReport(reporter, result.id, { action: 'CANCEL_EVENT' }),
          /does not match/,
        );
        await assert.rejects(
          service.decideReport(target, result.id, { action: 'SUSPEND_USER' }),
          ForbiddenException,
        );
        const decision = await service.decideReport(reporter, result.id, {
          action: 'SUSPEND_USER',
          note: 'Spam',
        });
        assert.equal(decision.decidedByUserId, reporter);
        assert.equal(decision.status, 'ACTIONED');
        assert.equal(
          (
            await tx
              .select({ status: schema.users.accountStatus })
              .from(schema.users)
              .where(eq(schema.users.id, target))
          )[0]?.status,
          'SUSPENDED',
        );
        await assert.rejects(
          service.decideReport(reporter, result.id, { action: 'DISMISSED' }),
          /already been reviewed/,
        );
        const second = await service.report(reporter, {
          targetType: 'user',
          targetId: target,
          reason: 'Appeal',
        });
        await service.decideReport(reporter, second.id, { action: 'RESTORE_USER' });
        assert.equal(
          (
            await tx
              .select({ status: schema.users.accountStatus })
              .from(schema.users)
              .where(eq(schema.users.id, target))
          )[0]?.status,
          'ACTIVE',
        );
        const eventId = randomUUID();
        await tx.execute(sql`insert into public.events
        (id, slug, title, description, host_type, host_id, host_name, online, starts_at, admission_mode)
        values (${eventId}, ${eventId}, 'Moderator test', '', 'user', ${reporter}, 'Organizer', true, '2099-01-01T00:00:00Z', 'instant')`);
        await tx
          .insert(schema.eventRegistrations)
          .values({ eventId, userId: target, status: 'ACCEPTED' });
        await assert.rejects(
          service.assignModerator(target, 'event', eventId, reporter),
          ForbiddenException,
        );
        await service.assignModerator(reporter, 'event', eventId, target);
        await service.assignModerator(reporter, 'event', eventId, target);
        assert.equal((await service.listModerators(reporter, 'event', eventId)).length, 1);
        assert.equal(await service.isModerator(target, 'event', eventId), true);
        assert.equal((await service.permissions(target, 'event', eventId)).manager, false);
        assert.equal((await service.permissions(target, 'event', eventId)).moderator, true);
        const unrelatedEventId = randomUUID();
        await tx.execute(sql`insert into public.events
        (id, slug, title, description, host_type, host_id, host_name, online, starts_at, admission_mode)
        values (${unrelatedEventId}, ${unrelatedEventId}, 'Other event', '', 'user', ${reporter}, 'Organizer', true, '2099-01-01T00:00:00Z', 'instant')`);
        await tx.insert(schema.eventRegistrations).values({
          eventId: unrelatedEventId,
          userId: target,
          status: 'ACCEPTED',
        });
        assert.equal(
          await service.isModerator(target, 'event', unrelatedEventId),
          false,
          'moderator permissions must not transfer between Events',
        );
        await tx
          .update(schema.users)
          .set({ accountStatus: 'SUSPENDED' })
          .where(eq(schema.users.id, target));
        assert.equal(await service.isModerator(target, 'event', eventId), false);
        await tx
          .update(schema.users)
          .set({ accountStatus: 'ACTIVE' })
          .where(eq(schema.users.id, target));
        await tx
          .update(schema.eventRegistrations)
          .set({ status: 'CANCELLED_BY_USER' })
          .where(eq(schema.eventRegistrations.userId, target));
        assert.equal(
          await service.isModerator(target, 'event', eventId),
          false,
          'registration revocation must remove moderator powers',
        );
        await tx
          .update(schema.eventRegistrations)
          .set({ status: 'ACCEPTED' })
          .where(eq(schema.eventRegistrations.userId, target));
        await service.removeModerator(reporter, 'event', eventId, target);
        assert.equal(await service.isModerator(target, 'event', eventId), false);
        const security = await tx.execute(sql`select relrowsecurity,
        has_table_privilege('anon', 'public.moderation_reports', 'SELECT') as anon_select,
        has_table_privilege('authenticated', 'public.moderation_reports', 'INSERT') as authenticated_insert
        from pg_class where oid = 'public.moderation_reports'::regclass`);
        assert.equal(security.rows[0]?.relrowsecurity, true);
        assert.equal(security.rows[0]?.anon_select, false);
        assert.equal(security.rows[0]?.authenticated_insert, false);
        throw rollback;
      }),
      (error: unknown) => error === rollback,
    );
    console.log(
      'Moderation reports persist scoped actor/target; invalid targets and client access denied.',
    );
  } finally {
    await pool.end();
  }
}

void main();
