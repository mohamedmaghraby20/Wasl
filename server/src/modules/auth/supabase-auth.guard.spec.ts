import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import type { SupabaseAuthService } from './supabase-auth.service';
import type { SupabaseIdentityService } from './supabase-identity.service';

function contextFor(request: Partial<FastifyRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('SupabaseAuthGuard', () => {
  it('attaches the verified Wasl identity to the request', async () => {
    const identity = { id: 'user-id', authUserId: 'user-id' };
    const verified = { authUserId: 'auth-user-id' };
    const authenticate = vi.fn().mockResolvedValue(verified);
    const auth = { authenticate } as unknown as SupabaseAuthService;
    const resolve = vi.fn().mockResolvedValue(identity);
    const identityService = { resolve } as unknown as SupabaseIdentityService;
    const request = {
      headers: { authorization: 'Bearer access-token' },
    } as Partial<FastifyRequest>;

    await expect(
      new SupabaseAuthGuard(auth, identityService).canActivate(contextFor(request)),
    ).resolves.toBe(true);
    expect(authenticate).toHaveBeenCalledWith('access-token');
    expect(resolve).toHaveBeenCalledWith(verified);
    expect(request.user).toEqual(identity);
  });

  it('rejects missing or malformed bearer credentials', async () => {
    const authenticate = vi.fn();
    const auth = { authenticate } as unknown as SupabaseAuthService;
    const identity = { resolve: vi.fn() } as unknown as SupabaseIdentityService;
    const guard = new SupabaseAuthGuard(auth, identity);

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Basic abc' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authenticate).not.toHaveBeenCalled();
  });
});
