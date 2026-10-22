import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { PlatformAdminGuard } from './platform-admin.guard';

function contextFor(userId?: string): ExecutionContext {
  const request = { user: userId ? { id: userId, authUserId: 'auth-id' } : undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request as FastifyRequest }),
  } as unknown as ExecutionContext;
}

function guardFor(allowedUserIds: string): PlatformAdminGuard {
  const config = {
    get: (key: string) => (key === 'PLATFORM_ADMIN_USER_IDS' ? allowedUserIds : undefined),
  };
  return new PlatformAdminGuard(config as unknown as ConfigService);
}

describe('PlatformAdminGuard', () => {
  it('allows an authenticated user in the configured allowlist', () => {
    const guard = guardFor('admin-a, admin-b');
    expect(guard.canActivate(contextFor('admin-b'))).toBe(true);
  });

  it('rejects a user outside the allowlist or an empty allowlist', () => {
    expect(() => guardFor('admin-a').canActivate(contextFor('other-id'))).toThrow(
      ForbiddenException,
    );
    expect(() => guardFor('').canActivate(contextFor('admin-a'))).toThrow(ForbiddenException);
  });

  it('rejects a request without an authenticated Wasl user', () => {
    expect(() => guardFor('admin-a').canActivate(contextFor())).toThrow(UnauthorizedException);
  });
});
