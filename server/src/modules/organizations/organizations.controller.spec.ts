import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { OrganizationsController } from './organizations.controller';
import type { OrganizationsService } from './organizations.service';

describe('OrganizationsController', () => {
  it('protects the current-user organization list and scopes it to the authenticated Wasl user', async () => {
    const listMine = vi.fn().mockResolvedValue([{ id: 'organization-id', role: 'OWNER' }]);
    const controller = new OrganizationsController({ listMine } as unknown as OrganizationsService);
    const request = {
      user: { id: 'wasl-user-id', authUserId: 'supabase-user-id' },
    } as FastifyRequest;

    await expect(controller.mine(request)).resolves.toEqual([
      { id: 'organization-id', role: 'OWNER' },
    ]);
    expect(listMine).toHaveBeenCalledWith('wasl-user-id');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const mineMethod = OrganizationsController.prototype.mine;
    expect(Reflect.getMetadata(GUARDS_METADATA, mineMethod)).toContain(SupabaseAuthGuard);
  });

  it('protects organization creation and passes the authenticated Wasl user to the service', async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ id: 'organization-id', slug: 'association-12345678' });
    const controller = new OrganizationsController({ create } as unknown as OrganizationsService);
    const request = {
      user: { id: 'wasl-user-id', authUserId: 'supabase-user-id' },
    } as FastifyRequest;
    const input = { name: 'Association', description: 'A valid description.', type: 'Association' };

    await expect(controller.create(request, input)).resolves.toEqual({
      id: 'organization-id',
      slug: 'association-12345678',
    });
    expect(create).toHaveBeenCalledWith(request.user, input);
    // Nest stores method guard metadata on the method function.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const createMethod = OrganizationsController.prototype.create;
    expect(Reflect.getMetadata(GUARDS_METADATA, createMethod)).toContain(SupabaseAuthGuard);
  });

  it('protects organization updates and passes the authenticated Wasl user to the service', async () => {
    const update = vi
      .fn()
      .mockResolvedValue({ id: 'organization-id', name: 'Updated Association' });
    const controller = new OrganizationsController({ update } as unknown as OrganizationsService);
    const request = {
      user: { id: 'wasl-user-id', authUserId: 'supabase-user-id' },
    } as FastifyRequest;
    const input = { name: 'Updated Association' };

    await expect(controller.update(request, 'organization-id', input, 'en')).resolves.toEqual({
      id: 'organization-id',
      name: 'Updated Association',
    });
    expect(update).toHaveBeenCalledWith(request.user, 'organization-id', input, 'en');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const updateMethod = OrganizationsController.prototype.update;
    expect(Reflect.getMetadata(GUARDS_METADATA, updateMethod)).toContain(SupabaseAuthGuard);
  });

  it('protects invitation creation and acceptance with the current personal user', async () => {
    const createAdminInvitation = vi
      .fn()
      .mockResolvedValue({ id: 'invitation-id', token: 'secret' });
    const acceptAdminInvitation = vi
      .fn()
      .mockResolvedValue({ organizationId: 'organization-id', role: 'ADMIN' });
    const controller = new OrganizationsController({
      createAdminInvitation,
      acceptAdminInvitation,
    } as unknown as OrganizationsService);
    const request = {
      user: { id: 'wasl-user-id', authUserId: 'supabase-user-id' },
    } as FastifyRequest;
    const createInput = { targetEmail: 'target@example.test' };
    const acceptInput = { token: 'opaque-invitation-token' };

    await expect(
      controller.createAdminInvitation(request, 'organization-id', createInput),
    ).resolves.toEqual({
      id: 'invitation-id',
      token: 'secret',
    });
    await expect(controller.acceptAdminInvitation(request, acceptInput)).resolves.toEqual({
      organizationId: 'organization-id',
      role: 'ADMIN',
    });
    expect(createAdminInvitation).toHaveBeenCalledWith(
      request.user,
      'organization-id',
      createInput,
    );
    expect(acceptAdminInvitation).toHaveBeenCalledWith(request.user, acceptInput.token);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const createMethod = OrganizationsController.prototype.createAdminInvitation;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const acceptMethod = OrganizationsController.prototype.acceptAdminInvitation;
    expect(Reflect.getMetadata(GUARDS_METADATA, createMethod)).toContain(SupabaseAuthGuard);
    expect(Reflect.getMetadata(GUARDS_METADATA, acceptMethod)).toContain(SupabaseAuthGuard);
  });

  it('protects manager listing and admin removal with the current personal user', async () => {
    const listManagers = vi.fn().mockResolvedValue([]);
    const removeAdmin = vi.fn().mockResolvedValue({ userId: 'admin-id' });
    const controller = new OrganizationsController({
      listManagers,
      removeAdmin,
    } as unknown as OrganizationsService);
    const request = {
      user: { id: 'wasl-user-id', authUserId: 'supabase-user-id' },
    } as FastifyRequest;

    await expect(controller.listManagers(request, 'organization-id')).resolves.toEqual([]);
    await expect(controller.removeAdmin(request, 'organization-id', 'admin-id')).resolves.toEqual({
      userId: 'admin-id',
    });
    expect(listManagers).toHaveBeenCalledWith('wasl-user-id', 'organization-id');
    expect(removeAdmin).toHaveBeenCalledWith(request.user, 'organization-id', 'admin-id');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const listMethod = OrganizationsController.prototype.listManagers;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const removeMethod = OrganizationsController.prototype.removeAdmin;
    expect(Reflect.getMetadata(GUARDS_METADATA, listMethod)).toContain(SupabaseAuthGuard);
    expect(Reflect.getMetadata(GUARDS_METADATA, removeMethod)).toContain(SupabaseAuthGuard);
  });

  it('protects ownership transfer and platform verification decisions', async () => {
    const transferOwnership = vi.fn().mockResolvedValue({
      id: 'organization-id',
      slug: 'wasl-students',
      ownerUserId: 'target-id',
      previousOwnerRole: 'ADMIN',
    });
    const decideVerification = vi.fn().mockResolvedValue({
      id: 'request-id',
      organizationId: 'organization-id',
      status: 'APPROVED',
      verificationStatus: 'VERIFIED',
      decisionNote: null,
      decidedAt: new Date(),
    });
    const controller = new OrganizationsController({
      transferOwnership,
      decideVerification,
    } as unknown as OrganizationsService);
    const request = {
      user: { id: 'wasl-user-id', authUserId: 'supabase-user-id' },
    } as FastifyRequest;

    await expect(
      controller.transferOwnership(request, 'organization-id', { targetUserId: 'target-id' }),
    ).resolves.toMatchObject({ ownerUserId: 'target-id', previousOwnerRole: 'ADMIN' });
    await expect(
      controller.decideVerification(request, 'request-id', { decision: 'APPROVE' }),
    ).resolves.toMatchObject({ verificationStatus: 'VERIFIED' });
    expect(transferOwnership).toHaveBeenCalledWith(request.user, 'organization-id', 'target-id');
    expect(decideVerification).toHaveBeenCalledWith('wasl-user-id', 'request-id', {
      decision: 'APPROVE',
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const transferMethod = OrganizationsController.prototype.transferOwnership;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const decideMethod = OrganizationsController.prototype.decideVerification;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const listQueueMethod = OrganizationsController.prototype.listPendingVerificationRequests;
    expect(Reflect.getMetadata(GUARDS_METADATA, transferMethod)).toContain(SupabaseAuthGuard);
    expect(Reflect.getMetadata(GUARDS_METADATA, decideMethod)).toContain(PlatformAdminGuard);
    expect(Reflect.getMetadata(GUARDS_METADATA, listQueueMethod)).toContain(PlatformAdminGuard);
  });
});
