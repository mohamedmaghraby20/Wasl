import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import type { Database } from '../src/db/database.module';
import type { EventsService } from '../src/modules/events/events.service';
import type { CommunitiesService } from '../src/modules/communities/communities.service';
import { DiscussionsService } from '../src/modules/discussions/discussions.service';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for discussion posting checks.');

const rollback = new Error('Rollback discussion fixtures');
async function main(): Promise<void> {
  const pool = new Pool({ connectionString, max: 2 });
  try {
    const db = drizzle(pool, { schema });
    await assert.rejects(
      db.transaction(async (tx) => {
        const eventId = randomUUID();
        const acceptedId = randomUUID();
        const pendingId = randomUUID();
        const managerId = randomUUID();
        for (const id of [acceptedId, pendingId, managerId]) {
          await tx.execute(
            sql`insert into identity.users (id, normalized_email) values (${id}, ${`discussion-${id}@example.test`})`,
          );
          await tx.execute(
            sql`insert into identity.profiles (id, display_name) values (${id}, ${`Author ${id}`})`,
          );
        }
        await tx.execute(sql`insert into public.events
          (id, slug, title, description, visibility, host_type, host_id, host_name, online, starts_at, admission_mode)
          values (${eventId}, ${eventId}, 'Discussion event', '', 'unlisted', 'user', ${managerId}, 'Manager', true, now(), 'instant')`);
        await tx.execute(sql`insert into public.event_registrations (event_id, user_id, status)
          values (${eventId}, ${acceptedId}, 'ACCEPTED'), (${eventId}, ${pendingId}, 'PENDING')`);

        const manager = {
          assertCanManageById: (user: { id: string }) =>
            user.id === managerId ? Promise.resolve() : Promise.reject(new ForbiddenException()),
        } as unknown as EventsService;
        const communityManager = {
          assertCanManage: (userId: string) =>
            userId === managerId
              ? Promise.resolve({ id: 'managed', name: 'Community' })
              : Promise.reject(new ForbiddenException()),
        } as unknown as CommunitiesService;
        const service = new DiscussionsService(
          tx as unknown as Database,
          manager,
          communityManager,
        );
        const accepted = { id: acceptedId, authUserId: 'accepted' };
        const pending = { id: pendingId, authUserId: 'pending' };
        const organizer = { id: managerId, authUserId: 'organizer' };

        await assert.rejects(
          service.createEventPost(pending, eventId, { body: 'Not eligible' }),
          ForbiddenException,
        );
        const root = await service.createEventPost(accepted, eventId, { body: 'First comment' });
        assert.equal(root.authorId, acceptedId);
        assert.equal(root.body, 'First comment');
        const reply = await service.createEventPost(accepted, eventId, {
          body: 'First reply',
          parentId: root.id,
        });
        assert.equal(reply.parentId, root.id);
        await assert.rejects(
          service.createEventPost(accepted, eventId, { body: 'Too deep', parentId: reply.id }),
        );
        await assert.rejects(
          service.moderatePost(pending, 'event', eventId, root.id),
          ForbiddenException,
        );
        const edited = await service.moderatePost(accepted, 'event', eventId, root.id, {
          body: 'Edited comment',
        });
        assert.equal(edited.body, 'Edited comment');
        await tx.execute(sql`update public.event_registrations set status = 'REMOVED_BY_ORGANIZER'
          where event_id = ${eventId} and user_id = ${acceptedId}`);
        await assert.rejects(
          service.moderatePost(accepted, 'event', eventId, root.id, { body: 'No access' }),
          ForbiddenException,
        );
        await service.moderatePost(organizer, 'event', eventId, root.id);
        const redacted = await service.eventPosts(eventId);
        assert.equal(redacted.items.find((post) => post.id === root.id)?.body, null);
        await service.moderatePost(organizer, 'event', eventId, reply.id);
        await tx.execute(sql`update public.events set cancelled = true where id = ${eventId}`);
        await assert.rejects(
          service.createEventPost(accepted, eventId, { body: 'After cancellation' }),
          ForbiddenException,
        );
        const organizerPost = await service.createEventPost(organizer, eventId, {
          body: 'Organizer update',
        });
        assert.equal(organizerPost.authorId, managerId);
        const page = await service.eventPosts(eventId);
        assert.equal(page.items.length, 3);

        const cityId = randomUUID();
        const communityId = randomUUID();
        await tx.execute(sql`insert into public.cities (id, name_tr, name_ar, name_en)
          values (${cityId}, ${cityId}, ${cityId}, ${cityId})`);
        await tx.execute(sql`insert into public.communities
          (id, slug, name, description, city_id, owner_type, owner_id, host_name, admission_mode)
          values (${communityId}, ${communityId}, 'Discussion community', '', ${cityId}, 'user', ${managerId}, 'Manager', 'open')`);
        await tx.execute(sql`insert into public.community_memberships (community_id, user_id, status)
          values (${communityId}, ${acceptedId}, 'ACTIVE'), (${communityId}, ${pendingId}, 'PENDING')`);
        await assert.rejects(
          service.createCommunityTopic(pending, communityId, {
            title: 'Denied',
            body: 'No access',
          }),
          ForbiddenException,
        );
        const topic = await service.createCommunityTopic(accepted, communityId, {
          title: 'Introductions',
          body: 'Say hello',
        });
        assert.equal(topic.authorId, acceptedId);
        const topicPage = await service.communityTopics(communityId);
        assert.equal(topicPage.items[0]?.id, topic.id);
        const topicPost = await service.createCommunityPost(accepted, communityId, topic.id, {
          body: 'Hello!',
        });
        assert.equal(topicPost.authorName, `Author ${acceptedId}`);
        await assert.rejects(
          service.createCommunityPost(pending, communityId, topic.id, { body: 'No' }),
          ForbiddenException,
        );
        const details = await service.communityTopic(communityId, topic.id);
        assert.equal(details.posts.items[0]?.body, 'Hello!');
        await assert.rejects(
          service.closeCommunityTopic(pending, communityId, topic.id),
          ForbiddenException,
        );
        const closed = await service.closeCommunityTopic(organizer, communityId, topic.id);
        assert.equal(closed.archived, true);
        await assert.rejects(
          service.createCommunityPost(accepted, communityId, topic.id, { body: 'Too late' }),
          ForbiddenException,
        );
        await assert.rejects(
          service.moderatePost(
            accepted,
            'community',
            communityId,
            topicPost.id,
            { body: 'Too late' },
            topic.id,
          ),
          ForbiddenException,
        );
        const moderatorRemoval = await service.moderatePost(
          organizer,
          'community',
          communityId,
          topicPost.id,
          undefined,
          topic.id,
        );
        assert.equal(moderatorRemoval.body, null);
        await tx.execute(
          sql`update public.communities set archived = true where id = ${communityId}`,
        );
        await assert.rejects(service.communityTopics(communityId));
        throw rollback;
      }),
      (error: unknown) => error === rollback,
    );
    console.log('Event discussion posting and authorization verified; fixtures rolled back.');
  } finally {
    await pool.end();
  }
}

void main();
