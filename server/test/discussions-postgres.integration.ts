import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import * as schema from '../src/db/schema';
import { DiscussionsService } from '../src/modules/discussions/discussions.service';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for discussion schema checks.');

async function rejectsConstraint(
  client: PoolClient,
  sql: string,
  params: unknown[],
): Promise<void> {
  await client.query('savepoint invalid_discussion');
  try {
    await assert.rejects(client.query(sql, params), (error: unknown) => {
      assert.equal((error as { code?: string }).code?.startsWith('23'), true);
      return true;
    });
  } finally {
    await client.query('rollback to savepoint invalid_discussion');
    await client.query('release savepoint invalid_discussion');
  }
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const userId = randomUUID();
    const eventId = randomUUID();
    const cityId = randomUUID();
    const communityId = randomUUID();
    await client.query('insert into identity.users (id, normalized_email) values ($1, $2)', [
      userId,
      `discussion-${userId}@example.test`,
    ]);
    await client.query('insert into identity.profiles (id, display_name) values ($1, $2)', [
      userId,
      'Test author',
    ]);
    await client.query(
      'insert into public.cities (id, name_tr, name_ar, name_en) values ($1, $1, $1, $1)',
      [cityId],
    );
    await client.query(
      `insert into public.events
        (id, slug, title, description, host_type, host_id, host_name, online, starts_at, admission_mode)
       values ($1, $1, 'Test event', '', 'user', $2, 'Test user', true, now(), 'instant')`,
      [eventId, userId],
    );
    await client.query(
      `insert into public.communities
        (id, slug, name, description, city_id, owner_type, owner_id, host_name, admission_mode)
       values ($1, $1, 'Test community', '', $2, 'user', $3, 'Test user', 'open')`,
      [communityId, cityId, userId],
    );
    const eventThread = randomUUID();
    const topic = randomUUID();
    await client.query('insert into public.discussion_threads (id, event_id) values ($1, $2)', [
      eventThread,
      eventId,
    ]);
    await client.query(
      `insert into public.discussion_threads (id, community_id, author_user_id, title, body)
       values ($1, $2, $3, 'Topic', 'First post')`,
      [topic, communityId, userId],
    );
    await rejectsConstraint(
      client,
      'insert into public.discussion_threads (event_id) values ($1)',
      [eventId],
    );
    await rejectsConstraint(
      client,
      'insert into public.discussion_threads (community_id) values ($1)',
      [communityId],
    );
    const root = randomUUID();
    const reply = randomUUID();
    await client.query(
      'insert into public.discussion_posts (id, thread_id, author_user_id, body) values ($1, $2, $3, $4)',
      [root, eventThread, userId, 'Root'],
    );
    await client.query(
      `insert into public.discussion_posts
        (id, thread_id, author_user_id, body, depth, parent_id, parent_depth)
       values ($1, $2, $3, 'Reply', 1, $4, 0)`,
      [reply, eventThread, userId, root],
    );
    const service = new DiscussionsService(drizzle(client, { schema }), undefined!, undefined!);
    const firstPage = await service.eventPosts(eventId, '1', '1');
    assert.equal(firstPage.items.length, 1);
    assert.equal(firstPage.items[0]?.body, 'Root');
    assert.equal(firstPage.items[0]?.authorName, 'Test author');
    assert.equal(firstPage.hasMore, true);
    const secondPage = await service.eventPosts(eventId, '2', '1');
    assert.equal(secondPage.items[0]?.parentId, root);
    assert.equal(secondPage.hasMore, false);
    await client.query(
      'update public.discussion_posts set deleted_at = now(), deleted_by_user_id = $1 where id = $2',
      [userId, root],
    );
    const deleted = await service.eventPosts(eventId);
    assert.equal(deleted.items[0]?.body, null);
    assert.equal(deleted.items[1]?.body, 'Reply');
    await assert.rejects(service.eventPosts(randomUUID()));
    await assert.rejects(service.eventPosts(eventId, '0'));
    const insertReply = `insert into public.discussion_posts
      (thread_id, author_user_id, body, depth, parent_id, parent_depth)
      values ($1, $2, 'Invalid reply', 1, $3, 0)`;
    await rejectsConstraint(client, insertReply, [eventThread, userId, reply]);
    await rejectsConstraint(client, insertReply, [topic, userId, root]);
    await rejectsConstraint(
      client,
      "insert into public.discussion_posts (thread_id, author_user_id, body) values ($1, $2, '')",
      [eventThread, userId],
    );
    const security = await client.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where oid in
        ('public.discussion_threads'::regclass, 'public.discussion_posts'::regclass)`,
    );
    assert.equal(security.rowCount, 2);
    assert.ok(security.rows.every((row) => row.relrowsecurity));
    const grants = await client.query<{ grants: number }>(
      `select count(*)::int as grants from information_schema.role_table_grants
       where table_schema = 'public' and table_name in ('discussion_threads', 'discussion_posts')
       and grantee in ('PUBLIC', 'anon', 'authenticated')`,
    );
    assert.equal(grants.rows[0]?.grants, 0);
    console.log('Discussion schema constraints, RLS, and client grants verified.');
  } finally {
    await client.query('rollback');
    client.release();
    await pool.end();
  }
}

void main();
