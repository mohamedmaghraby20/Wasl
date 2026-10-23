import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import type { EventsService } from '../events/events.service';
import { DiscussionsService } from './discussions.service';

const user = { id: '2c39e966-e200-4290-8c0f-20c1d046cc30', authUserId: 'auth-1' };
const eventId = 'event-1';

function setup(status: string | null, manager = false, closed = false) {
  const results: unknown[][] = [
    [{ id: eventId }],
    [{ cancelled: closed }],
    status ? [{ status }] : [],
  ];
  const select = vi.fn(() => ({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve(results.shift() ?? []),
        for: () => Promise.resolve(results.shift() ?? []),
      }),
    }),
  }));
  const tx = { select };
  const db = {
    select,
    transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
  } as unknown as Database;
  const eventsService = {
    assertCanManageById: vi.fn(() =>
      manager ? Promise.resolve() : Promise.reject(new ForbiddenException()),
    ),
  } as unknown as EventsService;
  return { service: new DiscussionsService(db, eventsService, undefined!), select, db };
}

describe('Event discussion posting authorization', () => {
  it.each([null, 'PENDING', 'WAITLISTED', 'REJECTED', 'REMOVED_BY_ORGANIZER'])(
    'denies %s attendees',
    async (status) => {
      const { service } = setup(status);
      await expect(service.createEventPost(user, eventId, { body: 'Comment' })).rejects.toThrow(
        ForbiddenException,
      );
    },
  );

  it('denies a canceled event to an accepted attendee', async () => {
    const { service } = setup('ACCEPTED', false, true);
    await expect(service.createEventPost(user, eventId, { body: 'Comment' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('validates the body before database access', async () => {
    const { service, select } = setup('ACCEPTED');
    await expect(service.createEventPost(user, eventId, { body: '   ' })).rejects.toThrow();
    expect(select).not.toHaveBeenCalled();
  });
});
