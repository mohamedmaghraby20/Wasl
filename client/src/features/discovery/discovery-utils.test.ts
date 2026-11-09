import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { turkeyDateRange } from './discovery-utils';

describe('turkeyDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('covers today and the inclusive seven-day window', () => {
    vi.setSystemTime(new Date('2026-11-11T09:00:00Z'));
    expect(turkeyDateRange('today')).toEqual({ from: '2026-11-11', to: '2026-11-11' });
    expect(turkeyDateRange('next-7-days')).toEqual({ from: '2026-11-11', to: '2026-11-17' });
  });

  it('moves the weekend window to Saturday and Sunday', () => {
    vi.setSystemTime(new Date('2026-11-11T09:00:00Z'));
    expect(turkeyDateRange('weekend')).toEqual({ from: '2026-11-14', to: '2026-11-15' });
  });

  it('keeps Sunday inside the current weekend', () => {
    vi.setSystemTime(new Date('2026-11-15T09:00:00Z'));
    expect(turkeyDateRange('weekend')).toEqual({ from: '2026-11-15', to: '2026-11-15' });
  });
});
