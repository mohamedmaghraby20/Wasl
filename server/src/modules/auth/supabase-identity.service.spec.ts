/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import { SupabaseIdentityService } from './supabase-identity.service';

function query(rows: unknown[]) {
  const builder = {
    from: () => builder,
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
    const db = { transaction: (work: (transaction: typeof tx) => Promise<unknown>) => work(tx) };
    const service = new SupabaseIdentityService(db as unknown as Database);

    const result = await service.resolve({
        authUserId,
        email: 'member@example.com',
        emailVerifiedAt: new Date('2026-10-21T12:00:00Z'),
        displayName: 'Member Name',
      });
    expect(result).toEqual({ id: expect.any(String), authUserId });
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
      select: vi.fn().mockImplementationOnce(() => query([{ userId: 'local-id' }])).mockImplementationOnce(() => query([{ status: 'SUSPENDED' }])),
      insert: vi.fn(),
      update: vi.fn(() => ({ set: () => ({ where: vi.fn() }) })),
    };
    const db = { transaction: (work: (transaction: typeof tx) => Promise<unknown>) => work(tx) };
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
});
