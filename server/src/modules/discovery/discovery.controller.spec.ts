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
