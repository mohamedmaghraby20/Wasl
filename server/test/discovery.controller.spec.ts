import { BadRequestException } from '@nestjs/common';
import { PgDialect } from 'drizzle-orm/pg-core';
import { sql, type SQL } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import type { Database } from '../src/db/database.module';
import { DiscoveryController } from '../src/modules/discovery/discovery.controller';
import type { ReferenceDataRepository } from '../src/modules/discovery/reference-data.repository';

class QueryStub {
  constructor(
    private readonly rows: unknown[],
    private readonly capturedConditions?: SQL[],
  ) {}

  private readonly conditions: SQL[] = [];

  from() {
    return this;
  }
  innerJoin() {
    return this;
  }
  leftJoin() {
    return this;
  }
  where(condition: SQL) {
    this.conditions.push(condition);
    this.capturedConditions?.push(condition);
    return this;
  }
  getSQL() {
    return sql`select ${sql.join(this.conditions, sql` and `)}`;
  }
  orderBy() {
    return this;
  }
  limit() {
    return this;
  }
  offset() {
    return Promise.resolve(this.rows);
  }
  then<TResult1 = unknown[], TResult2 = never>(
    onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.rows).then(onfulfilled, onrejected);
  }
}

function createController(categoryFilter = false) {
  const conditions: SQL[] = [];
  let selectCount = 0;
  const db = {
    select: () => {
      selectCount += 1;
      const isCategorySubquery = categoryFilter && selectCount === 1;
      return new QueryStub([], isCategorySubquery ? undefined : conditions);
    },
  } as unknown as Database;
  return {
    controller: new DiscoveryController(db, {} as ReferenceDataRepository),
    conditions,
  };
}

function renderedConditions(conditions: SQL[]): { text: string; params: unknown[] } {
  const dialect = new PgDialect();
  const rendered = conditions.map((condition) => dialect.sqlToQuery(condition));
  return {
    text: rendered.map((query) => query.sql).join(' '),
    params: rendered.flatMap((query) => query.params),
  };
}

describe('DiscoveryController pagination validation', () => {
  const controller = new DiscoveryController(undefined, {} as ReferenceDataRepository);

  it('rejects page numbers below one before accessing the database', async () => {
    await expect(controller.listCommunities({ page: '0' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects page sizes above the public API limit', async () => {
    await expect(controller.listEvents({ pageSize: '101' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('uses Türkiye midnight boundaries and includes the selected end date', () => {
    const dateFilter = (
      controller as unknown as { date(value: string, end?: boolean): Date }
    ).date.bind(controller);
    expect(dateFilter('2026-10-21').toISOString()).toBe('2026-10-20T21:00:00.000Z');
    expect(dateFilter('2026-10-21', true).toISOString()).toBe('2026-10-21T21:00:00.000Z');
  });

  it('rejects calendar dates that JavaScript would otherwise normalize', () => {
    const dateFilter = (controller as unknown as { date(value: string): Date }).date.bind(
      controller,
    );
    expect(() => dateFilter('2026-02-31')).toThrow(BadRequestException);
  });

  it('limits community listings to active records and applies search and city filters', async () => {
    const { controller, conditions } = createController();
    await controller.listCommunities({ q: '  students  ', city: 'ankara' });

    const query = renderedConditions(conditions);
    expect(query.text).toContain('"communities"."archived" =');
    expect(query.text).toContain('"communities"."name" ilike');
    expect(query.text).toContain('"communities"."description" ilike');
    expect(query.text).toContain('"communities"."city_id" =');
    expect(query.params).toEqual(expect.arrayContaining([false, '%students%', 'ankara']));
  });

  it('adds the selected category to the community listing predicate', async () => {
    const { controller, conditions } = createController(true);
    await controller.listCommunities({ category: 'education' });

    const query = renderedConditions(conditions);
    expect(query.text).toContain('"communities"."id" in (select');
    expect(query.params).toContain('education');
  });

  it('limits event listings to public records and applies city and inclusive date filters', async () => {
    const { controller, conditions } = createController();
    await controller.listEvents({
      q: 'concert',
      city: 'ankara',
      from: '2026-10-21',
      to: '2026-10-22',
    });

    const query = renderedConditions(conditions);
    expect(query.text).toContain('"events"."visibility" =');
    expect(query.text).toContain('"events"."city_id" =');
    expect(query.text).toContain('"events"."starts_at" >=');
    expect(query.text).toContain('"events"."starts_at" <');
    expect(query.text).toContain('"events"."title" ilike');
    expect(query.params).toEqual(
      expect.arrayContaining([
        'public',
        'ankara',
        '%concert%',
        '2026-10-20T21:00:00.000Z',
        '2026-10-22T21:00:00.000Z',
      ]),
    );
  });
});
