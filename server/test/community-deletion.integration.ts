import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import type { Database } from '../src/db/database.module';
import { CommunityDeletionService } from '../src/modules/communities/community-deletion.service';
import { ChannelDeletionService } from '../src/modules/messaging/channel-deletion.service';
import type { StreamChatAdapter } from '../src/modules/messaging/stream-chat.adapter';
import type { OrganizationsService } from '../src/modules/organizations/organizations.service';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  const rollback = new Error('Rollback isolated deletion fixtures');
  try {
    await drizzle(client, { schema }).transaction(async (tx) => {
      const columns = await client.query(
        "select 1 from information_schema.columns where table_schema='public' and table_name='messaging_conversations' and column_name='deleted_at'",
      );
      if (!columns.rowCount) {
        const migration = await readFile('drizzle/0023_crazy_shockwave.sql', 'utf8');
        await client.query(migration.replaceAll('--> statement-breakpoint', ''));
      }
      const owner = randomUUID();
      const member = randomUUID();
      const community = `delete-check-${randomUUID()}`;
      const untouched = `keep-check-${randomUUID()}`;
      const event = randomUUID();
      const membership = randomUUID();
      const registration = randomUUID();
      const topic = randomUUID();
      const eventThread = randomUUID();
      const root = randomUUID();
      const communityChat = randomUUID();
      const eventChat = randomUUID();
      const notice = randomUUID();
      const report = randomUUID();
      const chatReport = randomUUID();
      const city = randomUUID();
      await client.query(
        'insert into identity.users (id, normalized_email) values ($1,$2),($3,$4)',
        [owner, `${owner}@example.test`, member, `${member}@example.test`],
      );
      await client.query(
        'insert into public.cities (id,name_tr,name_ar,name_en) values ($1,$1,$1,$1)',
        [city],
      );
      await client.query(
        `insert into public.communities (id,slug,name,description,city_id,owner_type,owner_id,host_name,admission_mode) values ($1,$1,'Delete fixture','Test',$3,'user',$4,'Host','approval'),($2,$2,'Keep fixture','Test',$3,'user',$4,'Host','open')`,
        [community, untouched, city, owner],
      );
      await client.query(
        `insert into public.events (id,slug,title,description,host_type,host_id,community_id,host_name,online,starts_at,admission_mode) values ($1,$1,'Owned event','Test','community',$2,$2,'Host',true,now(),'approval')`,
        [event, community],
      );
      await client.query(
        `insert into public.community_memberships (id,community_id,user_id,status) values ($1,$2,$3,'ACTIVE')`,
        [membership, community, member],
      );
      await client.query(
        `insert into public.community_membership_transitions (membership_id,to_status,actor_user_id) values ($1,'ACTIVE',$2)`,
        [membership, owner],
      );
      await client.query(
        `insert into public.event_registrations (id,event_id,user_id,status) values ($1,$2,$3,'ACCEPTED')`,
        [registration, event, member],
      );
      await client.query(
        `insert into public.event_registration_transitions (registration_id,to_status,actor_user_id) values ($1,'ACCEPTED',$2)`,
        [registration, owner],
      );
      await client.query(
        `insert into public.discussion_threads (id,community_id,author_user_id,title,body) values ($1,$2,$3,'Topic','Body')`,
        [topic, community, owner],
      );
      await client.query('insert into public.discussion_threads (id,event_id) values ($1,$2)', [
        eventThread,
        event,
      ]);
      await client.query(
        `insert into public.discussion_posts (id,thread_id,author_user_id,body) values ($1,$2,$3,'Root')`,
        [root, topic, owner],
      );
      await client.query(
        `insert into public.discussion_posts (thread_id,author_user_id,body,depth,parent_id,parent_depth) values ($1,$2,'Reply',1,$3,0)`,
        [topic, member, root],
      );
      await client.query(
        `insert into public.discussion_posts (thread_id,author_user_id,body) values ($1,$2,'Event post')`,
        [eventThread, member],
      );
      await client.query(
        `insert into public.resource_moderators (community_id,user_id,assigned_by_user_id) values ($1,$2,$3)`,
        [community, member, owner],
      );
      await client.query(
        `insert into public.resource_moderators (event_id,user_id,assigned_by_user_id) values ($1,$2,$3)`,
        [event, member, owner],
      );
      await client.query(
        `insert into public.messaging_conversations (id,kind,community_id,provider_channel_id) values ($1,'community',$2,$3)`,
        [communityChat, community, `fixture_${communityChat}`],
      );
      await client.query(
        `insert into public.messaging_conversations (id,kind,event_id,provider_channel_id) values ($1,'event',$2,$3)`,
        [eventChat, event, `fixture_${eventChat}`],
      );
      await client.query(
        'insert into public.messaging_member_sync (conversation_id,user_id) values ($1,$3),($2,$3)',
        [communityChat, eventChat, member],
      );
      await client.query(
        `insert into public.moderation_reports (id,reporter_user_id,target_type,target_id,reason) values ($1,$2,'community',$3,'Test report')`,
        [report, member, community],
      );
      await client.query(
        `insert into public.messaging_reports (id,reporter_user_id,conversation_id,reason) values ($1,$2,$3,'Test chat report')`,
        [chatReport, member, communityChat],
      );
      await client.query(
        `insert into public.notifications (id,recipient_user_id,event_key,type,context_type,context_id) values ($1::uuid,$2,$1::uuid::text,'MEMBERSHIP_APPROVED','community',$3)`,
        [notice, member, community],
      );
      await client.query(
        'insert into public.notification_email_deliveries (notification_id) values ($1)',
        [notice],
      );

      let failProvider = true;
      const deletedChannels: string[] = [];
      const stream = {
        deleteChannel: (id: string) => {
          if (failProvider && id === `fixture_${communityChat}`)
            return Promise.reject(new Error('Mock provider unavailable'));
          deletedChannels.push(id);
          return Promise.resolve();
        },
      } as unknown as StreamChatAdapter;
      const cleanup = new ChannelDeletionService(tx as unknown as Database, stream);
      const organizations = {
        assertCanManageOrganization: () => Promise.reject(new ForbiddenException()),
      } as unknown as OrganizationsService;
      const service = new CommunityDeletionService(
        tx as unknown as Database,
        organizations,
        cleanup,
      );
      await assert.rejects(
        service.remove({ id: member, authUserId: member }, community, 'Delete fixture'),
        NotFoundException,
      );
      await assert.rejects(
        service.remove({ id: owner, authUserId: owner }, community, 'wrong name'),
        BadRequestException,
      );
      assert.equal(
        (await client.query('select 1 from public.events where id=$1', [event])).rowCount,
        1,
      );

      // A mid-transaction failure must leave every fixture intact, with no provider calls.
      await client.query(
        `create function pg_temp.reject_fixture_delete() returns trigger language plpgsql as $$ begin raise exception 'fixture deletion failure'; end $$`,
      );
      await client.query(
        'create trigger deletion_test_failure before delete on public.community_categories for each statement execute function pg_temp.reject_fixture_delete()',
      );
      await assert.rejects(
        service.remove({ id: owner, authUserId: owner }, community, 'Delete fixture'),
      );
      assert.equal(
        (await client.query('select 1 from public.events where id=$1', [event])).rowCount,
        1,
      );
      assert.equal(
        (await client.query('select 1 from public.discussion_posts where id=$1', [root])).rowCount,
        1,
      );
      assert.equal(deletedChannels.length, 0);
      await client.query('drop trigger deletion_test_failure on public.community_categories');

      const result = await service.remove(
        { id: owner, authUserId: owner },
        community,
        'Delete fixture',
      );
      assert.deepEqual(result, { id: community, chatCleanupPending: true });
      const absent = [
        ['communities', 'id', community],
        ['events', 'id', event],
        ['community_memberships', 'id', membership],
        ['community_membership_transitions', 'membership_id', membership],
        ['event_registrations', 'id', registration],
        ['event_registration_transitions', 'registration_id', registration],
        ['discussion_threads', 'id', topic],
        ['discussion_threads', 'id', eventThread],
        ['discussion_posts', 'thread_id', topic],
        ['resource_moderators', 'community_id', community],
        ['resource_moderators', 'event_id', event],
        ['messaging_member_sync', 'conversation_id', communityChat],
        ['notifications', 'id', notice],
        ['notification_email_deliveries', 'notification_id', notice],
      ];
      for (const [table, column, value] of absent)
        assert.equal(
          (await client.query(`select 1 from public.${table} where ${column}=$1`, [value]))
            .rowCount,
          0,
          table,
        );
      assert.equal(
        (await client.query('select 1 from public.communities where id=$1', [untouched])).rowCount,
        1,
      );
      assert.equal(
        (await client.query('select 1 from identity.users where id in ($1,$2)', [owner, member]))
          .rowCount,
        2,
      );
      assert.equal(
        (
          await client.query(
            'select 1 from public.moderation_reports where id=$1 and target_id=$2',
            [report, community],
          )
        ).rowCount,
        1,
      );
      assert.equal(
        (
          await client.query(
            'select 1 from public.messaging_reports where id=$1 and conversation_id=$2',
            [chatReport, communityChat],
          )
        ).rowCount,
        1,
      );
      failProvider = false;
      assert.equal(await cleanup.process([communityChat, eventChat]), false);
      const tombstones = await client.query(
        'select * from public.messaging_conversations where id in ($1,$2)',
        [communityChat, eventChat],
      );
      assert.equal(tombstones.rowCount, 2);
      for (const row of tombstones.rows as {
        deleted_at: Date;
        provider_deleted_at: Date;
        community_id: null;
        event_id: null;
      }[]) {
        assert.ok(row.deleted_at && row.provider_deleted_at);
        assert.equal(row.community_id, null);
        assert.equal(row.event_id, null);
      }
      assert.equal(deletedChannels.length, 2);
      console.log(
        'Verified permanent community deletion, exact-name/owner authorization, transaction rollback, related-history cleanup, unchanged accounts/reports, and durable mocked chat cleanup retries. All fixtures and test DDL rolled back.',
      );
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
