import { randomUUID } from 'node:crypto';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DATABASE } from '../src/db/database.module';
import * as schema from '../src/db/schema';
import { DiscoveryController } from '../src/modules/discovery/discovery.controller';
import { ReferenceDataRepository } from '../src/modules/discovery/reference-data.repository';

// Opt-in only: never uses the application DATABASE_URL and never touches remote data.
const connectionString = process.env.DISCOVERY_TEST_DATABASE_URL;
describe.skipIf(!connectionString)('content-backed discovery categories (PostgreSQL HTTP)', () => {
  let app: NestFastifyApplication;
  let pool: Pool;
  let client: PoolClient;
  const prefix = randomUUID();
  const city = `${prefix}-city`;
  const otherCity = `${prefix}-other-city`;
  const now = new Date('2026-11-02T12:00:00Z');
  const categoryKeys = [
    'community',
    'event',
    'online',
    'archived',
    'past',
    'starting',
    'ongoing',
    'cancelled',
    'unlisted',
    'full',
    'other-community',
    'other-event',
    'archived-other',
    'past-online',
    'online-extra',
    'deep',
  ] as const;
  const categoryId = (key: (typeof categoryKeys)[number]) => `${prefix}-category-${key}`;
  const eventId = (key: string) => `${prefix}-event-${key}`;

  beforeAll(async () => {
    if (!['localhost', '127.0.0.1'].includes(new URL(connectionString!).hostname)) {
      throw new Error('Discovery integration fixtures require a local database.');
    }
    pool = new Pool({ connectionString });
    client = await pool.connect();
    await client.query('BEGIN');
    const db = drizzle(client, { schema });
    await db
      .insert(schema.cities)
      .values([city, otherCity].map((id) => ({ id, nameEn: id, nameAr: id, nameTr: id })));
    await db.insert(schema.categories).values(
      categoryKeys.map((key, index) => ({
        id: categoryId(key),
        nameEn: `English ${key}`,
        nameAr: `عربي ${key}`,
        nameTr: `${prefix}-${String(index + 1).padStart(2, '0')}-${key}`,
      })),
    );
    await db.insert(schema.users).values({ id: prefix, normalizedEmail: `${prefix}@example.test` });
    await db.insert(schema.communities).values([
      {
        id: `${prefix}-community-local`,
        slug: `${prefix}-community-local`,
        name: 'Local community',
        description: 'Community fixture',
        cityId: city,
        ownerType: 'user',
        ownerId: prefix,
        hostName: 'Host',
        admissionMode: 'open',
      },
      {
        id: `${prefix}-community-other`,
        slug: `${prefix}-community-other`,
        name: 'Other city community',
        description: 'Community fixture',
        cityId: otherCity,
        ownerType: 'user',
        ownerId: prefix,
        hostName: 'Host',
        admissionMode: 'open',
      },
      {
        id: `${prefix}-community-archived`,
        slug: `${prefix}-community-archived`,
        name: 'Archived local community',
        description: 'Community fixture',
        cityId: city,
        ownerType: 'user',
        ownerId: prefix,
        hostName: 'Host',
        admissionMode: 'open',
        archived: true,
      },
      {
        id: `${prefix}-community-archived-other`,
        slug: `${prefix}-community-archived-other`,
        name: 'Archived other community',
        description: 'Community fixture',
        cityId: otherCity,
        ownerType: 'user',
        ownerId: prefix,
        hostName: 'Host',
        admissionMode: 'open',
        archived: true,
      },
    ]);
    await db.insert(schema.communityCategories).values([
      { communityId: `${prefix}-community-local`, categoryId: categoryId('community') },
      { communityId: `${prefix}-community-other`, categoryId: categoryId('other-community') },
      { communityId: `${prefix}-community-archived`, categoryId: categoryId('archived') },
      {
        communityId: `${prefix}-community-archived-other`,
        categoryId: categoryId('archived-other'),
      },
    ]);

    const inPerson = (key: string, startsAt: string, overrides: object = {}) => ({
      id: eventId(key),
      slug: eventId(key),
      title: `${prefix} ${key}`,
      description: 'Event fixture',
      hostType: 'user',
      hostId: prefix,
      hostName: 'Host',
      cityId: city,
      locationName: 'Hall',
      admissionMode: 'instant',
      startsAt: new Date(startsAt),
      ...overrides,
    });
    const online = (key: string, startsAt: string, overrides: object = {}) =>
      inPerson(key, startsAt, { online: true, cityId: null, locationName: null, ...overrides });
    await db.insert(schema.events).values([
      inPerson('padding-1', '2026-11-03T12:00:00Z'),
      inPerson('padding-2', '2026-11-04T12:00:00Z'),
      inPerson('padding-3', '2026-11-05T12:00:00Z'),
      inPerson('padding-4', '2026-11-06T12:00:00Z'),
      inPerson('deep', '2026-11-07T12:00:00Z'),
      inPerson('event', '2026-11-08T12:00:00Z'),
      inPerson('full', '2026-11-09T12:00:00Z', { capacity: 1 }),
      inPerson('other-event', '2026-11-10T12:00:00Z', { cityId: otherCity }),
      online('online', '2026-11-11T12:00:00Z'),
      online('online-extra', '2026-11-12T12:00:00Z'),
      inPerson('past', '2026-11-01T12:00:00Z'),
      inPerson('starting', '2026-11-02T12:00:00Z'),
      inPerson('ongoing', '2026-11-02T11:00:00Z', {
        endsAt: new Date('2026-11-02T13:00:00Z'),
      }),
      inPerson('cancelled', '2026-11-05T12:00:00Z', { cancelled: true }),
      inPerson('unlisted', '2026-11-05T12:00:00Z', { visibility: 'unlisted' }),
      online('past-online', '2026-11-01T12:00:00Z'),
      online('starting-online', '2026-11-02T12:00:00Z'),
      online('ongoing-online', '2026-11-02T11:00:00Z', {
        endsAt: new Date('2026-11-02T13:00:00Z'),
      }),
      online('cancelled-online', '2026-11-05T12:00:00Z', { cancelled: true }),
      online('unlisted-online', '2026-11-05T12:00:00Z', { visibility: 'unlisted' }),
    ]);
    await db.insert(schema.eventCategories).values([
      { eventId: eventId('deep'), categoryId: categoryId('deep') },
      { eventId: eventId('event'), categoryId: categoryId('event') },
      { eventId: eventId('full'), categoryId: categoryId('full') },
      { eventId: eventId('other-event'), categoryId: categoryId('other-event') },
      { eventId: eventId('online'), categoryId: categoryId('online') },
      { eventId: eventId('online-extra'), categoryId: categoryId('online-extra') },
      { eventId: eventId('past'), categoryId: categoryId('past') },
      { eventId: eventId('starting'), categoryId: categoryId('starting') },
      { eventId: eventId('ongoing'), categoryId: categoryId('ongoing') },
      { eventId: eventId('cancelled'), categoryId: categoryId('cancelled') },
      { eventId: eventId('unlisted'), categoryId: categoryId('unlisted') },
      { eventId: eventId('past-online'), categoryId: categoryId('past-online') },
      { eventId: eventId('starting-online'), categoryId: categoryId('starting') },
      { eventId: eventId('ongoing-online'), categoryId: categoryId('ongoing') },
      { eventId: eventId('cancelled-online'), categoryId: categoryId('cancelled') },
      { eventId: eventId('unlisted-online'), categoryId: categoryId('unlisted') },
    ]);
    await db
      .insert(schema.eventRegistrations)
      .values({ eventId: eventId('full'), userId: prefix, status: 'ACCEPTED' });

    // Vitest's transformer does not emit the constructor metadata produced by the Nest build.
    Reflect.defineMetadata(
      'design:paramtypes',
      [Object, ReferenceDataRepository],
      DiscoveryController,
    );
    const module = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [{ provide: DATABASE, useValue: db }, ReferenceDataRepository],
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

  async function categories(params: Record<string, string>) {
    const response = await app.inject({
      method: 'GET',
      url: `/discovery/categories?${new URLSearchParams(params)}`,
    });
    expect(response.statusCode).toBe(200);
    return response.json<{ id: string; nameEn: string; nameAr: string; nameTr: string }[]>();
  }

  const localExpected = ['community', 'event', 'online', 'full', 'online-extra', 'deep'] as const;
  const nationwideExpected = [
    'community',
    'event',
    'online',
    'full',
    'other-community',
    'other-event',
  ] as const;

  it('qualifies reference categories from local communities, local eligible in-person events and nationwide online events', async () => {
    const result = await categories({ city });
    expect(result.map((category) => category.id)).toEqual(localExpected.map(categoryId));
    expect(result[0]).toMatchObject({
      nameEn: 'English community',
      nameAr: 'عربي community',
      nameTr: `${prefix}-01-community`,
    });
  });

  it('excludes archived communities and past, exactly-starting, ongoing, cancelled, unlisted or other-city content', async () => {
    const result = await categories({ city });
    const ids = result.map((category) => category.id);
    const excluded = [
      'archived',
      'past',
      'starting',
      'ongoing',
      'cancelled',
      'unlisted',
      'other-community',
      'other-event',
      'archived-other',
      'past-online',
    ] as const;
    for (const key of excluded) expect(ids).not.toContain(categoryId(key));
  });

  it('keeps full events eligible while their accepted registrations fill capacity', async () => {
    const result = await categories({ city });
    expect(result.map((category) => category.id)).toContain(categoryId('full'));
  });

  it('requires content beyond the four event cards a homepage section fetches', async () => {
    const cardResponse = await app.inject({
      method: 'GET',
      url: `/events?${new URLSearchParams({
        city,
        modality: 'in-person',
        upcoming: 'true',
        nonCancelled: 'true',
        pageSize: '4',
      })}`,
    });
    expect(cardResponse.statusCode).toBe(200);
    const cards = cardResponse.json<{ items: { id: string; categories: { id: string }[] }[] }>();
    expect(cards.items).toHaveLength(4);
    const cardCategoryIds = cards.items.flatMap((item) =>
      item.categories.map((category) => category.id),
    );
    expect(cardCategoryIds).toEqual([]);
    const result = await categories({ city });
    expect(result.map((category) => category.id)).toEqual(localExpected.map(categoryId));
  });

  it('evaluates communities and events nationwide without a selected city and caps the result at six in reference order', async () => {
    const result = await categories({});
    expect(result.map((category) => category.id)).toEqual(nationwideExpected.map(categoryId));
    expect(result).toHaveLength(6);
  });

  it('preserves the complete reference list for creation and unrelated discovery filters', async () => {
    const response = await app.inject({ method: 'GET', url: '/reference/categories' });
    expect(response.statusCode).toBe(200);
    const reference = response.json<{ id: string }[]>();
    expect(
      reference.filter((category) => category.id.startsWith(prefix)).map((category) => category.id),
    ).toEqual(categoryKeys.map(categoryId));
    expect(reference.length).toBeGreaterThan(6);
  });

  it('each qualifying resource type has matching combined discovery results in the advertised city-plus-online scope', async () => {
    for (const [key, resource, expected] of [
      ['community', 'communities', `${prefix}-community-local`],
      ['event', 'events', eventId('event')],
      ['online', 'events', eventId('online')],
      ['full', 'events', eventId('full')],
      ['deep', 'events', eventId('deep')],
    ] as const) {
      const response = await app.inject({
        method: 'GET',
        url: `/${resource}?${new URLSearchParams({
          city,
          category: categoryId(key),
          cityScope: 'include-online',
          upcoming: 'true',
          nonCancelled: 'true',
        })}`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json<{ items: { id: string }[] }>().items.map((item) => item.id)).toEqual([
        expected,
      ]);
    }
  });

  it('returns a successful empty projection when only excluded content remains, without a cap masking exclusions', async () => {
    await client.query('SAVEPOINT excluded_only');
    try {
      await client.query('DELETE FROM event_categories WHERE event_id = ANY($1::text[])', [
        ['deep', 'event', 'full', 'other-event', 'online', 'online-extra'].map(eventId),
      ]);
      await client.query('DELETE FROM community_categories WHERE community_id = ANY($1::text[])', [
        [`${prefix}-community-local`, `${prefix}-community-other`],
      ]);
      expect(await categories({ city })).toEqual([]);
      expect(await categories({})).toEqual([]);
    } finally {
      await client.query('ROLLBACK TO SAVEPOINT excluded_only');
    }
  });
});
