import { describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { Database } from '../../db/database.module';
import { DiscoveryController } from './discovery.controller';
import type { ReferenceDataRepository } from './reference-data.repository';

describe('DiscoveryController community event filtering', () => {
  it('applies the community and public visibility restrictions to both rows and counts', async () => {
    const conditions: SQL[] = [];
    const select = vi.fn((fields: Record<string, unknown>) => {
      const rows = 'total' in fields ? [{ total: 0 }] : [];
      const builder = {
        from: () => builder,
        leftJoin: () => builder,
        where: (condition: SQL) => {
          conditions.push(condition);
          return builder;
        },
        orderBy: () => builder,
        limit: () => builder,
        offset: () => Promise.resolve(rows),
        then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
      };
      return builder;
    });
    const controller = new DiscoveryController(
      { select } as unknown as Database,
      {} as ReferenceDataRepository,
    );
    await controller.listEvents({ communityId: 'community-1' });
    expect(conditions).toHaveLength(2);
    for (const condition of conditions) {
      const query = new PgDialect().sqlToQuery(condition);
      expect(query.params).toContain('community-1');
      expect(query.params).toContain('public');
      expect(query.sql).toContain('"events"."community_id"');
    }
  });
});

describe('DiscoveryController category projection', () => {
  it.each(['community', 'event'] as const)('includes %s categories without a follow-up query', async (kind) => {
    const category = { id: 'culture', nameEn: 'Culture', nameAr: 'ثقافة', nameTr: 'Kültür' };
    const row = { id: 'resource-1', categories: [category] };
    const selections: Record<string, unknown>[] = [];
    const select = vi.fn((fields: Record<string, unknown>) => {
      selections.push(fields);
      const rows = 'total' in fields ? [{ total: 1 }] : [row];
      const builder = {
        from: () => builder,
        innerJoin: () => builder,
        leftJoin: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: () => builder,
        offset: () => builder,
        then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
      };
      return builder;
    });
    const controller = new DiscoveryController({ select } as unknown as Database, {} as ReferenceDataRepository);
    const listing = kind === 'community'
      ? await controller.listCommunities({})
      : await controller.listEvents({});
    expect(listing.items).toEqual([row]);
    expect(select).toHaveBeenCalledTimes(2);
    const details = kind === 'community'
      ? await controller.community('resource-1', {})
      : await controller.event('resource-1', {});
    expect(details).toEqual(row);
    expect(select).toHaveBeenCalledTimes(3);
    const projection = new PgDialect().sqlToQuery(selections[0]!.categories as SQL).sql;
    expect(projection).toContain('coalesce(json_agg(json_build_object(');
    expect(projection).toContain("'[]'::json");
    expect(projection).toContain(`"${kind}_categories"."${kind}_id" = "${kind === 'community' ? 'communities' : 'events'}"."id"`);
    for (const field of ['id', 'nameEn', 'nameAr', 'nameTr']) expect(projection).toContain(`'${field}'`);
  });
});
