import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { Database } from '../../db/database.module';
import type { PrivacyGateService, PrivacyGateState } from '../auth/privacy-gate.service';
import { PrivacyService } from './privacy.service';

describe('PrivacyService status reads', () => {
  it('loads status details while eligibility is still pending', async () => {
    let finishGate!: (state: PrivacyGateState) => void;
    const gate = { stateFor: () => new Promise<PrivacyGateState>((resolve) => { finishGate = resolve; }) };
    const select = vi.fn(() => {
      const builder = {
        from: () => builder,
        where: () => builder,
        orderBy: () => Promise.resolve([]),
      };
      return builder;
    });
    const service = new PrivacyService(
      { select } as unknown as Database,
      { get: () => undefined } as unknown as ConfigService,
      gate as unknown as PrivacyGateService,
      undefined!,
      undefined!,
    );
    const pending = service.status('member-1');
    expect(select).toHaveBeenCalledTimes(3);
    finishGate({ ageEligibility: '18_PLUS', requiresOnboarding: false, missingAcceptances: [] });
    await expect(pending).resolves.toMatchObject({
      ageEligibility: '18_PLUS', requiresOnboarding: false, documents: [], acceptedDocuments: [], openRequests: [],
    });
  });
});
