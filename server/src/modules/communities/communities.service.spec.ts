/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import type { OrganizationsService } from '../organizations/organizations.service';
import { CommunitiesService } from './communities.service';

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

describe('CommunitiesService', () => {
  it('creates a community with the authenticated account as owner', async () => {
    const rows = [[{ id: 'ankara' }], [{ id: 'education' }], [{ displayName: 'Community Host' }]];
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
    const service = new CommunitiesService(db as unknown as Database, {} as OrganizationsService);
    const user: AuthenticatedUser = { id: 'wasl-user-id', authUserId: 'supabase-user-id' };

    const result = await service.create(user, {
      name: 'Ankara Arabic Learners',
      description: 'A place to practice together.',
      cityId: 'ankara',
      categoryIds: ['education'],
      admissionMode: 'approval',
      capacity: 24,
    });

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.slug).toMatch(/^ankara-arabic-learners-/);
    expect(inserted[0]).toEqual(
      expect.objectContaining({
        ownerType: 'user',
        ownerId: user.id,
        createdByUserId: user.id,
        hostName: 'Community Host',
        admissionMode: 'approval',
        capacity: 24,
      }),
    );
    expect(inserted[1]).toEqual([{ communityId: result.id, categoryId: 'education' }]);
  });

  it('creates an organization-owned community with the acting user recorded', async () => {
    const rows = [[{ id: 'ankara' }], [{ id: 'education' }]];
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
    const service = new CommunitiesService(
      db as unknown as Database,
      organizations as unknown as OrganizationsService,
    );
    const user: AuthenticatedUser = { id: 'owner-user-id', authUserId: 'supabase-user-id' };

    const result = await service.create(user, {
      name: 'Student Network',
      description: 'A network for students.',
      cityId: 'ankara',
      categoryIds: ['education'],
      admissionMode: 'open',
      organizationId: 'organization-id',
    });

    expect(organizations.assertCanManageOrganization).toHaveBeenCalledWith(
      user.id,
      'organization-id',
    );
    expect(inserted[0]).toEqual(
      expect.objectContaining({
        ownerType: 'organization',
        ownerId: 'organization-id',
        createdByUserId: user.id,
        hostName: 'Wasl Students',
      }),
    );
    expect(result.slug).toMatch(/^student-network-/);
  });

  it('does not let a non-owner update a community', async () => {
    const update = vi.fn();
    const transaction = vi.fn();
    const db = { select: vi.fn(() => selectQuery([])), update, transaction };
    const service = new CommunitiesService(db as unknown as Database, {} as OrganizationsService);
    const user: AuthenticatedUser = { id: 'different-owner', authUserId: 'auth-user-id' };

    await expect(
      service.update(user, 'community-id', {
        name: 'Changed name',
        description: 'Changed description',
        cityId: 'ankara',
        categoryIds: ['education'],
        admissionMode: 'open',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('lists user-owned and organization-owned communities the user can manage', async () => {
    const organizations = {
      listMine: vi.fn().mockResolvedValue([{ id: 'organization-a' }, { id: 'organization-b' }]),
    };
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectQuery([{ id: 'user-community', name: 'Beta', slug: 'beta' }]))
        .mockReturnValueOnce(
          selectQuery([
            { id: 'org-community', name: 'Alpha', slug: 'alpha' },
            { id: 'second-org-community', name: 'Gamma', slug: 'gamma' },
          ]),
        ),
    };
    const service = new CommunitiesService(
      db as unknown as Database,
      organizations as unknown as OrganizationsService,
    );

    await expect(service.listMine({ id: 'manager-id', authUserId: 'auth-id' })).resolves.toEqual([
      { id: 'org-community', name: 'Alpha', slug: 'alpha' },
      { id: 'user-community', name: 'Beta', slug: 'beta' },
      { id: 'second-org-community', name: 'Gamma', slug: 'gamma' },
    ]);
    expect(organizations.listMine).toHaveBeenCalledWith('manager-id');
  });

  it('lets an organization manager manage an organization-owned community', async () => {
    const organizations = {
      assertCanManageOrganization: vi
        .fn()
        .mockResolvedValue({ id: 'organization-id', name: 'Wasl Students' }),
    };
    const db = {
      select: vi.fn(() =>
        selectQuery([
          {
            id: 'community-id',
            name: 'Student Network',
            ownerType: 'organization',
            ownerId: 'organization-id',
          },
        ]),
      ),
    };
    const service = new CommunitiesService(
      db as unknown as Database,
      organizations as unknown as OrganizationsService,
    );

    await expect(service.assertCanManage('admin-id', 'community-id')).resolves.toEqual({
      id: 'community-id',
      name: 'Student Network',
    });
    expect(organizations.assertCanManageOrganization).toHaveBeenCalledWith(
      'admin-id',
      'organization-id',
    );
  });

  it('denies community management to users outside the owning organization', async () => {
    const organizations = {
      assertCanManageOrganization: vi
        .fn()
        .mockRejectedValue(
          new ForbiddenException('Organization management permission is required.'),
        ),
    };
    const db = {
      select: vi.fn(() =>
        selectQuery([
          {
            id: 'community-id',
            name: 'Student Network',
            ownerType: 'organization',
            ownerId: 'organization-id',
          },
        ]),
      ),
    };
    const service = new CommunitiesService(
      db as unknown as Database,
      organizations as unknown as OrganizationsService,
    );

    await expect(service.assertCanManage('outsider-id', 'community-id')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets an organization Admin update an organization-owned community', async () => {
    const rows = [
      [
        {
          id: 'community-id',
          slug: 'community',
          archived: false,
          ownerType: 'organization',
          ownerId: 'organization-id',
        },
      ],
      [{ id: 'ankara' }],
      [{ id: 'education' }],
    ];
    const txRows = [[{ id: 'community-id' }], [{ value: 0 }]];
    const tx = {
      select: vi.fn(() => selectQuery(txRows.shift() ?? [])),
      update: vi.fn(() => ({ set: () => ({ where: async () => [] }) })),
      delete: vi.fn(() => ({ where: async () => [] })),
      insert: vi.fn(() => ({ values: async () => [] })),
    };
    const organizations = {
      assertCanManageOrganization: vi
        .fn()
        .mockResolvedValue({ id: 'organization-id', name: 'Wasl Students' }),
    };
    const db = {
      select: vi.fn(() => selectQuery(rows.shift() ?? [])),
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new CommunitiesService(
      db as unknown as Database,
      organizations as unknown as OrganizationsService,
    );

    await expect(
      service.update({ id: 'admin-id', authUserId: 'admin-auth-id' }, 'community-id', {
        name: 'Student Network',
        description: 'A network for students.',
        cityId: 'ankara',
        categoryIds: ['education'],
        admissionMode: 'open',
      }),
    ).resolves.toEqual({ id: 'community-id', slug: 'community' });
    expect(organizations.assertCanManageOrganization).toHaveBeenCalledWith(
      'admin-id',
      'organization-id',
    );
  });

  it('rejects lowering community capacity below its active members', async () => {
    const rows = [
      [
        {
          id: 'community-id',
          slug: 'community',
          archived: false,
          ownerType: 'user',
          ownerId: 'owner-id',
        },
      ],
      [{ id: 'ankara' }],
      [{ id: 'education' }],
      [{ id: 'community-id' }],
      [{ value: 4 }],
    ];
    const tx = {
      select: vi.fn(() => selectQuery(rows.shift() ?? [])),
      update: vi.fn(),
      delete: vi.fn(),
      insert: vi.fn(),
    };
    const db = {
      select: vi.fn(() => selectQuery(rows.shift() ?? [])),
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new CommunitiesService(db as unknown as Database, {} as OrganizationsService);

    await expect(
      service.update({ id: 'owner-id', authUserId: 'auth-id' }, 'community-id', {
        name: 'Ankara group',
        description: 'Meet and learn together.',
        cityId: 'ankara',
        categoryIds: ['education'],
        admissionMode: 'automatic',
        capacity: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.update).not.toHaveBeenCalled();
  });
});
