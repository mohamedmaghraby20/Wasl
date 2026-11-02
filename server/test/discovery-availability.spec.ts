import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DATABASE } from '../src/db/database.module';
import * as schema from '../src/db/schema';
import { DiscoveryController } from '../src/modules/discovery/discovery.controller';
import type { EventPageDto, EventPublicDto } from '../src/modules/discovery/discovery.dto';
import { ReferenceDataRepository } from '../src/modules/discovery/reference-data.repository';

// Explicit opt-in: never fall back to an application's configured remote database.
const connectionString = process.env.DISCOVERY_TEST_DATABASE_URL;

describe.skipIf(!connectionString)('public event availability API (Postgres)', () => {
  const testSchema = `discovery_${randomUUID().replaceAll('-', '')}`;
  let pool: Pool;
  let setup: Pool;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    setup = new Pool({ connectionString, max: 1 });
    await setup.query(`create schema "${testSchema}"`);
    pool = new Pool({ connectionString, options: `-c search_path=${testSchema}`, max: 2 });
    // Minimal database-boundary fixtures; no production migrations or provider services.
    await pool.query(`
      create table cities (id text primary key, name_en text, name_ar text, name_tr text);
      create table categories (id text primary key, name_en text, name_ar text, name_tr text);
      create table organizations (id uuid primary key, name text, slug text);
      create table event_categories (event_id text, category_id text);
      create table events (
        id text primary key, slug text, title text, description text, visibility text,
        host_type text, host_id text, host_name text, community_id text, city_id text,
        online boolean, location_name text, starts_at timestamptz, ends_at timestamptz,
        cancelled boolean, capacity integer, admission_mode text
      );
      create table event_registrations (event_id text, user_id uuid, status text);
      insert into events values (
        'available', 'available-event', 'Available event', 'Illustrative event', 'public',
        'user', 'unregistered-host', 'Host', null, null, true, null,
        '2099-01-01T12:00:00Z', null, false, 3, 'automatic'
      );
      insert into event_registrations values
        ('available', '00000000-0000-4000-8000-000000000001', 'ACCEPTED'),
        ('available', '00000000-0000-4000-8000-000000000002', 'PENDING'),
        ('available', '00000000-0000-4000-8000-000000000003', 'WAITLISTED'),
        ('available', '00000000-0000-4000-8000-000000000004', 'CANCELLED_BY_USER');
    `);
    const module = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [
        { provide: DATABASE, useValue: drizzle(pool, { schema }) },
        ReferenceDataRepository,
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
    if (setup) {
      await setup.query(`drop schema "${testSchema}" cascade`);
      await setup.end();
    }
  });

  it('publishes accepted registrations only, not requests or an unregistered host, on list and detail', async () => {
    const listing = await app.inject({ method: 'GET', url: '/events' });
    expect(listing.statusCode).toBe(200);
    const item = listing.json<EventPageDto>().items[0]!;
    expect(item.acceptedRegistrationCount).toBe(1);
    expect(item.capacity).toBe(3);
    const detail = await app.inject({ method: 'GET', url: '/events/available-event' });
    expect(detail.statusCode).toBe(200);
    expect(detail.json<EventPublicDto>()).toEqual(item);
    expect(item).not.toHaveProperty('registrations');
    expect(item).not.toHaveProperty('userId');
    expect(JSON.stringify(item)).not.toContain('00000000-0000-4000-8000-000000000001');
  });

  it('retains full, unlimited and approval events in discovery with independent counts', async () => {
    await pool.query(`
      insert into events
      select name, name, name, description, visibility, host_type, host_id, host_name,
        community_id, city_id, online, location_name, starts_at, ends_at, cancelled,
        case when name = 'unlimited' then null else 1 end,
        case when name = 'approval' then 'approval' else 'automatic' end
      from events cross join (values ('full'), ('unlimited'), ('approval')) as fixture(name)
      where id = 'available';
      insert into event_registrations values
        ('full', '00000000-0000-4000-8000-000000000005', 'ACCEPTED'),
        ('full', '00000000-0000-4000-8000-000000000006', 'WAITLISTED'),
        ('approval', '00000000-0000-4000-8000-000000000007', 'PENDING');
    `);
    const response = await app.inject({ method: 'GET', url: '/events' });
    expect(response.statusCode).toBe(200);
    expect(response.json<EventPageDto>().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'full', capacity: 1, acceptedRegistrationCount: 1 }),
        expect.objectContaining({ id: 'unlimited', capacity: null, acceptedRegistrationCount: 0 }),
        expect.objectContaining({
          id: 'approval',
          admissionMode: 'approval',
          acceptedRegistrationCount: 0,
        }),
      ]),
    );
  });
});
