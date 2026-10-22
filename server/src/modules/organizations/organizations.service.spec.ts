/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import { OrganizationsService } from './organizations.service';

function selectQuery(rows: unknown[]) {
  const query: any = {
    from: () => query,
    leftJoin: () => query,
    innerJoin: () => query,
    where: () => query,
    for: () => query,
    limit: async () => rows,
    orderBy: async () => rows,
    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return query;
}

function updateQuery(updated: unknown[]) {
  const query: any = {
    set: () => query,
    where: async () => updated,
  };
  return query;
}

describe('OrganizationsService', () => {
  it('creates an independent organization with the authenticated user as its sole initial owner', async () => {
    const inserted: unknown[] = [];
    const db = {
      select: vi.fn(() => selectQuery([{ id: 'ankara' }])),
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
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    const result = await service.create(
      { id: 'wasl-user-id', authUserId: 'supabase-user-id' },
      {
        name: '  Ankara Student Association  ',
        description: '  Student activities across Ankara.  ',
        type: '  Student association  ',
        cityId: 'ankara',
        locationName: '  Ã‡ankaya  ',
        websiteUrl: '  https://example.test  ',
      },
    );

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.slug).toMatch(/^ankara-student-association-/);
    expect(inserted).toEqual([
      expect.objectContaining({
        id: result.id,
        ownerUserId: 'wasl-user-id',
        slug: result.slug,
        name: 'Ankara Student Association',
        description: 'Student activities across Ankara.',
        type: 'Student association',
        cityId: 'ankara',
        locationName: 'Ã‡ankaya',
        websiteUrl: 'https://example.test',
        socialUrl: null,
      }),
    ]);
  });

  it('rejects organization creation with an unknown city before inserting', async () => {
    const transaction = vi.fn();
    const db = { select: vi.fn(() => selectQuery([])), transaction };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.create(
        { id: 'wasl-user-id', authUserId: 'supabase-user-id' },
        {
          name: 'Association',
          description: 'A valid description.',
          type: 'Association',
          cityId: 'missing',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects unsafe organization links before inserting', async () => {
    const transaction = vi.fn();
    const db = { select: vi.fn(), transaction };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.create(
        { id: 'wasl-user-id', authUserId: 'supabase-user-id' },
        {
          name: 'Association',
          description: 'A valid description.',
          type: 'Association',
          websiteUrl: 'javascript:alert(1)',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns only safe public profile fields and public resource links', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([
            {
              id: '169cda83-bde3-4dc7-99a7-607a985f0e7f',
              slug: 'wasl-students',
              name: 'Wasl Students',
              description: 'Student activities across Türkiye.',
              type: 'Student association',
              cityId: 'ankara',
              cityName: 'Ankara',
              locationName: 'Çankaya',
              websiteUrl: 'https://example.test',
              socialUrl: null,
              verificationStatus: 'VERIFIED',
            },
          ]),
        )
        .mockReturnValueOnce(selectQuery([{ slug: 'arabic-learners', name: 'Arabic Learners' }]))
        .mockReturnValueOnce(selectQuery([{ slug: 'orientation-day', name: 'Orientation Day' }])),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(service.getPublic('wasl-students')).resolves.toEqual({
      id: '169cda83-bde3-4dc7-99a7-607a985f0e7f',
      slug: 'wasl-students',
      name: 'Wasl Students',
      description: 'Student activities across Türkiye.',
      type: 'Student association',
      cityId: 'ankara',
      cityName: 'Ankara',
      locationName: 'Çankaya',
      websiteUrl: 'https://example.test',
      socialUrl: null,
      verificationStatus: 'VERIFIED',
      logoUrl: null,
      resources: [
        { kind: 'community', slug: 'arabic-learners', name: 'Arabic Learners' },
        { kind: 'event', slug: 'orientation-day', name: 'Orientation Day' },
      ],
    });
  });

  it('does not reveal a missing organization', async () => {
    const db = { select: vi.fn(() => selectQuery([])) };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(service.getPublic('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists only organizations where the user is Owner or Admin without duplicate roles', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([{ id: 'owned-id', slug: 'owned', name: 'Wasl A', role: 'OWNER' }]),
        )
        .mockReturnValueOnce(
          selectQuery([{ id: 'admin-id', slug: 'admin', name: 'Wasl B', role: 'ADMIN' }]),
        ),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(service.listMine('user-id')).resolves.toEqual([
      { id: 'owned-id', slug: 'owned', name: 'Wasl A', role: 'OWNER' },
      { id: 'admin-id', slug: 'admin', name: 'Wasl B', role: 'ADMIN' },
    ]);
  });

  it('creates a seven-day invitation for an active Wasl User and stores only its hash', async () => {
    const rows = [
      [{ id: 'organization-id', ownerUserId: 'owner-id' }],
      [{ id: 'target-id', accountStatus: 'ACTIVE' }],
      [],
      [],
    ];
    const inserted: unknown[] = [];
    const tx = {
      select: vi.fn(() => selectQuery(rows.shift() ?? [])),
      insert: vi.fn(() => ({
        values: async (value: unknown) => {
          inserted.push(value);
        },
      })),
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    const invitation = await service.createAdminInvitation(
      { id: 'owner-id', authUserId: 'owner-auth-id' },
      'organization-id',
      { targetEmail: '  TARGET@EXAMPLE.TEST ' },
    );
    const stored = inserted[0] as {
      targetUserId: string;
      invitedByUserId: string;
      tokenHash: string;
      expiresAt: Date;
    };

    expect(stored).toEqual(
      expect.objectContaining({
        targetUserId: 'target-id',
        invitedByUserId: 'owner-id',
        tokenHash: createHash('sha256').update(invitation.token).digest('hex'),
      }),
    );
    expect(stored.tokenHash).not.toBe(invitation.token);
    expect(stored.tokenHash).toHaveLength(64);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
  });

  it('does not create invitations for non-Owners', async () => {
    const insert = vi.fn();
    const tx = {
      select: vi.fn(() => selectQuery([{ id: 'organization-id', ownerUserId: 'owner-id' }])),
      insert,
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.createAdminInvitation(
        { id: 'admin-id', authUserId: 'admin-auth-id' },
        'organization-id',
        { targetEmail: 'target@example.test' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('lists the owner and scoped admins for an authorized manager', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([
            { id: 'organization-id', slug: 'wasl-students', name: 'Wasl', ownerUserId: 'owner-id' },
          ]),
        )
        .mockReturnValueOnce(selectQuery([{ userId: 'admin-a' }]))
        .mockReturnValueOnce(selectQuery([{ userId: 'owner-id', displayName: 'Owner Name' }]))
        .mockReturnValueOnce(
          selectQuery([
            { userId: 'admin-a', displayName: 'Admin A' },
            { userId: 'admin-b', displayName: null },
          ]),
        ),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(service.listManagers('admin-a', 'organization-id')).resolves.toEqual([
      { userId: 'owner-id', displayName: 'Owner Name', role: 'OWNER' },
      { userId: 'admin-a', displayName: 'Admin A', role: 'ADMIN' },
      { userId: 'admin-b', displayName: null, role: 'ADMIN' },
    ]);
  });

  it('does not expose managers to a user outside the organization', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([
            { id: 'organization-id', slug: 'wasl-students', name: 'Wasl', ownerUserId: 'owner-id' },
          ]),
        )
        .mockReturnValueOnce(selectQuery([])),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(service.listManagers('outsider-id', 'organization-id')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('removes an Admin only for the Owner', async () => {
    const deleted: unknown[] = [];
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectQuery([{ id: 'organization-id', ownerUserId: 'owner-id' }]))
        .mockReturnValueOnce(selectQuery([{ userId: 'admin-id' }])),
      delete: vi.fn(() => ({
        where: async (condition: unknown) => {
          deleted.push(condition);
        },
      })),
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.removeAdmin(
        { id: 'owner-id', authUserId: 'owner-auth-id' },
        'organization-id',
        'admin-id',
      ),
    ).resolves.toEqual({ userId: 'admin-id' });
    expect(deleted).toHaveLength(1);
  });

  it('does not remove the Owner or allow a non-Owner to remove Admins', async () => {
    const ownerDelete = vi.fn();
    const ownerTx = {
      select: vi.fn(() => selectQuery([{ id: 'organization-id', ownerUserId: 'owner-id' }])),
      delete: ownerDelete,
    };
    const ownerDb = {
      transaction: async (work: (transaction: typeof ownerTx) => Promise<unknown>) => work(ownerTx),
    };
    const ownerService = new OrganizationsService(
      ownerDb as unknown as Database,
      undefined,
      undefined,
    );

    await expect(
      ownerService.removeAdmin(
        { id: 'owner-id', authUserId: 'owner-auth-id' },
        'organization-id',
        'owner-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ownerDelete).not.toHaveBeenCalled();

    const adminDelete = vi.fn();
    const adminTx = {
      select: vi.fn(() => selectQuery([{ id: 'organization-id', ownerUserId: 'owner-id' }])),
      delete: adminDelete,
    };
    const adminDb = {
      transaction: async (work: (transaction: typeof adminTx) => Promise<unknown>) => work(adminTx),
    };
    const adminService = new OrganizationsService(
      adminDb as unknown as Database,
      undefined,
      undefined,
    );

    await expect(
      adminService.removeAdmin(
        { id: 'admin-id', authUserId: 'admin-auth-id' },
        'organization-id',
        'other-admin-id',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(adminDelete).not.toHaveBeenCalled();
  });

  it('reports a missing Admin removal target', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectQuery([{ id: 'organization-id', ownerUserId: 'owner-id' }]))
        .mockReturnValueOnce(selectQuery([])),
      delete: vi.fn(),
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.removeAdmin(
        { id: 'owner-id', authUserId: 'owner-auth-id' },
        'organization-id',
        'missing-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it('activates Admin access only for the invited account and consumes the invitation atomically', async () => {
    const token = 'a'.repeat(43);
    const expiresAt = new Date(Date.now() + 60_000);
    const txRows = [
      [{ id: 'organization-id', slug: 'wasl-students', ownerUserId: 'owner-id' }],
      [
        {
          id: 'invitation-id',
          organizationId: 'organization-id',
          targetUserId: 'target-id',
          invitedByUserId: 'owner-id',
          expiresAt,
          status: 'PENDING',
        },
      ],
      [],
    ];
    const inserted: unknown[] = [];
    const updated: unknown[] = [];
    const tx = {
      select: vi.fn(() => selectQuery(txRows.shift() ?? [])),
      insert: vi.fn(() => ({
        values: async (value: unknown) => {
          inserted.push(value);
        },
      })),
      update: vi.fn(() => ({
        set: (value: unknown) => {
          updated.push(value);
          return { where: async () => [] };
        },
      })),
    };
    const db = {
      select: vi.fn(() => selectQuery([{ organizationId: 'organization-id' }])),
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.acceptAdminInvitation({ id: 'target-id', authUserId: 'target-auth-id' }, token),
    ).resolves.toEqual({
      organizationId: 'organization-id',
      organizationSlug: 'wasl-students',
      role: 'ADMIN',
    });
    expect(inserted).toEqual([{ organizationId: 'organization-id', userId: 'target-id' }]);
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ status: 'ACCEPTED' });
    expect((updated[0] as { respondedAt: unknown }).respondedAt).toBeInstanceOf(Date);
  });

  it('rejects an invitation used by a different Wasl User', async () => {
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectQuery([{ id: 'organization-id', ownerUserId: 'owner-id' }]))
        .mockReturnValueOnce(
          selectQuery([
            {
              id: 'invitation-id',
              organizationId: 'organization-id',
              targetUserId: 'target-id',
              invitedByUserId: 'owner-id',
              expiresAt: new Date(Date.now() + 60_000),
              status: 'PENDING',
            },
          ]),
        ),
      insert: vi.fn(),
    };
    const db = {
      select: vi.fn(() => selectQuery([{ organizationId: 'organization-id' }])),
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.acceptAdminInvitation(
        { id: 'other-id', authUserId: 'other-auth-id' },
        'b'.repeat(43),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('rejects expired and already-used invitation tokens', async () => {
    const cases = [
      { status: 'PENDING', expiresAt: new Date(Date.now() - 1_000) },
      { status: 'ACCEPTED', expiresAt: new Date(Date.now() + 60_000) },
    ];

    for (const invitation of cases) {
      const tx = {
        select: vi
          .fn()
          .mockReturnValueOnce(selectQuery([{ id: 'organization-id', ownerUserId: 'owner-id' }]))
          .mockReturnValueOnce(
            selectQuery([
              {
                id: 'invitation-id',
                organizationId: 'organization-id',
                targetUserId: 'target-id',
                invitedByUserId: 'owner-id',
                ...invitation,
              },
            ]),
          ),
        insert: vi.fn(),
      };
      const db = {
        select: vi.fn(() => selectQuery([{ organizationId: 'organization-id' }])),
        transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
      };
      const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

      await expect(
        service.acceptAdminInvitation(
          { id: 'target-id', authUserId: 'target-auth-id' },
          'c'.repeat(43),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.insert).not.toHaveBeenCalled();
    }
  });

  it('transfers ownership to an active Admin and keeps the previous Owner as Admin', async () => {
    const updates: unknown[] = [];
    const inserted: unknown[] = [];
    const deleted: unknown[] = [];
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([{ id: 'organization-id', slug: 'wasl-students', ownerUserId: 'owner-id' }]),
        )
        .mockReturnValueOnce(selectQuery([{ id: 'target-id', accountStatus: 'ACTIVE' }]))
        .mockReturnValueOnce(selectQuery([{ userId: 'target-id' }])),
      update: vi.fn(() => ({
        set: (value: unknown) => {
          updates.push(value);
          return { where: async () => [] };
        },
      })),
      delete: vi.fn(() => ({
        where: async (condition: unknown) => {
          deleted.push(condition);
        },
      })),
      insert: vi.fn(() => ({
        values: async (value: unknown) => {
          inserted.push(value);
        },
      })),
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.transferOwnership(
        { id: 'owner-id', authUserId: 'owner-auth-id' },
        'organization-id',
        'target-id',
      ),
    ).resolves.toEqual({
      id: 'organization-id',
      slug: 'wasl-students',
      ownerUserId: 'target-id',
      previousOwnerRole: 'ADMIN',
    });
    expect(updates).toEqual([expect.objectContaining({ ownerUserId: 'target-id' })]);
    expect(deleted).toHaveLength(1);
    expect(inserted).toEqual([{ organizationId: 'organization-id', userId: 'owner-id' }]);
  });

  it('does not transfer ownership for an Admin or to a user who is not an Admin', async () => {
    const update = vi.fn();
    const adminTx = {
      select: vi.fn(() =>
        selectQuery([{ id: 'organization-id', slug: 'wasl-students', ownerUserId: 'owner-id' }]),
      ),
      update,
      delete: vi.fn(),
      insert: vi.fn(),
    };
    const adminDb = {
      transaction: async (work: (transaction: typeof adminTx) => Promise<unknown>) => work(adminTx),
    };
    const adminService = new OrganizationsService(
      adminDb as unknown as Database,
      undefined,
      undefined,
    );
    await expect(
      adminService.transferOwnership(
        { id: 'admin-id', authUserId: 'admin-auth-id' },
        'organization-id',
        'target-id',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();

    const targetTx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([{ id: 'organization-id', slug: 'wasl-students', ownerUserId: 'owner-id' }]),
        )
        .mockReturnValueOnce(selectQuery([{ id: 'target-id', accountStatus: 'ACTIVE' }]))
        .mockReturnValueOnce(selectQuery([])),
      update,
      delete: vi.fn(),
      insert: vi.fn(),
    };
    const targetDb = {
      transaction: async (work: (transaction: typeof targetTx) => Promise<unknown>) =>
        work(targetTx),
    };
    const targetService = new OrganizationsService(
      targetDb as unknown as Database,
      undefined,
      undefined,
    );
    await expect(
      targetService.transferOwnership(
        { id: 'owner-id', authUserId: 'owner-auth-id' },
        'organization-id',
        'target-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('stores a verification request for an Owner and reopens a rejected organization', async () => {
    const inserted: unknown[] = [];
    const updates: unknown[] = [];
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([
            {
              id: 'organization-id',
              ownerUserId: 'owner-id',
              verificationStatus: 'REJECTED',
            },
          ]),
        )
        .mockReturnValueOnce(selectQuery([])),
      insert: vi.fn(() => ({
        values: (value: unknown) => {
          inserted.push(value);
          return {
            returning: async () => [
              {
                id: 'request-id',
                status: 'PENDING',
                decisionNote: null,
                decidedAt: null,
                createdAt: new Date(),
                ...(value as object),
              },
            ],
          };
        },
      })),
      update: vi.fn(() => ({
        set: (value: unknown) => {
          updates.push(value);
          return { where: async () => [] };
        },
      })),
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.requestVerification(
        { id: 'owner-id', authUserId: 'owner-auth-id' },
        'organization-id',
        { note: '  Please review our public profile.  ' },
      ),
    ).resolves.toMatchObject({ id: 'request-id', status: 'PENDING' });
    expect(inserted).toEqual([
      {
        organizationId: 'organization-id',
        requestedByUserId: 'owner-id',
        requestNote: 'Please review our public profile.',
      },
    ]);
    expect(updates).toEqual([expect.objectContaining({ verificationStatus: 'PENDING' })]);
  });

  it('allows a scoped Admin to request verification but rejects duplicate or verified requests', async () => {
    const requestAsAdmin = async (
      organizationRows: unknown[],
      pendingRows: unknown[],
    ): Promise<unknown> => {
      const tx = {
        select: vi
          .fn()
          .mockReturnValueOnce(selectQuery(organizationRows))
          .mockReturnValueOnce(selectQuery([{ userId: 'admin-id' }]))
          .mockReturnValueOnce(selectQuery(pendingRows)),
        insert: vi.fn(() => ({
          values: () => ({
            returning: async () => [
              {
                id: 'request-id',
                organizationId: 'organization-id',
                status: 'PENDING',
                requestNote: null,
                decisionNote: null,
                createdAt: new Date(),
                decidedAt: null,
              },
            ],
          }),
        })),
        update: vi.fn(),
      };
      const db = {
        transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
      };
      const service = new OrganizationsService(db as unknown as Database, undefined, undefined);
      return service.requestVerification(
        { id: 'admin-id', authUserId: 'admin-auth-id' },
        'organization-id',
        {},
      );
    };

    await expect(
      requestAsAdmin(
        [{ id: 'organization-id', ownerUserId: 'owner-id', verificationStatus: 'PENDING' }],
        [],
      ),
    ).resolves.toMatchObject({ id: 'request-id' });
    await expect(
      requestAsAdmin(
        [{ id: 'organization-id', ownerUserId: 'owner-id', verificationStatus: 'PENDING' }],
        [{ id: 'pending-id' }],
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      requestAsAdmin(
        [{ id: 'organization-id', ownerUserId: 'owner-id', verificationStatus: 'VERIFIED' }],
        [],
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('denies verification requests from users outside the organization', async () => {
    const insert = vi.fn();
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([
            {
              id: 'organization-id',
              ownerUserId: 'owner-id',
              verificationStatus: 'PENDING',
            },
          ]),
        )
        .mockReturnValueOnce(selectQuery([])),
      insert,
      update: vi.fn(),
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.requestVerification(
        { id: 'outsider-id', authUserId: 'outsider-auth-id' },
        'organization-id',
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('decides a verification request atomically and updates the public status', async () => {
    const updates: unknown[] = [];
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([{ id: 'request-id', organizationId: 'organization-id', status: 'PENDING' }]),
        )
        .mockReturnValueOnce(selectQuery([{ id: 'organization-id' }])),
      update: vi.fn(() => ({
        set: (value: unknown) => {
          updates.push(value);
          return { where: async () => [] };
        },
      })),
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.decideVerification('platform-admin-id', 'request-id', {
        decision: 'APPROVE',
        note: '  Looks good.  ',
      }),
    ).resolves.toMatchObject({
      id: 'request-id',
      organizationId: 'organization-id',
      status: 'APPROVED',
      verificationStatus: 'VERIFIED',
      decisionNote: 'Looks good.',
    });
    expect(updates).toEqual([
      expect.objectContaining({
        status: 'APPROVED',
        decisionNote: 'Looks good.',
        decidedByUserId: 'platform-admin-id',
      }),
      expect.objectContaining({ verificationStatus: 'VERIFIED' }),
    ]);
  });

  it('does not decide an already decided verification request', async () => {
    const update = vi.fn();
    const tx = {
      select: vi.fn(() =>
        selectQuery([{ id: 'request-id', organizationId: 'organization-id', status: 'APPROVED' }]),
      ),
      update,
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.decideVerification('platform-admin-id', 'request-id', { decision: 'REJECT' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it('allows only the Owner to revoke a pending invitation', async () => {
    const updated: unknown[] = [];
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectQuery([{ id: 'organization-id', ownerUserId: 'owner-id' }]))
        .mockReturnValueOnce(selectQuery([{ id: 'invitation-id', status: 'PENDING' }])),
      update: vi.fn(() => ({
        set: (value: unknown) => {
          updated.push(value);
          return { where: async () => [] };
        },
      })),
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.revokeAdminInvitation(
        { id: 'owner-id', authUserId: 'owner-auth-id' },
        'organization-id',
        'invitation-id',
      ),
    ).resolves.toEqual({ id: 'invitation-id', status: 'REVOKED' });
    expect(updated).toEqual([expect.objectContaining({ status: 'REVOKED' })]);
    expect((updated[0] as { respondedAt: unknown }).respondedAt).toBeInstanceOf(Date);
  });

  it('does not allow an Admin to revoke an invitation', async () => {
    const update = vi.fn();
    const tx = {
      select: vi.fn(() => selectQuery([{ id: 'organization-id', ownerUserId: 'owner-id' }])),
      update,
    };
    const db = {
      transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.revokeAdminInvitation(
        { id: 'admin-id', authUserId: 'admin-auth-id' },
        'organization-id',
        'invitation-id',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('allows the Owner to edit organization profile fields', async () => {
    const updated: unknown[] = [];
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([{ id: 'organization-id', slug: 'wasl-students', ownerUserId: 'owner-id' }]),
        )
        .mockReturnValueOnce(
          selectQuery([
            {
              id: 'organization-id',
              slug: 'wasl-students',
              name: 'Updated Students',
              description: 'Student activities across TÃ¼rkiye.',
              type: 'Student association',
              cityId: null,
              cityName: null,
              locationName: null,
              websiteUrl: null,
              socialUrl: null,
              logoPath: null,
              verificationStatus: 'PENDING',
            },
          ]),
        )
        .mockReturnValueOnce(selectQuery([]))
        .mockReturnValueOnce(selectQuery([])),
      update: vi.fn(() => ({
        set: (value: unknown) => {
          updated.push(value);
          return updateQuery([]);
        },
      })),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.update({ id: 'owner-id', authUserId: 'owner-auth-id' }, 'organization-id', {
        name: '  Updated Students  ',
      }),
    ).resolves.toMatchObject({ id: 'organization-id', name: 'Updated Students' });
    expect(updated).toEqual([expect.objectContaining({ name: 'Updated Students' })]);
  });

  it('allows a scoped Admin to edit organization profile fields', async () => {
    const updated: unknown[] = [];
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([{ id: 'organization-id', slug: 'wasl-students', ownerUserId: 'owner-id' }]),
        )
        .mockReturnValueOnce(selectQuery([{ userId: 'admin-id' }]))
        .mockReturnValueOnce(
          selectQuery([
            {
              id: 'organization-id',
              slug: 'wasl-students',
              name: 'Wasl Students',
              description: 'Updated description.',
              type: 'Student association',
              cityId: null,
              cityName: null,
              locationName: null,
              websiteUrl: null,
              socialUrl: null,
              logoPath: null,
              verificationStatus: 'PENDING',
            },
          ]),
        )
        .mockReturnValueOnce(selectQuery([]))
        .mockReturnValueOnce(selectQuery([])),
      update: vi.fn(() => ({
        set: (value: unknown) => {
          updated.push(value);
          return updateQuery([]);
        },
      })),
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.update({ id: 'admin-id', authUserId: 'admin-auth-id' }, 'organization-id', {
        description: '  Updated description.  ',
      }),
    ).resolves.toMatchObject({ id: 'organization-id', description: 'Updated description.' });
    expect(updated).toEqual([expect.objectContaining({ description: 'Updated description.' })]);
  });

  it('rejects a user who is neither the Owner nor a scoped Admin', async () => {
    const update = vi.fn();
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([{ id: 'organization-id', slug: 'wasl-students', ownerUserId: 'owner-id' }]),
        )
        .mockReturnValueOnce(selectQuery([])),
      update,
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.update({ id: 'member-id', authUserId: 'member-auth-id' }, 'organization-id', {
        name: 'Attempted update',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a logo path that the acting manager did not upload', async () => {
    const update = vi.fn();
    const db = {
      select: vi.fn(() =>
        selectQuery([{ id: 'organization-id', slug: 'wasl-students', ownerUserId: 'owner-id' }]),
      ),
      update,
    };
    const service = new OrganizationsService(db as unknown as Database, undefined, undefined);

    await expect(
      service.update({ id: 'owner-id', authUserId: 'owner-auth-id' }, 'organization-id', {
        logoPath: 'other-auth-id/00000000-0000-4000-8000-000000000000.png',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('allows a manager to attach a valid logo from their own upload path', async () => {
    const updated: unknown[] = [];
    const logoPath = 'owner-auth-id/00000000-0000-4000-8000-000000000000.png';
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectQuery([{ id: 'organization-id', slug: 'wasl-students', ownerUserId: 'owner-id' }]),
        )
        .mockReturnValueOnce(
          selectQuery([
            {
              id: 'organization-id',
              slug: 'wasl-students',
              name: 'Wasl Students',
              description: 'Student activities across TÃ¼rkiye.',
              type: 'Student association',
              cityId: null,
              cityName: null,
              locationName: null,
              websiteUrl: null,
              socialUrl: null,
              logoPath,
              verificationStatus: 'PENDING',
            },
          ]),
        )
        .mockReturnValueOnce(selectQuery([]))
        .mockReturnValueOnce(selectQuery([])),
      update: vi.fn(() => ({
        set: (value: unknown) => {
          updated.push(value);
          return updateQuery([]);
        },
      })),
    };
    const storage = {
      storage: {
        from: vi.fn(() => ({
          download: vi.fn().mockResolvedValue({
            data: new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])]),
            error: null,
          }),
        })),
      },
    };
    const service = new OrganizationsService(
      db as unknown as Database,
      storage as unknown as SupabaseClient,
      'https://wasl.supabase.co',
    );

    await expect(
      service.update({ id: 'owner-id', authUserId: 'owner-auth-id' }, 'organization-id', {
        logoPath,
      }),
    ).resolves.toMatchObject({
      logoUrl: `https://wasl.supabase.co/storage/v1/object/public/profile-photos/${logoPath}`,
    });
    expect(updated).toEqual([expect.objectContaining({ logoPath })]);
  });
});
