import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import * as assert from 'node:assert/strict';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import type { AuthenticatedUser } from '../src/modules/auth/authenticated-user';
import { ParticipationService } from '../src/modules/participation/participation.service';

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error('DATABASE_URL is required to run isolated participation concurrency checks.');

const testSchema = `wasl_phase4_${randomUUID().replaceAll('-', '')}`;
const identityIds: string[] = [];
const setupPool = new Pool({ connectionString, max: 1 });
let testPool: Pool | undefined;

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function makeUsers(pool: Pool, count: number): Promise<AuthenticatedUser[]> {
  const users: AuthenticatedUser[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = randomUUID();
    identityIds.push(id);
    await pool.query(
      `insert into identity.users (id, normalized_email, account_status)
       values ($1, $2, 'ACTIVE')`,
      [id, `phase4-${id}@example.test`],
    );
    users.push({ id, authUserId: `phase4-auth-${id}` });
  }
  return users;
}

async function createTestTables(pool: Pool): Promise<void> {
  const schemaName = quoteIdentifier(testSchema);
  await pool.query(`create schema ${schemaName}`);
  for (const table of [
    'communities',
    'community_memberships',
    'community_membership_transitions',
    'events',
    'event_registrations',
    'event_registration_transitions',
  ]) {
    await pool.query(
      `create table ${schemaName}.${quoteIdentifier(table)} (like public.${quoteIdentifier(table)} including all)`,
    );
  }
}

async function seedResources(
  pool: Pool,
  ownerId: string,
): Promise<{ communityId: string; eventId: string }> {
  const communityId = randomUUID();
  const eventId = randomUUID();
  const qualifiedSchema = quoteIdentifier(testSchema);
  await pool.query(
    `insert into ${qualifiedSchema}.communities
      (id, slug, name, description, city_id, owner_type, owner_id, host_name, admission_mode, capacity)
     values ($1, $2, 'Concurrency test', 'Temporary participation fixture.', 'ankara', 'user', $3, 'Test owner', 'automatic', 3)`,
    [communityId, `phase4-${communityId}`, ownerId],
  );
  await pool.query(
    `insert into ${qualifiedSchema}.events
      (id, slug, title, description, visibility, host_type, host_id, host_name, online, starts_at, admission_mode, capacity)
     values ($1, $2, 'Concurrency test', 'Temporary registration fixture.', 'public', 'user', $3, 'Test owner', true, '2099-01-01T00:00:00Z', 'automatic', 2)`,
    [eventId, `phase4-${eventId}`, ownerId],
  );
  return { communityId, eventId };
}

