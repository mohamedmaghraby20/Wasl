/* eslint-disable @typescript-eslint/require-await */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { UsersService } from './users.service';

function selectQuery(rows: unknown[]) {
  const query = {
    from: () => query,
    innerJoin: () => query,
    leftJoin: () => query,
    where: () => query,
    limit: async () => rows,
  };
  return query;
}

describe('UsersService', () => {
  it('returns only public profile fields for an active public user', async () => {
    const row = {
      id: 'a020e6d0-2a9b-4105-b2c8-2811cad2b600',
      status: 'ACTIVE',
      displayName: 'Public Member',
      avatarPath: 'auth-id/00000000-0000-4000-8000-000000000000.png',
      bio: 'About this member',
      cityId: 'ankara',
      cityName: 'Ankara',
      interests: ['music'],
      email: 'private@example.com',
    };
    const db = { select: vi.fn(() => selectQuery([row])) };
    const service = new UsersService(db as unknown as Database, undefined, 'https://wasl.supabase.co');

    const result = await service.getPublic(row.id, 'en');

    expect(result).toEqual({
      id: row.id,
      displayName: row.displayName,
      avatarUrl: 'https://wasl.supabase.co/storage/v1/object/public/profile-photos/auth-id/00000000-0000-4000-8000-000000000000.png',
      bio: row.bio,
      cityId: row.cityId,
      cityName: row.cityName,
      interests: row.interests,
    });
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('status');
  });

  it('rejects a profile photo path owned by another Supabase account', async () => {
    const db = {} as Database;
    const service = new UsersService(db, undefined, 'https://wasl.supabase.co');
    const user: AuthenticatedUser = { id: 'local-id', authUserId: 'auth-user-id' };

    await expect(
      service.updateCurrent(user, { avatarPath: 'other-user/00000000-0000-4000-8000-000000000000.png' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
