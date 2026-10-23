import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import type { Database } from '../src/db/database.module';
import type { CommunitiesService } from '../src/modules/communities/communities.service';
import type { EventsService } from '../src/modules/events/events.service';
import { MessagingService } from '../src/modules/messaging/messaging.service';
import type { StreamChatAdapter } from '../src/modules/messaging/stream-chat.adapter';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for messaging database checks.');
const rollback = new Error('Rollback messaging fixtures');

async function main(): Promise<void> {
  const pool = new Pool({ connectionString, max: 2 });
  try {
    const db = drizzle(pool, { schema });
    await assert.rejects(
      db.transaction(async (tx) => {
        const [ownerId, activeId, pendingId] = [randomUUID(), randomUUID(), randomUUID()];
        const eventId = randomUUID();
        const communityId = randomUUID();
        const cityId = randomUUID();
        for (const id of [ownerId, activeId, pendingId]) {
          await tx.execute(
            sql`insert into identity.users (id, normalized_email) values (${id}, ${`messaging-${id}@example.test`})`,
          );
          await tx.execute(
            sql`insert into identity.profiles (id, display_name) values (${id}, 'Member')`,
          );
        }
        await tx.execute(
          sql`insert into public.cities (id, name_tr, name_ar, name_en) values (${cityId}, ${cityId}, ${cityId}, ${cityId})`,
        );
        await tx.execute(sql`insert into public.communities
        (id, slug, name, description, city_id, owner_type, owner_id, host_name, admission_mode)
        values (${communityId}, ${communityId}, 'Messaging community', '', ${cityId}, 'user', ${ownerId}, 'Owner', 'open')`);
        await tx.execute(sql`insert into public.events
        (id, slug, title, description, host_type, host_id, host_name, online, starts_at, admission_mode)
        values (${eventId}, ${eventId}, 'Messaging event', '', 'user', ${ownerId}, 'Owner', true, now(), 'instant')`);
        await tx.execute(sql`insert into public.community_memberships (community_id, user_id, status)
        values (${communityId}, ${activeId}, 'ACTIVE'), (${communityId}, ${pendingId}, 'PENDING')`);
        await tx.execute(sql`insert into public.event_registrations (event_id, user_id, status)
        values (${eventId}, ${activeId}, 'ACCEPTED'), (${eventId}, ${pendingId}, 'WAITLISTED')`);

        const memberships = new Set<string>();
        let removeFails = false;
        const provider = {
          apiKey: 'test-key',
          upsertUser: () => Promise.resolve(),
          ensureChannel: () => Promise.resolve(),
          setMemberRole: (channelId: string, userId: string) => {
            memberships.add(`${channelId}:${userId}`);
            return Promise.resolve();
          },
          addMember: (channelId: string, userId: string) => {
            memberships.add(`${channelId}:${userId}`);
            return Promise.resolve();
          },
          removeMember: (channelId: string, userId: string) => {
            if (removeFails) return Promise.reject(new Error('simulated provider outage'));
            memberships.delete(`${channelId}:${userId}`);
            return Promise.resolve();
          },
        } as unknown as StreamChatAdapter;
        const config = { get: () => 'true' } as unknown as ConfigService;
        const communities = {
          assertCanManage: (userId: string) =>
            userId === ownerId
              ? Promise.resolve({ id: communityId })
              : Promise.reject(new ForbiddenException()),
        } as unknown as CommunitiesService;
        const events = {
          assertCanManageById: (user: { id: string }) =>
            user.id === ownerId
              ? Promise.resolve({ id: eventId })
              : Promise.reject(new ForbiddenException()),
        } as unknown as EventsService;
        const service = new MessagingService(
          tx as unknown as Database,
          config,
          provider,
          communities,
          events,
        );
        const active = { id: activeId, authUserId: 'active' };
        const pending = { id: pendingId, authUserId: 'pending' };
        const owner = { id: ownerId, authUserId: 'owner' };

        await assert.rejects(
          service.openResourceChannel(pending, 'community', communityId),
          ForbiddenException,
        );
        await assert.rejects(
          service.openResourceChannel(pending, 'event', eventId),
          ForbiddenException,
        );
        assert.equal(memberships.size, 0);
        const communityChannel = await service.openResourceChannel(
          active,
          'community',
          communityId,
        );
        assert.equal(communityChannel.channelType, 'messaging');
        await service.openResourceChannel(owner, 'community', communityId);
        const eventChannel = await service.openResourceChannel(active, 'event', eventId);
        assert.equal(memberships.size, 3);
        assert.notEqual(eventChannel.channelId, communityChannel.channelId);

        await tx.execute(
          sql`update public.community_memberships set status = 'LEFT' where community_id = ${communityId} and user_id = ${activeId}`,
        );
        removeFails = true;
        assert.equal(await service.reconcileResourceAccess('community', communityId), true);
        const [syncState] = await tx
          .select({
            desired: schema.messagingMemberSync.desiredMember,
            provider: schema.messagingMemberSync.providerMember,
            error: schema.messagingMemberSync.lastError,
          })
          .from(schema.messagingMemberSync)
          .innerJoin(
            schema.messagingConversations,
            eq(schema.messagingConversations.id, schema.messagingMemberSync.conversationId),
          )
          .where(
            and(
              eq(schema.messagingConversations.communityId, communityId),
              eq(schema.messagingMemberSync.userId, activeId),
            ),
          )
          .limit(1);
        assert.equal(syncState?.desired, false);
        assert.equal(syncState?.provider, true);
        assert.ok(syncState?.error);
        removeFails = false;
        await service.reconcilePendingMemberships();
        const [synced] = await tx
          .select({
            desired: schema.messagingMemberSync.desiredMember,
            provider: schema.messagingMemberSync.providerMember,
          })
          .from(schema.messagingMemberSync)
          .innerJoin(
            schema.messagingConversations,
            eq(schema.messagingConversations.id, schema.messagingMemberSync.conversationId),
          )
          .where(
            and(
              eq(schema.messagingConversations.communityId, communityId),
              eq(schema.messagingMemberSync.userId, activeId),
            ),
          )
          .limit(1);
        assert.equal(synced?.desired, false);
        assert.equal(synced?.provider, false);

        const dm = await service.createDirectMessage(active, ownerId);
        assert.equal(dm.channelType, 'messaging');
        assert.equal(memberships.size, 4);
        await assert.rejects(service.createDirectMessage(active, activeId), ForbiddenException);
        const [lowId, highId] = ownerId < activeId ? [ownerId, activeId] : [activeId, ownerId];
        const [dmConversation] = await tx
          .select({ id: schema.messagingConversations.id })
          .from(schema.messagingConversations)
          .where(
            and(
              eq(schema.messagingConversations.dmUserLowId, lowId),
              eq(schema.messagingConversations.dmUserHighId, highId),
            ),
          )
          .limit(1);
        assert.ok(dmConversation?.id);
        const blockResult = await service.setBlock(active, ownerId, true);
        assert.deepEqual(blockResult, { blocked: true, syncPending: false });
        assert.equal(
          memberships.has(`${dm.channelId}:wasl_${activeId.replaceAll('-', '')}`),
          false,
        );
        assert.equal(memberships.has(`${dm.channelId}:wasl_${ownerId.replaceAll('-', '')}`), false);
        await assert.rejects(service.createDirectMessage(active, ownerId), ForbiddenException);
        await service.reportConversation(active, dmConversation.id, 'Unwanted message');
        const reports = await tx
          .select({ reporter: schema.messagingReports.reporterUserId })
          .from(schema.messagingReports)
          .where(eq(schema.messagingReports.conversationId, dmConversation.id));
        assert.equal(reports.length, 1);
        const unblockResult = await service.setBlock(active, ownerId, false);
        assert.deepEqual(unblockResult, { blocked: false, syncPending: false });
        assert.equal(memberships.has(`${dm.channelId}:wasl_${activeId.replaceAll('-', '')}`), true);

        const security = await tx.execute<{ name: string; rls: boolean }>(sql`
        select relname as name, relrowsecurity as rls from pg_class where oid in
        ('public.messaging_conversations'::regclass, 'public.messaging_user_mappings'::regclass,
         'public.messaging_member_sync'::regclass, 'public.messaging_user_blocks'::regclass,
         'public.messaging_reports'::regclass)`);
        assert.equal(security.rows.length, 5);
        assert.ok(security.rows.every((row) => row.rls));
        const grants = await tx.execute<{ grants: number }>(sql`
        select count(*)::int as grants from information_schema.role_table_grants
        where table_schema = 'public' and table_name in ('messaging_conversations', 'messaging_user_mappings', 'messaging_member_sync', 'messaging_user_blocks', 'messaging_reports')
        and grantee in ('PUBLIC', 'anon', 'authenticated')`);
        assert.equal(grants.rows[0]?.grants, 0);
        throw rollback;
      }),
      (error: unknown) => error === rollback,
    );
    console.log('Messaging mapping, RLS, and channel eligibility verified; fixtures rolled back.');
  } finally {
    await pool.end();
  }
}

void main();
