import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import type { PrivacyGateService } from './privacy-gate.service';
import type { SupabaseAuthService } from './supabase-auth.service';
import type { SupabaseIdentityService } from './supabase-identity.service';

function contextFor(request: Partial<FastifyRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

const eligibleGate = {
  stateFor: vi.fn().mockResolvedValue({
    ageEligibility: '18_PLUS',
    missingAcceptances: [],
    requiresOnboarding: false,
  }),
} as unknown as PrivacyGateService;

const notExempt = { getAllAndOverride: () => false } as unknown as Reflector;

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
      new SupabaseAuthGuard(auth, identityService, eligibleGate, notExempt).canActivate(
        contextFor(request),
      ),
    ).resolves.toBe(true);
    expect(authenticate).toHaveBeenCalledWith('access-token');
    expect(resolve).toHaveBeenCalledWith(verified);
    expect(request.user).toEqual(identity);
  });

  it('rejects missing or malformed bearer credentials', async () => {
    const authenticate = vi.fn();
    const auth = { authenticate } as unknown as SupabaseAuthService;
    const identity = { resolve: vi.fn() } as unknown as SupabaseIdentityService;
    const guard = new SupabaseAuthGuard(auth, identity, eligibleGate, notExempt);

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Basic abc' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('denies protected actions until the adult declaration is recorded', async () => {
    const auth = {
      authenticate: vi.fn().mockResolvedValue({ authUserId: 'auth-user-id' }),
    } as unknown as SupabaseAuthService;
    const identity = {
      resolve: vi.fn().mockResolvedValue({ id: 'user-id', authUserId: 'auth-user-id' }),
    } as unknown as SupabaseIdentityService;
    const gate = {
      stateFor: vi.fn().mockResolvedValue({
        ageEligibility: 'UNVERIFIED',
        missingAcceptances: [],
        requiresOnboarding: true,
      }),
    } as unknown as PrivacyGateService;
    const guard = new SupabaseAuthGuard(auth, identity, gate, notExempt);

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer access-token' } }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies protected actions recorded as under 18', async () => {
    const auth = {
      authenticate: vi.fn().mockResolvedValue({ authUserId: 'auth-user-id' }),
    } as unknown as SupabaseAuthService;
    const identity = {
      resolve: vi.fn().mockResolvedValue({ id: 'user-id', authUserId: 'auth-user-id' }),
    } as unknown as SupabaseIdentityService;
    const gate = {
      stateFor: vi.fn().mockResolvedValue({
        ageEligibility: 'UNDER_18',
        missingAcceptances: [],
        requiresOnboarding: true,
      }),
    } as unknown as PrivacyGateService;
    const guard = new SupabaseAuthGuard(auth, identity, gate, notExempt);

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer access-token' } }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires current published documents to be accepted', async () => {
    const auth = {
      authenticate: vi.fn().mockResolvedValue({ authUserId: 'auth-user-id' }),
    } as unknown as SupabaseAuthService;
    const identity = {
      resolve: vi.fn().mockResolvedValue({ id: 'user-id', authUserId: 'auth-user-id' }),
    } as unknown as SupabaseIdentityService;
    const gate = {
      stateFor: vi.fn().mockResolvedValue({
        ageEligibility: '18_PLUS',
        missingAcceptances: [{ documentType: 'TERMS_OF_USE', version: '1.0' }],
        requiresOnboarding: true,
      }),
    } as unknown as PrivacyGateService;
    const guard = new SupabaseAuthGuard(auth, identity, gate, notExempt);

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer access-token' } }),
      ),
    ).rejects.toThrow('terms');
  });

  it('keeps onboarding routes reachable when the gate is not satisfied', async () => {
    const auth = {
      authenticate: vi.fn().mockResolvedValue({ authUserId: 'auth-user-id' }),
    } as unknown as SupabaseAuthService;
    const identity = {
      resolve: vi.fn().mockResolvedValue({ id: 'user-id', authUserId: 'auth-user-id' }),
    } as unknown as SupabaseIdentityService;
    const gateState = vi.fn();
    const gate = { stateFor: gateState } as unknown as PrivacyGateService;
    const exempt = { getAllAndOverride: () => true } as unknown as Reflector;
    const guard = new SupabaseAuthGuard(auth, identity, gate, exempt);

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer access-token' } }),
      ),
    ).resolves.toBe(true);
    expect(gateState).not.toHaveBeenCalled();
  });
});
