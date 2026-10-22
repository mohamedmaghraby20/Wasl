import { describe, expect, it } from 'vitest';
import {
  assertCommunityTransition,
  assertEventTransition,
  type CommunityStatus,
} from './participation-transitions';

describe('participation transitions', () => {
  it('allows a new community request to enter only an eligible state', () => {
    for (const status of ['PENDING', 'WAITLISTED', 'ACTIVE'] as CommunityStatus[]) {
      expect(() => assertCommunityTransition(null, status)).not.toThrow();
    }
    expect(() => assertCommunityTransition(null, 'LEFT')).toThrow();
  });

  it('keeps waitlisted community members out of active-only states until promotion', () => {
    expect(() => assertCommunityTransition('WAITLISTED', 'ACTIVE')).not.toThrow();
    expect(() => assertCommunityTransition('WAITLISTED', 'LEFT')).not.toThrow();
    expect(() => assertCommunityTransition('WAITLISTED', 'PENDING')).toThrow();
  });

  it('allows a participant to cancel a registration but does not reopen attendance outcomes', () => {
    expect(() => assertEventTransition(null, 'ACCEPTED')).not.toThrow();
    expect(() => assertEventTransition('ACCEPTED', 'CANCELLED_BY_USER')).not.toThrow();
    expect(() => assertEventTransition('ATTENDED', 'ACCEPTED')).toThrow();
    expect(() => assertEventTransition('NO_SHOW', 'CANCELLED_BY_USER')).toThrow();
  });

  it('supports reapplying after a prior rejection without duplicating the relationship', () => {
    expect(() => assertCommunityTransition('REJECTED', 'PENDING')).not.toThrow();
    expect(() => assertEventTransition('REJECTED', 'PENDING')).not.toThrow();
  });
});