async function main(): Promise<void> {
  try {
    await createTestTables(setupPool);
    const qualifiedSchema = quoteIdentifier(testSchema);
    testPool = new Pool({
      connectionString,
      max: 10,
      options: `-c search_path=${testSchema},public,identity`,
    });
    const database = drizzle(testPool, { schema });
    const service = new ParticipationService(database, {} as never, {} as never);
    const users = await makeUsers(setupPool, 12);
    const { communityId, eventId } = await seedResources(setupPool, users[0]!.id);

    const communityResults = await Promise.all(
      users.map((user) => service.joinCommunity(user, communityId)),
    );
    assert.equal(communityResults.filter((result) => result.status === 'ACTIVE').length, 3);
    assert.equal(communityResults.filter((result) => result.status === 'WAITLISTED').length, 9);
    const communityRows = await setupPool.query<{ count: string }>(
      `select count(*)::text as count from ${qualifiedSchema}.community_memberships where community_id = $1`,
      [communityId],
    );
    assert.equal(Number(communityRows.rows[0]?.count), users.length);

    const activeTestUser =
      users[communityResults.findIndex((result) => result.status === 'ACTIVE')]!;
    const duplicateResults = await Promise.all([
      service.joinCommunity(activeTestUser, communityId),
      service.joinCommunity(activeTestUser, communityId),
    ]);
    assert.deepEqual(
      duplicateResults.map((result) => result.status),
      ['ACTIVE', 'ACTIVE'],
    );
    const duplicateRows = await setupPool.query<{ count: string }>(
      `select count(*)::text as count from ${qualifiedSchema}.community_memberships where community_id = $1 and user_id = $2`,
      [communityId, activeTestUser.id],
    );
    assert.equal(Number(duplicateRows.rows[0]?.count), 1);

    const oldestWaiting = await setupPool.query<{ user_id: string }>(
      `select user_id from ${qualifiedSchema}.community_memberships where community_id = $1 and status = 'WAITLISTED' order by requested_at, id limit 2`,
      [communityId],
    );
    const activeCommunity = await setupPool.query<{ user_id: string }>(
      `select user_id from ${qualifiedSchema}.community_memberships where community_id = $1 and status = 'ACTIVE' order by requested_at, id limit 2`,
      [communityId],
    );
    const leaveUsers = activeCommunity.rows.map((row) =>
      users.find((user) => user.id === row.user_id),
    );
    assert.ok(leaveUsers.every((user): user is AuthenticatedUser => Boolean(user)));
    assert.equal(oldestWaiting.rows.length, 2);
    await Promise.all(leaveUsers.map((user) => service.leaveCommunity(user, communityId)));
    const promoted = await setupPool.query<{ status: string }>(
      `select status from ${qualifiedSchema}.community_memberships where community_id = $1 and user_id = any($2::uuid[])`,
      [communityId, oldestWaiting.rows.map((row) => row.user_id)],
    );
    assert.equal(promoted.rows.filter((row) => row.status === 'ACTIVE').length, 2);
    const activeAfterLeaves = await setupPool.query<{ count: string }>(
      `select count(*)::text as count from ${qualifiedSchema}.community_memberships where community_id = $1 and status = 'ACTIVE'`,
      [communityId],
    );
    assert.equal(Number(activeAfterLeaves.rows[0]?.count), 3);

    const eventResults = await Promise.all(
      users.map((user) => service.registerForEvent(user, eventId)),
    );
    assert.equal(eventResults.filter((result) => result.status === 'ACCEPTED').length, 2);
    assert.equal(eventResults.filter((result) => result.status === 'WAITLISTED').length, 10);
    const acceptedTestUser =
      users[eventResults.findIndex((result) => result.status === 'ACCEPTED')]!;
    const duplicateRegistrations = await Promise.all([
      service.registerForEvent(acceptedTestUser, eventId),
      service.registerForEvent(acceptedTestUser, eventId),
    ]);
    assert.deepEqual(
      duplicateRegistrations.map((result) => result.status),
      ['ACCEPTED', 'ACCEPTED'],
    );
    const duplicateRegistrationRows = await setupPool.query<{ count: string }>(
      `select count(*)::text as count from ${qualifiedSchema}.event_registrations where event_id = $1 and user_id = $2`,
      [eventId, acceptedTestUser.id],
    );
    assert.equal(Number(duplicateRegistrationRows.rows[0]?.count), 1);
    const eventRows = await setupPool.query<{ count: string }>(
      `select count(*)::text as count from ${qualifiedSchema}.event_registrations where event_id = $1`,
      [eventId],
    );
    assert.equal(Number(eventRows.rows[0]?.count), users.length);

    const oldestEventWaiting = await setupPool.query<{ user_id: string }>(
      `select user_id from ${qualifiedSchema}.event_registrations where event_id = $1 and status = 'WAITLISTED' order by requested_at, id limit 2`,
      [eventId],
    );
    const acceptedEventUser = await setupPool.query<{ user_id: string }>(
      `select user_id from ${qualifiedSchema}.event_registrations where event_id = $1 and status = 'ACCEPTED' order by requested_at, id limit 2`,
      [eventId],
    );
    const cancelUsers = acceptedEventUser.rows.map((row) =>
      users.find((user) => user.id === row.user_id),
    );
    assert.ok(cancelUsers.every((user): user is AuthenticatedUser => Boolean(user)));
    assert.equal(oldestEventWaiting.rows.length, 2);
    await Promise.all(cancelUsers.map((user) => service.cancelEventRegistration(user, eventId)));
    const promotedEvent = await setupPool.query<{ status: string }>(
      `select status from ${qualifiedSchema}.event_registrations where event_id = $1 and user_id = any($2::uuid[])`,
      [eventId, oldestEventWaiting.rows.map((row) => row.user_id)],
    );
    assert.equal(promotedEvent.rows.filter((row) => row.status === 'ACCEPTED').length, 2);
    const acceptedAfterCancels = await setupPool.query<{ count: string }>(
      `select count(*)::text as count from ${qualifiedSchema}.event_registrations where event_id = $1 and status = 'ACCEPTED'`,
      [eventId],
    );
    assert.equal(Number(acceptedAfterCancels.rows[0]?.count), 2);

    console.log(
      'Participation PostgreSQL concurrency checks passed in an isolated temporary schema.',
    );
  } finally {
    await testPool?.end();
    try {
      await setupPool.query(`drop schema if exists ${quoteIdentifier(testSchema)} cascade`);
    } finally {
      try {
        if (identityIds.length) {
          await setupPool.query('delete from identity.users where id = any($1::uuid[])', [
            identityIds,
          ]);
        }
      } finally {
        await setupPool.end();
      }
    }
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Participation PostgreSQL concurrency checks failed.',
  );
  process.exitCode = 1;
});
