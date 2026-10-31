import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ pools: [] as Array<{ options: { max: number }; end: ReturnType<typeof vi.fn> }> }));
vi.mock('pg', () => ({ Pool: class {
  end = vi.fn().mockResolvedValue(undefined);
  constructor(readonly options: { max: number }) { mocks.pools.push(this); }
} }));
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: (pool: unknown) => pool }));

import { DATABASE, DatabaseModule, PROVIDER_DATABASE } from './database.module';

describe('database connection isolation', () => {
  beforeEach(() => { mocks.pools.length = 0; });

  it('reserves independent API and provider capacity within the existing ten-connection budget', async () => {
    const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), DatabaseModule] })
      .overrideProvider(ConfigService).useValue({ get: () => 'postgresql://localhost/test' }).compile();
    expect(module.get<unknown>(DATABASE)).toBe(mocks.pools[0]);
    expect(module.get<unknown>(PROVIDER_DATABASE)).toBe(mocks.pools[1]);
    expect(mocks.pools.map((pool) => pool.options.max)).toEqual([8, 2]);
    await module.close();
    for (const pool of mocks.pools) expect(pool.end).toHaveBeenCalledOnce();
  });

  it('keeps database-free startup and shutdown working', async () => {
    const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), DatabaseModule] })
      .overrideProvider(ConfigService).useValue({ get: () => undefined }).compile();
    expect(module.get<unknown>(DATABASE)).toBeUndefined();
    expect(module.get<unknown>(PROVIDER_DATABASE)).toBeUndefined();
    expect(mocks.pools).toHaveLength(0);
    await module.close();
  });
});
