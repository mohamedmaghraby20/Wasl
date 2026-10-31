import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Database } from '../src/db/database.module';
import * as schema from '../src/db/schema';
import { DiscoveryController } from '../src/modules/discovery/discovery.controller';
import { DiscussionsService } from '../src/modules/discussions/discussions.service';
import { SupabaseIdentityService } from '../src/modules/auth/supabase-identity.service';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for data-loading checks.');

async function main(): Promise<void> {
  const pool = new Pool({ connectionString, max: 2 });
  const rollback = new Error('Rollback data-loading fixtures');
  try {
    await assert.rejects(drizzle(pool, { schema }).transaction(async (tx) => {
      const [city] = await tx.select().from(schema.cities).limit(1);
      const [category] = await tx.select().from(schema.categories).limit(1);
      assert.ok(city && category, 'Seed reference cities and categories before this check.');
      const id = randomUUID();
      const authUser = {
        authUserId: randomUUID(), email: `latency-${id}@example.test`,
        emailVerifiedAt: null, displayName: 'Latency fixture',
      };
      const identity = new SupabaseIdentityService(tx as unknown as Database);
      const user = await identity.resolve(authUser);
      const readOnlyIdentity = new SupabaseIdentityService({
        select: tx.select.bind(tx),
        transaction: () => { throw new Error('Existing identities must not acquire a transaction.'); },
      } as unknown as Database);
      assert.deepEqual(await readOnlyIdentity.resolve(authUser), user);

      await tx.insert(schema.communities).values({
        id, slug: id, name: id, description: 'Latency fixture', cityId: city.id,
        ownerType: 'user', ownerId: user.id, hostName: 'Latency fixture', admissionMode: 'open',
      });
      await tx.insert(schema.events).values({
        id, slug: id, title: id, description: 'Latency fixture', online: true,
        hostType: 'user', hostId: user.id, hostName: 'Latency fixture', admissionMode: 'instant',
        startsAt: new Date('2099-01-01T00:00:00Z'),
      });
      await tx.insert(schema.communityCategories).values({ communityId: id, categoryId: category.id });
      await tx.insert(schema.eventCategories).values({ eventId: id, categoryId: category.id });
      const discovery = new DiscoveryController(tx as unknown as Database, undefined!);
      const expectedCategory = {
        id: category.id, nameEn: category.nameEn, nameAr: category.nameAr, nameTr: category.nameTr,
      };
      for (const result of [
        (await discovery.listCommunities({ q: id })).items[0],
        (await discovery.listEvents({ q: id })).items[0],
        await discovery.community(id, {}),
        await discovery.event(id, {}),
      ]) assert.deepEqual(result?.categories, [expectedCategory]);
      await tx.delete(schema.eventCategories).where(eq(schema.eventCategories.eventId, id));
      assert.deepEqual((await discovery.event(id, {})).categories, []);

      const discussions = new DiscussionsService(tx as unknown as Database, undefined!, undefined!);
      assert.deepEqual((await discussions.eventPosts(id)).items, []);
      const [thread] = await tx.insert(schema.discussionThreads).values({ eventId: id }).returning();
      assert.ok(thread);
      await tx.insert(schema.discussionPosts).values({ threadId: thread.id, authorUserId: user.id, body: 'A fixture comment' });
      const page = await discussions.eventPosts(id);
      assert.equal(page.total, 1);
      assert.equal(page.items[0]?.body, 'A fixture comment');
      throw rollback;
    }), (error: unknown) => error === rollback);
    console.log('Identity read-only lookup, discovery category contracts, empty categories, and discussion reads passed; fixtures rolled back.');
  } finally {
    await pool.end();
  }
}

void main();
