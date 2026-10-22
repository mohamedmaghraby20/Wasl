/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import type { CommunitiesService } from '../communities/communities.service';
import type { EventsService } from '../events/events.service';
import { ParticipationService } from './participation.service';

function query(rows: unknown[]) {
  const builder = {
    from: () => builder,
    where: () => builder,
    for: () => builder,
    orderBy: () => builder,
    limit: async () => rows,
    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
  };
  return builder;
}

describe('ParticipationService', () => {
  const user: AuthenticatedUser = { id: '01a8e65b-5792-4e4e-ae7d-5b9765f5e920', authUserId: 'provider-user' };

  it('keeps an existing active community membership when the community is at capacity', async () => {
    const tx = {
      select: vi.fn()
        .mockImplementationOnce(() => query([{ id: 'community', admissionMode: 'automatic', capacity: 1, archived: false }]))
        .mockImplementationOnce(() => query([{ id: 'membership', status: 'ACTIVE' }])),
      update: vi.fn(),
      insert: vi.fn(),
    };
    const db = { transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx) };
    const service = new ParticipationService(db as unknown as Database, {} as CommunitiesService, {} as EventsService);

    await expect(service.joinCommunity(user, 'community')).resolves.toEqual({ status: 'ACTIVE' });
    expect(tx.select).toHaveBeenCalledTimes(2);
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('keeps an existing accepted event registration idempotent', async () => {
    const tx = {
      select: vi.fn()
        .mockImplementationOnce(() => query([{ id: 'event', admissionMode: 'automatic', capacity: 1, cancelled: false, startsAt: new Date('2099-01-01T00:00:00Z') }]))
        .mockImplementationOnce(() => query([{ id: 'registration', status: 'ACCEPTED' }])),
      update: vi.fn(),
      insert: vi.fn(),
    };
    const db = { transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx) };
    const service = new ParticipationService(db as unknown as Database, {} as CommunitiesService, {} as EventsService);

    await expect(service.registerForEvent(user, 'event')).resolves.toEqual({ status: 'ACCEPTED' });
    expect(tx.select).toHaveBeenCalledTimes(2);
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('denies organizer decisions before opening a transaction for a community they do not manage', async () => {
    const transaction = vi.fn();
    const communitiesService = { assertCanManage: vi.fn().mockRejectedValue(new ForbiddenException()) };
    const service = new ParticipationService(
      { transaction } as unknown as Database,
      communitiesService as unknown as CommunitiesService,
      {} as EventsService,
    );

    await expect(service.decideCommunity(user, 'community', 'membership', 'approve')).rejects.toBeInstanceOf(ForbiddenException);
    expect(communitiesService.assertCanManage).toHaveBeenCalledWith(user.id, 'community');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('denies organizer decisions before opening a transaction for an event they do not manage', async () => {
    const transaction = vi.fn();
    const eventsService = { assertCanManageById: vi.fn().mockRejectedValue(new ForbiddenException()) };
    const service = new ParticipationService(
      { transaction } as unknown as Database,
      {} as CommunitiesService,
      eventsService as unknown as EventsService,
    );

    await expect(service.decideEvent(user, 'event', 'registration', 'approve')).rejects.toBeInstanceOf(ForbiddenException);
    expect(eventsService.assertCanManageById).toHaveBeenCalledWith(user, 'event');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('promotes the oldest waitlisted community member after an active member leaves', async () => {
    const rows = [
      [{ id: 'community', capacity: 1, admissionMode: 'automatic' }],
      [{ id: 'leaving-member', status: 'ACTIVE' }],
      [{ value: 0 }],
      [{ id: 'oldest-waitlisted', status: 'WAITLISTED' }],
      [{ value: 1 }],
    ];
    const changes: unknown[] = [];
    const transitions: unknown[] = [];
    const tx = {
      select: vi.fn(() => query(rows.shift() ?? [])),
      update: vi.fn(() => ({
        set: vi.fn((change: unknown) => {
          changes.push(change);
          return { where: vi.fn().mockResolvedValue([]) };
        }),
      })),
      insert: vi.fn(() => ({ values: vi.fn((value: unknown) => { transitions.push(value); return Promise.resolve([]); }) })),
    };
    const db = { transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx) };
    const service = new ParticipationService(db as unknown as Database, {} as CommunitiesService, {} as EventsService);

    await expect(service.leaveCommunity(user, 'community')).resolves.toEqual({ status: 'LEFT' });
    expect(changes).toEqual([{ status: 'LEFT', updatedAt: expect.any(Date) }, { status: 'ACTIVE', updatedAt: expect.any(Date) }]);
    expect(transitions).toEqual([
      expect.objectContaining({ fromStatus: 'ACTIVE', toStatus: 'LEFT', actorUserId: user.id }),
      expect.objectContaining({ fromStatus: 'WAITLISTED', toStatus: 'ACTIVE', actorUserId: null }),
    ]);
  });
});
