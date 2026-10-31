import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateReportDto } from './moderation.dto';
import { ModerationService } from './moderation.service';

describe('report target IDs', () => {
  it.each(['community', 'event'] as const)(
    'accepts text IDs for %s reports',
    async (targetType) => {
      const input = Object.assign(new CreateReportDto(), {
        targetType,
        targetId: `dev-seed-${targetType}-07`,
        reason: 'Sample report',
      });
      expect(await validate(input)).toEqual([]);
      const service = new ModerationService(undefined, undefined!, undefined!, undefined!);
      await expect(service.report('reporter', input)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    },
  );

  it.each(['user', 'organization', 'post'] as const)(
    'retains UUID validation for %s targets',
    async (targetType) => {
      const service = new ModerationService(undefined, undefined!, undefined!, undefined!);
      await expect(
        service.report('reporter', {
          targetType,
          targetId: 'not-a-uuid',
          reason: 'Sample report',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each(['', 123, 'x'.repeat(81)])('rejects invalid text target %s', async (targetId) => {
    const input = Object.assign(new CreateReportDto(), {
      targetType: 'community',
      targetId,
      reason: 'Sample report',
    });
    expect((await validate(input)).some((error) => error.property === 'targetId')).toBe(true);
  });
});
