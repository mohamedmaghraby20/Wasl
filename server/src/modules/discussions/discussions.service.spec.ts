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

describe('Event discussion reads', () => {
  it('joins the event and thread, then starts count and posts together', async () => {
    let finishCount!: (rows: unknown[]) => void;
    const countResult = new Promise<unknown[]>((resolve) => { finishCount = resolve; });
    const select = vi.fn((fields: Record<string, unknown>) => {
      const result = 'threadId' in fields
        ? Promise.resolve([{ id: eventId, threadId: 'thread-1', archivedAt: new Date() }])
        : 'total' in fields ? countResult : Promise.resolve([]);
      const builder = {
        from: () => builder,
        leftJoin: () => builder,
        innerJoin: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: () => builder,
        offset: () => builder,
        then: result.then.bind(result),
      };
      return builder;
    });
    const service = new DiscussionsService({ select } as unknown as Database, undefined!, undefined!);
    const pending = service.eventPosts(eventId);
    await vi.waitFor(() => expect(select).toHaveBeenCalledTimes(3));
    finishCount([{ total: 0 }]);
    await expect(pending).resolves.toMatchObject({ items: [], total: 0, closed: true });
  });

  it('returns an empty page without count or post reads when no thread exists', async () => {
    const select = vi.fn(() => ({ from: () => ({
      leftJoin: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: eventId, threadId: null }]) }) }),
    }) }));
    const service = new DiscussionsService({ select } as unknown as Database, undefined!, undefined!);
    await expect(service.eventPosts(eventId)).resolves.toMatchObject({ items: [], total: 0, closed: false });
    expect(select).toHaveBeenCalledOnce();
  });
});
