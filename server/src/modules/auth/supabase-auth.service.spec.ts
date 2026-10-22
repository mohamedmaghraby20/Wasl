import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseAuthService } from './supabase-auth.service';

const authUser = {
  id: 'b69a9be9-0b37-4a11-b8c2-33aec11b45e2',
  email: 'Member@Wasl.test',
  email_confirmed_at: '2026-10-21T00:00:00.000Z',
  user_metadata: { display_name: 'Wasl Member' },
} as unknown as User;

function serviceWith(getUser: ReturnType<typeof vi.fn>) {
  const client = { auth: { getUser } } as unknown as Pick<SupabaseClient, 'auth'>;
  return new SupabaseAuthService(client);
}

describe('SupabaseAuthService', () => {
  it('returns a verified Supabase identity for local account resolution', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: authUser }, error: null });

    await expect(serviceWith(getUser).authenticate('valid-token')).resolves.toEqual({
      authUserId: authUser.id,
      email: 'member@wasl.test',
      emailVerifiedAt: new Date('2026-10-21T00:00:00.000Z'),
      displayName: 'Wasl Member',
    });
    expect(getUser).toHaveBeenCalledWith('valid-token');
  });

  it('rejects invalid and expired credentials', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { status: 401, message: 'Invalid token' },
    });

    await expect(serviceWith(getUser).authenticate('forged-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('reports provider failures as unavailable instead of accepting an unverified token', async () => {
    const getUser = vi.fn().mockRejectedValue(new Error('network failure'));

    await expect(serviceWith(getUser).authenticate('token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects credentials when Supabase is not configured', async () => {
    await expect(new SupabaseAuthService(undefined).authenticate('token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
