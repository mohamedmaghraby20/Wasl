import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { HealthController } from '../src/common/http/health.controller';

describe('HealthController', () => {
  it('returns an OK health payload', async () => {
    const module = await Test.createTestingModule({ controllers: [HealthController] }).compile();
    const controller = module.get(HealthController);
    const result = controller.getHealth();
    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
