import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DATABASE } from '../src/db/database.module';
import * as schema from '../src/db/schema';
import { DiscoveryController } from '../src/modules/discovery/discovery.controller';
import { ReferenceDataRepository } from '../src/modules/discovery/reference-data.repository';

// Use an explicitly configured, disposable local database with the current schema.
const connectionString = process.env.DISCOVERY_TEST_DATABASE_URL;
describe.skipIf(!connectionString)('public discovery scope (PostgreSQL HTTP)', () => {
  let app: NestFastifyApplication;
  let pool: Pool;
  let client: PoolClient;
  const prefix = randomUUID();
  const city = `${prefix}-local`;
  const otherCity = `${prefix}-other`;
  const communityPrefix = `${prefix}-members`;
  const organizationId = randomUUID();
  const members = Array.from({ length: 6 }, () => randomUUID());
  const now = new Date('2026-11-02T12:00:00Z');

  beforeAll(async () => {
    if (!['localhost', '127.0.0.1'].includes(new URL(connectionString!).hostname)) {
      throw new Error('Discovery integration fixtures require a local database.');
    }
    pool = new Pool({ connectionString });
    client = await pool.connect();
    await client.query('BEGIN');
    const db = drizzle(client, { schema });
    await db.insert(schema.cities).values(
      [city, otherCity].map((id) => ({
        id,
        nameEn: id,
        nameAr: id,
        nameTr: id,
      })),
    );
    const fixtures = [
      { id: 'past', startsAt: new Date('2026-11-01T12:00:00Z') },
      { id: 'starting', startsAt: now },
      {
        id: 'ongoing',
        startsAt: new Date('2026-11-02T11:00:00Z'),
        endsAt: new Date('2026-11-02T13:00:00Z'),
      },
      { id: 'cancelled', cancelled: true },
      { id: 'unlisted', visibility: 'unlisted' },
      { id: 'online', online: true, cityId: otherCity },
      { id: 'remote', cityId: otherCity },
      { id: 'later', startsAt: new Date('2026-11-04T12:00:00Z') },
      { id: 'full', capacity: 1 },
      { id: 'approval', admissionMode: 'approval' },
    ];
    await db.insert(schema.events).values(
      fixtures.map((fixture) => ({
        title: `${prefix} ${fixture.id}`,
        description: 'Discovery fixture',
        slug: `${prefix}-${fixture.id}`,
        hostType: 'user',
        hostId: prefix,
        hostName: 'Host',
        cityId: city,
        locationName: 'Hall',
        admissionMode: 'instant',
        startsAt: new Date('2026-11-03T12:00:00Z'),
        ...fixture,
        id: `${prefix}-${fixture.id}`,
      })),
    );
    await db
      .insert(schema.users)
      .values([prefix, ...members].map((id) => ({ id, normalizedEmail: `${id}@example.test` })));
    await db
      .insert(schema.eventRegistrations)
      .values({ eventId: `${prefix}-full`, userId: prefix, status: 'ACCEPTED' });
    await db.insert(schema.organizations).values({
      id: organizationId,
      ownerUserId: prefix,
      slug: `${prefix}-organization`,
      name: `${prefix} organization`,
      description: 'Community fixture organization',
      type: 'community',
      cityId: city,
    });
    await db.insert(schema.communities).values([
      ...[city, otherCity].map((cityId) => ({
        id: `${cityId}-community`,
        slug: `${cityId}-community`,
        name: prefix,
        description: 'Community',
        cityId,
        ownerType: 'user',
        ownerId: prefix,
        hostName: 'Host',
        admissionMode: 'open',
        createdAt: new Date('2026-09-30T12:00:00Z'),
      })),
      {
        id: `${communityPrefix}-external`,
        slug: `${communityPrefix}-external`,
        name: `${communityPrefix} external`,
        description: 'Owner has a pending membership and still counts once.',
        cityId: city,
        ownerType: 'user',
        ownerId: prefix,
        hostName: 'Host',
        admissionMode: 'open',
        createdAt: new Date('2026-10-04T12:00:00Z'),
      },
      {
        id: `${communityPrefix}-owner-active`,
        slug: `${communityPrefix}-owner-active`,
        name: `${communityPrefix} owner active`,
        description: 'Owner and another active member.',
        cityId: city,
        ownerType: 'user',
        ownerId: prefix,
        hostName: 'Host',
        admissionMode: 'open',
        createdAt: new Date('2026-10-03T12:00:00Z'),
      },
      {
        id: `${communityPrefix}-organization`,
        slug: `${communityPrefix}-organization`,
        name: `${communityPrefix} organization`,
        description: 'Organization ownership does not add a member.',
        cityId: city,
        ownerType: 'organization',
        ownerId: organizationId,
        hostName: 'Organization',
        admissionMode: 'open',
        createdAt: new Date('2026-10-02T12:00:00Z'),
      },
      {
        id: `${communityPrefix}-organization-empty`,
        slug: `${communityPrefix}-organization-empty`,
        name: `${communityPrefix} organization empty`,
        description: 'Organization-owned community without memberships.',
        cityId: city,
        ownerType: 'organization',
        ownerId: organizationId,
        hostName: 'Organization',
        admissionMode: 'open',
        createdAt: new Date('2026-10-06T12:00:00Z'),
      },
      {
        id: `${communityPrefix}-late`,
        slug: `${communityPrefix}-late`,
        name: `${communityPrefix} late`,
        description: 'Owner-only community created before the ranking ties.',
        cityId: city,
        ownerType: 'user',
        ownerId: prefix,
        hostName: 'Host',
        admissionMode: 'open',
        createdAt: new Date('2026-10-01T12:00:00Z'),
      },
      {
        id: `${communityPrefix}-archived`,
        slug: `${communityPrefix}-archived`,
        name: `${communityPrefix} archived`,
        description: 'Archived communities never qualify for discovery.',
        cityId: city,
        ownerType: 'user',
        ownerId: prefix,
        hostName: 'Host',
        admissionMode: 'open',
        archived: true,
        createdAt: new Date('2026-10-07T12:00:00Z'),
      },
    ]);
    await db.insert(schema.communityMemberships).values([
      { communityId: `${communityPrefix}-external`, userId: prefix, status: 'PENDING' },
      { communityId: `${communityPrefix}-external`, userId: members[0]!, status: 'ACTIVE' },
      { communityId: `${communityPrefix}-external`, userId: members[1]!, status: 'WAITLISTED' },
      { communityId: `${communityPrefix}-owner-active`, userId: prefix, status: 'ACTIVE' },
      { communityId: `${communityPrefix}-owner-active`, userId: members[0]!, status: 'ACTIVE' },
      { communityId: `${communityPrefix}-owner-active`, userId: members[2]!, status: 'PENDING' },
      { communityId: `${communityPrefix}-owner-active`, userId: members[3]!, status: 'WAITLISTED' },
      { communityId: `${communityPrefix}-owner-active`, userId: members[4]!, status: 'REJECTED' },
      { communityId: `${communityPrefix}-owner-active`, userId: members[5]!, status: 'REMOVED' },
      { communityId: `${communityPrefix}-organization`, userId: members[0]!, status: 'ACTIVE' },
      ...members.slice(0, 4).map((userId) => ({
        communityId: `${communityPrefix}-archived`,
        userId,
        status: 'ACTIVE' as const,
      })),
    ]);
    const module = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [
        { provide: DATABASE, useValue: db },
        { provide: ReferenceDataRepository, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await app?.close();
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    await pool?.end();
  });

  async function events(params: Record<string, string>) {
    const response = await app.inject({
      method: 'GET',
      url: `/events?${new URLSearchParams({ q: prefix, ...params })}`,
    });
    expect(response.statusCode).toBe(200);
    return response.json<{
      items: { id: string; startsAt: string }[];
      total: number;
      hasMore: boolean;
    }>();
  }

  it('returns only strictly future public non-cancelled in-person events, soonest first with a four-item cap', async () => {
    const result = await events({
      city,
      modality: 'in-person',
      upcoming: 'true',
      nonCancelled: 'true',
      pageSize: '4',
    });
    expect(result.items.map((item) => item.id).sort()).toEqual(
      ['approval', 'full', 'later'].map((id) => `${prefix}-${id}`).sort(),
    );
    expect(result.items.at(-1)?.id).toBe(`${prefix}-later`);
    expect(result.total).toBe(3);
  });

  it('includes nationwide online events alongside local in-person events only with explicit city scope', async () => {
    const result = await events({
      city,
      cityScope: 'include-online',
      upcoming: 'true',
      nonCancelled: 'true',
    });
    expect(result.items.map((item) => item.id).sort()).toEqual(
      ['approval', 'full', 'later', 'online'].map((id) => `${prefix}-${id}`).sort(),
    );
    const communities = await app.inject({
      method: 'GET',
      url: `/communities?${new URLSearchParams({ q: prefix, city, cityScope: 'include-online' })}`,
    });
    expect(communities.statusCode).toBe(200);
    expect(
      communities
        .json<{ items: { cityId: string }[] }>()
        .items.every((item) => item.cityId === city),
    ).toBe(true);
  });

  it('ranks public communities by owner-inclusive active members then newest creation, matching detail counts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/communities?${new URLSearchParams({ q: communityPrefix, city, order: 'member-count', pageSize: '4' })}`,
    });
    expect(response.statusCode).toBe(200);
    const result = response.json<{
      items: { id: string; memberCount: number }[];
      total: number;
      hasMore: boolean;
    }>();
    expect(result.items.map(({ id, memberCount }) => [id, memberCount])).toEqual([
      [`${communityPrefix}-external`, 2],
      [`${communityPrefix}-owner-active`, 2],
      [`${communityPrefix}-organization`, 1],
      [`${communityPrefix}-late`, 1],
    ]);
    expect(result.total).toBe(5);
    expect(result.hasMore).toBe(true);
    for (const item of result.items) {
      const detail = await app.inject({ method: 'GET', url: `/communities/${item.id}` });
      expect(detail.json<{ memberCount: number }>().memberCount).toBe(item.memberCount);
      expect(item).not.toHaveProperty('memberships');
    }
    const emptyOrganization = await app.inject({
      method: 'GET',
      url: `/communities/${communityPrefix}-organization-empty`,
    });
    expect(emptyOrganization.json<{ memberCount: number }>().memberCount).toBe(0);
    const defaultOrder = await app.inject({
      method: 'GET',
      url: `/communities?q=${communityPrefix}`,
    });
    const newest = defaultOrder.json<{ items: { id: string; memberCount: number }[] }>().items[0];
    expect(newest?.id).toBe(`${communityPrefix}-organization-empty`);
    expect(newest?.memberCount).toBe(0);
    const nextPage = await app.inject({
      method: 'GET',
      url: `/communities?${new URLSearchParams({ q: communityPrefix, order: 'member-count', pageSize: '4', page: '2' })}`,
    });
    expect(
      nextPage
        .json<{ items: { id: string; memberCount: number }[] }>()
        .items.map(({ id, memberCount }: { id: string; memberCount: number }) => [id, memberCount]),
    ).toEqual([[`${communityPrefix}-organization-empty`, 0]]);
    expect(
      (await app.inject({ method: 'GET', url: '/communities?order=invalid' })).statusCode,
    ).toBe(400);
  });

  it('supports nationwide online-only results, capped pagination and inclusive date/category behavior', async () => {
    const online = await events({ modality: 'online', upcoming: 'true', nonCancelled: 'true' });
    expect(online.items.map((item) => item.id)).toEqual([`${prefix}-online`]);
    const nationwide = await events({
      modality: 'in-person',
      upcoming: 'true',
      nonCancelled: 'true',
      pageSize: '2',
    });
    expect(nationwide.items).toHaveLength(2);
    expect(nationwide.total).toBe(4);
    expect(nationwide.hasMore).toBe(true);
    const next = await events({
      modality: 'in-person',
      upcoming: 'true',
      nonCancelled: 'true',
      pageSize: '2',
      page: '2',
    });
    expect(next.items).toHaveLength(2);
    expect(next.items.at(-1)?.id).toBe(`${prefix}-later`);
    const dated = await events({ city, from: '2026-11-04', to: '2026-11-04' });
    expect(dated.items.map((item) => item.id)).toEqual([`${prefix}-later`]);
    expect((await events({ category: 'missing-category' })).items).toEqual([]);
  });

  it('keeps historical and cancelled browsing intact without explicit eligibility filters', async () => {
    const result = await events({ city });
    expect(result.items.map((item) => item.id).sort()).toEqual(
      ['past', 'starting', 'ongoing', 'cancelled', 'later', 'full', 'approval']
        .map((id) => `${prefix}-${id}`)
        .sort(),
    );
  });

  it.each([
    { modality: 'invalid' },
    { cityScope: 'invalid' },
    { upcoming: 'yes' },
    { nonCancelled: 'yes' },
  ])('rejects invalid explicit filters: %j', async (params) => {
    const response = await app.inject({
      method: 'GET',
      url: `/events?${new URLSearchParams(params)}`,
    });
    expect(response.statusCode).toBe(400);
  });
});
