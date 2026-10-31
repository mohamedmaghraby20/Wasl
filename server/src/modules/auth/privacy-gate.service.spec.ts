import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import { PrivacyGateService } from './privacy-gate.service';

describe('PrivacyGateService read scheduling', () => {
  it('starts all independent reads before waiting and still requires the latest documents', async () => {
    const releases: Array<(rows: unknown[]) => void> = [];
    const select = vi.fn(() => {
      const result = new Promise<unknown[]>((resolve) => releases.push(resolve));
      const builder = {
        from: () => builder,
        where: () => builder,
        limit: () => result,
        orderBy: () => result,
        then: result.then.bind(result),
      };
      return builder;
    });
    const service = new PrivacyGateService({ select } as unknown as Database);
    const pending = service.stateFor('member-1');
    expect(select).toHaveBeenCalledTimes(3);
    releases[0]!([{ status: '18_PLUS' }]);
    releases[1]!([
      { documentType: 'TERMS_OF_USE', version: '2' },
      { documentType: 'TERMS_OF_USE', version: '1' },
      { documentType: 'PRIVACY_NOTICE', version: '1' },
    ]);
    releases[2]!([
      { documentType: 'TERMS_OF_USE', version: '1' },
      { documentType: 'PRIVACY_NOTICE', version: '1' },
    ]);
    await expect(pending).resolves.toEqual({
      ageEligibility: '18_PLUS',
      missingAcceptances: [{ documentType: 'TERMS_OF_USE', version: '2' }],
      requiresOnboarding: true,
    });
  });
});
