/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import { SupabaseIdentityService } from './supabase-identity.service';

function query(rows: unknown[]) {
  const builder = {
    from: () => builder,
    innerJoin: () => builder,
    leftJoin: () => builder,
    where: () => builder,
    limit: async () => rows,
  };
  return builder;
}

describe('SupabaseIdentityService', () => {
  it('creates a separate stable Wasl identity for a verified Supabase user', async () => {
    const authUserId = 'b69a9be9-0b37-4a11-b8c2-33aec11b45e2';
    const selects = [[], [{ status: 'ACTIVE' }]];
    const inserted: unknown[] = [];
    const tx = {
      execute: vi.fn(),
      select: vi.fn(() => query(selects.shift() ?? [])),
      insert: vi.fn(() => ({
        values: vi.fn((value) => {
          inserted.push(value);
          return { onConflictDoNothing: vi.fn().mockResolvedValue([]) };
        }),
      })),
      update: vi.fn(),
    };
    const db = {
      select: () => query([]),
      transaction: (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new SupabaseIdentityService(db as unknown as Database);

    const result = await service.resolve({
      authUserId,
      email: 'member@example.com',
      emailVerifiedAt: new Date('2026-10-21T12:00:00Z'),
      displayName: 'Member Name',
    });
    expect(result).toEqual({ id: expect.any(String), authUserId, accountStatus: 'ACTIVE' });
    expect(result.id).not.toBe(authUserId);
    expect(inserted).toEqual([
      expect.objectContaining({ id: result.id, normalizedEmail: 'member@example.com' }),
      expect.objectContaining({ userId: result.id, provider: 'email', providerUserId: authUserId }),
      expect.objectContaining({ id: result.id, displayName: 'Member Name' }),
    ]);
  });

  it('blocks suspended identities before creating a profile', async () => {
    const tx = {
      execute: vi.fn(),
      select: vi
        .fn()
        .mockImplementationOnce(() => query([{ userId: 'local-id' }]))
        .mockImplementationOnce(() => query([{ status: 'SUSPENDED' }])),
      insert: vi.fn(),
      update: vi.fn(() => ({ set: () => ({ where: vi.fn() }) })),
    };
    const db = {
      select: () => query([]),
      transaction: (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new SupabaseIdentityService(db as unknown as Database);

    await expect(
      service.resolve({
        authUserId: 'auth-id',
        email: 'member@example.com',
        emailVerifiedAt: null,
        displayName: 'Member',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('resolves a deletion-pending account so the holder can review or cancel the request', async () => {
    const tx = {
      execute: vi.fn(),
      select: vi
        .fn()
        .mockImplementationOnce(() => query([{ userId: 'local-id' }]))
        .mockImplementationOnce(() => query([{ status: 'DELETION_PENDING' }])),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue([]) })),
      })),
      update: vi.fn(() => ({ set: () => ({ where: vi.fn() }) })),
    };
    const db = {
      select: () => query([]),
      transaction: (work: (transaction: typeof tx) => Promise<unknown>) => work(tx),
    };
    const service = new SupabaseIdentityService(db as unknown as Database);

    const result = await service.resolve({
      authUserId: 'auth-id',
      email: 'member@example.com',
      emailVerifiedAt: null,
      displayName: 'Member',
    });
    expect(result).toEqual({
      id: 'local-id',
      authUserId: 'auth-id',
      accountStatus: 'DELETION_PENDING',
    });
  });
});

describe('existing identity read path', () => {
  const authUser = {
    authUserId: 'auth-id',
    email: 'member@example.com',
    emailVerifiedAt: new Date('2026-10-21T12:00:00Z'),
    displayName: 'Member',
  };
  const existing = {
    id: 'local-id',
    accountStatus: 'ACTIVE',
    normalizedEmail: authUser.email,
    emailVerifiedAt: authUser.emailVerifiedAt,
    profileId: 'local-id',
  };

  it.each(['ACTIVE', 'DELETION_PENDING'])('resolves %s requests without transactions or writes', async (accountStatus) => {
    const db = {
      select: vi.fn(() => query([{ ...existing, accountStatus }])),
      transaction: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
    };
    const service = new SupabaseIdentityService(db as unknown as Database);
    const results = await Promise.all(Array.from({ length: 4 }, () => service.resolve(authUser)));
    expect(results).toEqual(Array.from({ length: 4 }, () => ({
      id: 'local-id', accountStatus, authUserId: 'auth-id',
    })));
    expect(db.select).toHaveBeenCalledTimes(4);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('checks current account status on every request', async () => {
    const db = {
      select: vi.fn()
        .mockReturnValueOnce(query([existing]))
        .mockReturnValueOnce(query([{ ...existing, accountStatus: 'SUSPENDED' }])),
      transaction: vi.fn(),
    };
    const service = new SupabaseIdentityService(db as unknown as Database);
    await service.resolve(authUser);
    await expect(service.resolve(authUser)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it.each([
    { normalizedEmail: 'old@example.com' },
    { emailVerifiedAt: null },
    { profileId: null },
  ])('repairs changed identity fields or a missing profile: %o', async (change) => {
    const tx = {
      execute: vi.fn(),
      select: vi.fn()
        .mockReturnValueOnce(query([{ userId: 'local-id' }]))
        .mockReturnValueOnce(query([{ status: 'ACTIVE' }])),
      update: vi.fn(() => ({ set: () => ({ where: vi.fn() }) })),
      insert: vi.fn(() => ({ values: () => ({ onConflictDoNothing: vi.fn() }) })),
    };
    const db = {
      select: () => query([{ ...existing, ...change }]),
      transaction: vi.fn((work: (transaction: typeof tx) => Promise<unknown>) => work(tx)),
    };
    const service = new SupabaseIdentityService(db as unknown as Database);
    await expect(service.resolve(authUser)).resolves.toMatchObject({ id: 'local-id' });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.execute).toHaveBeenCalledOnce();
    expect(tx.update).toHaveBeenCalledOnce();
    expect(tx.insert).toHaveBeenCalledOnce();
  });
});
