export type CommunityStatus = 'PENDING' | 'WAITLISTED' | 'ACTIVE' | 'REJECTED' | 'LEFT' | 'REMOVED';
export type EventStatus =
  | 'PENDING'
  | 'WAITLISTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED_BY_USER'
  | 'REMOVED_BY_ORGANIZER'
  | 'ATTENDED'
  | 'NO_SHOW';

const communityTransitions: Record<CommunityStatus | 'NEW', ReadonlySet<CommunityStatus>> = {
  NEW: new Set(['PENDING', 'WAITLISTED', 'ACTIVE']),
  PENDING: new Set(['WAITLISTED', 'ACTIVE', 'REJECTED', 'LEFT', 'REMOVED']),
  WAITLISTED: new Set(['ACTIVE', 'REJECTED', 'LEFT', 'REMOVED']),
  ACTIVE: new Set(['LEFT', 'REMOVED']),
  REJECTED: new Set(['PENDING', 'WAITLISTED', 'ACTIVE']),
  LEFT: new Set(['PENDING', 'WAITLISTED', 'ACTIVE']),
  REMOVED: new Set(['PENDING', 'WAITLISTED', 'ACTIVE']),
};

const eventTransitions: Record<EventStatus | 'NEW', ReadonlySet<EventStatus>> = {
  NEW: new Set(['PENDING', 'WAITLISTED', 'ACCEPTED']),
  PENDING: new Set(['WAITLISTED', 'ACCEPTED', 'REJECTED', 'CANCELLED_BY_USER', 'REMOVED_BY_ORGANIZER']),
  WAITLISTED: new Set(['ACCEPTED', 'REJECTED', 'CANCELLED_BY_USER', 'REMOVED_BY_ORGANIZER']),
  ACCEPTED: new Set(['CANCELLED_BY_USER', 'REMOVED_BY_ORGANIZER', 'ATTENDED', 'NO_SHOW']),
  REJECTED: new Set(['PENDING', 'WAITLISTED', 'ACCEPTED']),
  CANCELLED_BY_USER: new Set(['PENDING', 'WAITLISTED', 'ACCEPTED']),
  REMOVED_BY_ORGANIZER: new Set(['PENDING', 'WAITLISTED', 'ACCEPTED']),
  ATTENDED: new Set(['NO_SHOW']),
  NO_SHOW: new Set(['ATTENDED']),
};

export function assertCommunityTransition(from: CommunityStatus | null, to: CommunityStatus): void {
  if (!communityTransitions[from ?? 'NEW'].has(to)) {
    throw new Error(`Invalid community membership transition: ${from ?? 'NEW'} -> ${to}`);
  }
}

export function assertEventTransition(from: EventStatus | null, to: EventStatus): void {
  if (!eventTransitions[from ?? 'NEW'].has(to)) {
    throw new Error(`Invalid event registration transition: ${from ?? 'NEW'} -> ${to}`);
  }
}

export function sameStatus<T extends string>(from: T | null, to: T): boolean {
  return from === to;
}
