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
    await db.insert(schema.users).values({ id: prefix, normalizedEmail: `${prefix}@example.test` });
    await db
      .insert(schema.eventRegistrations)
      .values({ eventId: `${prefix}-full`, userId: prefix, status: 'ACCEPTED' });
    await db.insert(schema.communities).values(
      [city, otherCity].map((cityId) => ({
        id: `${cityId}-community`,
        slug: `${cityId}-community`,
        name: prefix,
        description: 'Community',
        cityId,
        ownerType: 'user',
        ownerId: prefix,
        hostName: 'Host',
        admissionMode: 'open',
      })),
    );
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
    expect(communities.json<{ items: { id: string }[] }>().items.map((item) => item.id)).toEqual([
      `${city}-community`,
    ]);
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
