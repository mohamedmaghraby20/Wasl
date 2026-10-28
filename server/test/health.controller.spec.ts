import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from '../src/common/http/health.controller';
import { DATABASE } from '../src/db/database.module';

async function createController(database: { execute: () => Promise<unknown> } | undefined) {
  const module = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: DATABASE, useValue: database }],
  }).compile();
  return module.get(HealthController);
}

describe('HealthController', () => {
  it('returns an OK health payload', async () => {
    const controller = await createController({ execute: vi.fn() });
    const result = controller.getHealth();
    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('reports readiness when the database responds', async () => {
    const execute = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    const controller = await createController({ execute });
    await expect(controller.getReadiness()).resolves.toMatchObject({
      status: 'ok',
      database: 'up',
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('reports not ready when the database query fails', async () => {
    const controller = await createController({
      execute: vi.fn().mockRejectedValue(new Error('connection refused')),
    });
    await expect(controller.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('reports not ready when no database is configured', async () => {
    const controller = await createController(undefined);
    await expect(controller.getReadiness()).rejects.toThrow('Database is not configured.');
  });
});
