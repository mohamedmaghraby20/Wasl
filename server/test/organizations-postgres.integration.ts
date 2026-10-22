import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import * as assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import type { AuthenticatedUser } from '../src/modules/auth/authenticated-user';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run isolated organization concurrency checks.');
}

const testSchema = `wasl_phase5_${randomUUID().replaceAll('-', '')}`;
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
      [id, `phase5-${id}@example.test`],
    );
    users.push({ id, authUserId: `phase5-auth-${id}` });
  }
  return users;
}

async function createTestTables(pool: Pool): Promise<void> {
  const schemaName = quoteIdentifier(testSchema);
  await pool.query(`create schema ${schemaName}`);
  for (const table of [
    'organizations',
    'organization_admins',
    'organization_verification_requests',
  ]) {
    await pool.query(
      `create table ${schemaName}.${quoteIdentifier(table)} (like public.${quoteIdentifier(table)} including all)`,
    );
  }
}

async function seedOrganization(pool: Pool, ownerId: string, adminIds: string[]): Promise<string> {
  const organizationId = randomUUID();
  const qualifiedSchema = quoteIdentifier(testSchema);
  await pool.query(
    `insert into ${qualifiedSchema}.organizations
      (id, owner_user_id, slug, name, description, type, verification_status)
     values ($1, $2, $3, 'Transactional Organization', 'Temporary organization fixture.', 'Association', 'PENDING')`,
    [organizationId, ownerId, `phase5-${organizationId}`],
  );
  for (const adminId of adminIds) {
    await pool.query(
      `insert into ${qualifiedSchema}.organization_admins (organization_id, user_id)
       values ($1, $2)`,
      [organizationId, adminId],
    );
  }
  return organizationId;
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
    const service = new OrganizationsService(database, undefined, undefined);
    const [owner, adminA, adminB, platformAdmin] = await makeUsers(setupPool, 4);
    assert.ok(owner && adminA && adminB && platformAdmin);
    const organizationId = await seedOrganization(setupPool, owner.id, [adminA.id, adminB.id]);

    const denied = await Promise.allSettled([
      service.transferOwnership(adminA, organizationId, adminB.id),
    ]);
    assert.equal(denied[0]?.status, 'rejected');
    assert.ok(
      denied[0]?.status === 'rejected' && denied[0].reason instanceof ForbiddenException,
      'A non-owner transfer attempt must be forbidden.',
    );

    const transfers = await Promise.allSettled([
      service.transferOwnership(owner, organizationId, adminA.id),
      service.transferOwnership(owner, organizationId, adminB.id),
    ]);
    assert.equal(
      transfers.filter((result) => result.status === 'fulfilled').length,
      1,
      'Exactly one concurrent ownership transfer must succeed.',
    );
    assert.equal(
      transfers.filter((result) => result.status === 'rejected').length,
      1,
      'The competing transfer must fail rather than create a second owner.',
    );

    const organizationRow = await setupPool.query<{ owner_user_id: string }>(
      `select owner_user_id from ${qualifiedSchema}.organizations where id = $1`,
      [organizationId],
    );
    const currentOwnerId = organizationRow.rows[0]?.owner_user_id;
    assert.ok(
      currentOwnerId === adminA.id || currentOwnerId === adminB.id,
      'The surviving owner must be one of the eligible admins.',
    );

    const adminRows = await setupPool.query<{ user_id: string }>(
      `select user_id from ${qualifiedSchema}.organization_admins where organization_id = $1 order by user_id`,
      [organizationId],
    );
    assert.equal(adminRows.rows.length, 2, 'The removed target and previous owner swap places.');
    assert.ok(
      adminRows.rows.some((row) => row.user_id === owner.id),
      'The previous owner must remain as an Admin.',
    );
    assert.ok(
      !adminRows.rows.some((row) => row.user_id === currentOwnerId),
      'The current owner must not also hold an Admin row.',
    );

    const currentOwner = currentOwnerId === adminA.id ? adminA : adminB;
    const requestResults = await Promise.allSettled([
      service.requestVerification(currentOwner, organizationId, { note: 'First request.' }),
      service.requestVerification(currentOwner, organizationId, { note: 'Second request.' }),
    ]);
    assert.equal(
      requestResults.filter((result) => result.status === 'fulfilled').length,
      1,
      'Only one pending verification request may be stored per organization.',
    );
    assert.equal(
      requestResults.filter((result) => result.status === 'rejected').length,
      1,
      'The duplicate verification request must be rejected.',
    );

    const pendingRows = await setupPool.query<{ id: string; count: string }>(
      `select id, count(*) over ()::text as count from ${qualifiedSchema}.organization_verification_requests
       where organization_id = $1 and status = 'PENDING'`,
      [organizationId],
    );
    assert.equal(pendingRows.rows.length, 1);
    const requestId = pendingRows.rows[0]?.id;
    assert.ok(requestId);

    const decisions = await Promise.allSettled([
      service.decideVerification(platformAdmin.id, requestId, {
        decision: 'APPROVE',
        note: 'Approved.',
      }),
      service.decideVerification(platformAdmin.id, requestId, {
        decision: 'REJECT',
        note: 'Rejected.',
      }),
    ]);
    assert.equal(
      decisions.filter((result) => result.status === 'fulfilled').length,
      1,
      'Only one platform decision may be applied to a pending request.',
    );
    assert.equal(
      decisions.filter((result) => result.status === 'rejected').length,
      1,
      'The competing platform decision must fail.',
    );

    const decidedRows = await setupPool.query<{
      request_status: string;
      verification_status: string;
    }>(
      `select request.status::text as request_status, organization.verification_status::text as verification_status
       from ${qualifiedSchema}.organization_verification_requests request
       join ${qualifiedSchema}.organizations organization on organization.id = request.organization_id
       where request.id = $1`,
      [requestId],
    );
    const decision = decidedRows.rows[0];
    assert.ok(decision);
    assert.ok(
      (decision.request_status === 'APPROVED' && decision.verification_status === 'VERIFIED') ||
        (decision.request_status === 'REJECTED' && decision.verification_status === 'REJECTED'),
      'The public verification status must match the recorded decision.',
    );

    console.log(
      'Organization PostgreSQL ownership and verification checks passed in an isolated temporary schema.',
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
    error instanceof Error
      ? error.message
      : 'Organization PostgreSQL ownership and verification checks failed.',
  );
  process.exitCode = 1;
});
