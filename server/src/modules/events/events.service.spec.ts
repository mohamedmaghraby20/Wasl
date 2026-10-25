/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import type { CommunitiesService } from '../communities/communities.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import { EventsService } from './events.service';

function selectQuery(rows: unknown[]) {
  const query: any = {
    from: () => query,
    where: () => query,
    for: () => query,
    limit: async () => rows,
    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return query;
}

describe('EventsService', () => {
  it('creates a community-hosted event only in an authorized community', async () => {
    const rows = [[{ id: 'culture' }]];
    const inserted: unknown[] = [];
    const db = {
      select: vi.fn(() => selectQuery(rows.shift() ?? [])),
      transaction: async (
        work: (tx: {
          insert: () => { values: (value: unknown) => Promise<void> };
        }) => Promise<unknown>,
      ) =>
        work({
          insert: () => ({
            values: async (value) => {
              inserted.push(value);
            },
          }),
        }),
    };
    const communityAccess = {
      assertCanManage: vi.fn().mockResolvedValue({ id: 'community-id', name: 'Arabic Readers' }),
    };
    const service = new EventsService(
      db as unknown as Database,
      communityAccess as unknown as CommunitiesService,
      {} as OrganizationsService,
    );
    const user: AuthenticatedUser = { id: 'owner-id', authUserId: 'auth-id' };

    const result = await service.create(user, {
      title: 'Book exchange',
      description: 'Bring one book to share.',
      categoryIds: ['culture'],
      visibility: 'unlisted',
      startsAt: '2026-11-10T17:00:00.000Z',
      online: true,
      admissionMode: 'instant',
      communityId: 'community-id',
    });

    expect(communityAccess.assertCanManage).toHaveBeenCalledWith(user.id, 'community-id');
    expect(inserted[0]).toEqual(
      expect.objectContaining({
        hostType: 'community',
        hostId: 'community-id',
        createdByUserId: user.id,
        communityId: 'community-id',
        hostName: 'Arabic Readers',
        visibility: 'unlisted',
        cityId: null,
        online: true,
      }),
    );
    expect(result.slug).toMatch(/^book-exchange-/);
  });

  it('creates an organization-hosted event for an authorized manager and records the actor', async () => {
    const rows = [[{ id: 'culture' }]];
    const inserted: unknown[] = [];
    const db = {
      select: vi.fn(() => selectQuery(rows.shift() ?? [])),
      transaction: async (
        work: (tx: {
          insert: () => { values: (value: unknown) => Promise<void> };
        }) => Promise<unknown>,
      ) =>
        work({
          insert: () => ({
            values: async (value) => {
              inserted.push(value);
            },
          }),
        }),
    };
    const organizations = {
      assertCanManageOrganization: vi
        .fn()
        .mockResolvedValue({ id: 'organization-id', name: 'Wasl Students' }),
    };
    const communities = { assertCanManage: vi.fn() };
    const service = new EventsService(
      db as unknown as Database,
      communities as unknown as CommunitiesService,
      organizations as unknown as OrganizationsService,
    );
    const user: AuthenticatedUser = { id: 'manager-id', authUserId: 'supabase-id' };

    const result = await service.create(user, {
      title: 'Student gathering',
      description: 'Meet other students.',
      categoryIds: ['culture'],
      startsAt: '2026-11-10T17:00:00.000Z',
      online: true,
      admissionMode: 'instant',
      organizationId: 'organization-id',
    });

    expect(organizations.assertCanManageOrganization).toHaveBeenCalledWith(
      user.id,
      'organization-id',
    );
    expect(communities.assertCanManage).not.toHaveBeenCalled();
    expect(inserted[0]).toEqual(
      expect.objectContaining({
        hostType: 'organization',
        hostId: 'organization-id',
        hostName: 'Wasl Students',
        createdByUserId: user.id,
      }),
    );
    expect(result.slug).toMatch(/^student-gathering-/);
  });

  it('denies community event creation when the user cannot manage the host', async () => {
    const db = {
      select: vi.fn(() => selectQuery([{ id: 'culture' }])),
      transaction: vi.fn(),
    };
    const communityAccess = {
      assertCanManage: vi.fn().mockRejectedValue(new ForbiddenException()),
    };
    const service = new EventsService(
      db as unknown as Database,
      communityAccess as unknown as CommunitiesService,
      {} as OrganizationsService,
    );

    await expect(
      service.create(
        { id: 'other-user', authUserId: 'auth-id' },
        {
          title: 'Book exchange',
          description: 'Bring one book to share.',
          categoryIds: ['culture'],
          startsAt: '2026-11-10T17:00:00.000Z',
          online: true,
          admissionMode: 'instant',
          communityId: 'community-id',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('lets an organization manager cancel an organization-hosted event', async () => {
    const set = vi.fn(() => ({ where: async () => [] }));
    const tx = {
      select: vi
        .fn()
        .mockImplementationOnce(() => selectQuery([{ cancelled: false }]))
        .mockImplementationOnce(() => selectQuery([])),
      update: vi.fn(() => ({ set })),
    };
    const db = {
      select: vi.fn(() =>
        selectQuery([
          {
            id: 'event-id',
            slug: 'event-slug',
            hostType: 'organization',
            hostId: 'organization-id',
            communityId: null,
            cancelled: false,
          },
        ]),
      ),
      update: vi.fn(() => ({ set })),
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const organizations = {
      assertCanManageOrganization: vi
        .fn()
        .mockResolvedValue({ id: 'organization-id', name: 'Wasl Students' }),
    };
    const service = new EventsService(
      db as unknown as Database,
      {} as CommunitiesService,
      organizations as unknown as OrganizationsService,
    );

    await expect(
      service.cancel({ id: 'admin-id', authUserId: 'auth-id' }, 'event-id'),
    ).resolves.toEqual({ id: 'event-id', slug: 'event-slug' });
    expect(organizations.assertCanManageOrganization).toHaveBeenCalledWith(
      'admin-id',
      'organization-id',
    );
    expect(set).toHaveBeenCalledWith({ cancelled: true });
  });

  it('keeps event cancellation idempotent', async () => {
    const update = vi.fn();
    const db = {
      select: vi.fn(() =>
        selectQuery([
          {
            id: 'event-id',
            slug: 'event-slug',
            hostType: 'user',
            hostId: 'owner-id',
            communityId: null,
            cancelled: true,
          },
        ]),
      ),
      update,
    };
    const service = new EventsService(
      db as unknown as Database,
      {} as CommunitiesService,
      {} as OrganizationsService,
    );

    await expect(
      service.cancel({ id: 'owner-id', authUserId: 'auth-id' }, 'event-id'),
    ).resolves.toEqual({
      id: 'event-id',
      slug: 'event-slug',
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects lowering event capacity below accepted attendees', async () => {
    const dbRows = [
      [
        {
          id: 'event-id',
          slug: 'event',
          hostType: 'user',
          hostId: 'owner-id',
          communityId: null,
          cancelled: false,
        },
      ],
      [{ id: 'culture' }],
    ];
    const txRows = [[{ id: 'event-id' }], [{ value: 5 }]];
    const tx = {
      select: vi.fn(() => selectQuery(txRows.shift() ?? [])),
      update: vi.fn(),
      delete: vi.fn(),
      insert: vi.fn(),
    };
    const db = {
      select: vi.fn(() => selectQuery(dbRows.shift() ?? [])),
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new EventsService(
      db as unknown as Database,
      {} as CommunitiesService,
      {} as OrganizationsService,
    );

    await expect(
      service.update({ id: 'owner-id', authUserId: 'auth-id' }, 'event-id', {
        title: 'Book exchange',
        description: 'Bring one book.',
        categoryIds: ['culture'],
        startsAt: '2099-11-10T17:00:00.000Z',
        online: true,
        admissionMode: 'automatic',
        capacity: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.update).not.toHaveBeenCalled();
  });
});
