import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { and, asc, desc, eq, gt, ne, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import {
  cities,
  communities,
  events,
  organizationAdminInvitations,
  organizationAdmins,
  organizations,
  organizationVerificationRequests,
  profiles,
  users,
} from '../../db/schema';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import type {
  CreateOrganizationAdminInvitationDto,
  CreateOrganizationDto,
  DecideOrganizationVerificationDto,
  RequestOrganizationVerificationDto,
  UpdateOrganizationDto,
} from './organizations.dto';

const PHOTO_BUCKET = 'profile-photos';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ORGANIZATION_STORAGE_CLIENT = Symbol('ORGANIZATION_STORAGE_CLIENT');
export const ORGANIZATION_SUPABASE_URL = 'ORGANIZATION_SUPABASE_URL';
const ORGANIZATION_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    @Inject(ORGANIZATION_STORAGE_CLIENT) private readonly storage: SupabaseClient | undefined,
    @Inject(ORGANIZATION_SUPABASE_URL) private readonly supabaseUrl: string | undefined,
  ) {}

  async create(user: AuthenticatedUser, input: CreateOrganizationDto) {
    const values = await this.validateCreate(input);
    const id = randomUUID();
    const slug = `${slugPart(values.name, 'organization')}-${id.slice(0, 8)}`;

    await this.database().transaction(async (tx) => {
      await tx.insert(organizations).values({ id, ownerUserId: user.id, slug, ...values });
    });

    return { id, slug };
  }

  async getPublic(slug: string, language?: string) {
    const db = this.database();
    const [organization] = await db
      .select({
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        description: organizations.description,
        type: organizations.type,
        cityId: organizations.cityId,
        cityName: this.cityName(language),
        locationName: organizations.locationName,
        websiteUrl: organizations.websiteUrl,
        socialUrl: organizations.socialUrl,
        logoPath: organizations.logoPath,
        verificationStatus: organizations.verificationStatus,
      })
      .from(organizations)
      .leftJoin(cities, eq(cities.id, organizations.cityId))
      .where(eq(organizations.slug, slug))
      .limit(1);
    if (!organization) throw new NotFoundException('Organization not found.');

    const [communityLinks, eventLinks] = await Promise.all([
      db
        .select({ slug: communities.slug, name: communities.name })
        .from(communities)
        .where(
          and(
            eq(communities.ownerType, 'organization'),
            eq(communities.ownerId, organization.id),
            eq(communities.archived, false),
          ),
        )
        .orderBy(asc(communities.name)),
      db
        .select({ slug: events.slug, name: events.title })
        .from(events)
        .where(
          and(
            eq(events.hostType, 'organization'),
            eq(events.hostId, organization.id),
            eq(events.visibility, 'public'),
          ),
        )
        .orderBy(asc(events.startsAt)),
    ]);

    const { logoPath, ...publicFields } = organization;
    return {
      ...publicFields,
      logoUrl: this.publicLogoUrl(logoPath),
      resources: [
        ...communityLinks.map((resource) => ({ ...resource, kind: 'community' as const })),
        ...eventLinks.map((resource) => ({ ...resource, kind: 'event' as const })),
      ],
    };
  }

  async listMine(userId: string) {
    const db = this.database();
    const [owned, administered] = await Promise.all([
      db
        .select({
          id: organizations.id,
          slug: organizations.slug,
          name: organizations.name,
          role: sql<'OWNER'>`'OWNER'`,
        })
        .from(organizations)
        .where(eq(organizations.ownerUserId, userId)),
      db
        .select({
          id: organizations.id,
          slug: organizations.slug,
          name: organizations.name,
          role: sql<'ADMIN'>`'ADMIN'`,
        })
        .from(organizationAdmins)
        .innerJoin(organizations, eq(organizations.id, organizationAdmins.organizationId))
        .where(and(eq(organizationAdmins.userId, userId), ne(organizations.ownerUserId, userId))),
    ]);
    return [...owned, ...administered].sort((left, right) => left.name.localeCompare(right.name));
  }

  async listManagers(userId: string, organizationId: string) {
    await this.requireManager(userId, organizationId);
    const db = this.database();
    const [owners, admins] = await Promise.all([
      db
        .select({
          userId: organizations.ownerUserId,
          displayName: profiles.displayName,
        })
        .from(organizations)
        .leftJoin(profiles, eq(profiles.id, organizations.ownerUserId))
        .where(eq(organizations.id, organizationId))
        .limit(1),
      db
        .select({
          userId: organizationAdmins.userId,
          displayName: profiles.displayName,
        })
        .from(organizationAdmins)
        .leftJoin(profiles, eq(profiles.id, organizationAdmins.userId))
        .where(eq(organizationAdmins.organizationId, organizationId))
        .orderBy(asc(profiles.displayName)),
    ]);
    return [
      ...owners.map((owner) => ({ ...owner, role: 'OWNER' as const })),
      ...admins.map((admin) => ({ ...admin, role: 'ADMIN' as const })),
    ];
  }

  async createAdminInvitation(
    user: AuthenticatedUser,
    organizationId: string,
    input: CreateOrganizationAdminInvitationDto,
  ) {
    const targetEmail = input.targetEmail.trim().toLowerCase();
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const invitationId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ORGANIZATION_INVITATION_TTL_MS);

    await this.database().transaction(async (tx) => {
      const [organization] = await tx
        .select({ id: organizations.id, ownerUserId: organizations.ownerUserId })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .for('update')
        .limit(1);
      if (!organization) throw new NotFoundException('Organization not found.');
      if (organization.ownerUserId !== user.id) {
        throw new ForbiddenException('Only the Organization Owner can invite Admins.');
      }

      const [target] = await tx
        .select({ id: users.id, accountStatus: users.accountStatus })
        .from(users)
        .where(eq(users.normalizedEmail, targetEmail))
        .limit(1);
      if (!target || target.accountStatus !== 'ACTIVE') {
        throw new BadRequestException('Choose an active Wasl User to invite.');
      }
      if (target.id === user.id) {
        throw new BadRequestException('You already own this Organization.');
      }

      const [existingAdmin] = await tx
        .select({ userId: organizationAdmins.userId })
        .from(organizationAdmins)
        .where(
          and(
            eq(organizationAdmins.organizationId, organization.id),
            eq(organizationAdmins.userId, target.id),
          ),
        )
        .limit(1);
      if (existingAdmin) throw new ConflictException('This User is already an Organization Admin.');

      const [existingInvitation] = await tx
        .select({ id: organizationAdminInvitations.id })
        .from(organizationAdminInvitations)
        .where(
          and(
            eq(organizationAdminInvitations.organizationId, organization.id),
            eq(organizationAdminInvitations.targetUserId, target.id),
            eq(organizationAdminInvitations.status, 'PENDING'),
            gt(organizationAdminInvitations.expiresAt, now),
          ),
        )
        .limit(1);
      if (existingInvitation) {
        throw new ConflictException('An active invitation already exists for this User.');
      }

      await tx.insert(organizationAdminInvitations).values({
        id: invitationId,
        organizationId: organization.id,
        targetUserId: target.id,
        invitedByUserId: user.id,
        tokenHash,
        expiresAt,
      });
    });

    // The raw token is returned only in this response; it is never persisted or logged.
    return { id: invitationId, token, expiresAt };
  }

  async listAdminInvitations(user: AuthenticatedUser, organizationId: string) {
    await this.requireOwner(user, organizationId);
    const now = new Date();
    return this.database()
      .select({
        id: organizationAdminInvitations.id,
        targetUserId: organizationAdminInvitations.targetUserId,
        targetDisplayName: profiles.displayName,
        status: organizationAdminInvitations.status,
        createdAt: organizationAdminInvitations.createdAt,
        expiresAt: organizationAdminInvitations.expiresAt,
      })
      .from(organizationAdminInvitations)
      .leftJoin(profiles, eq(profiles.id, organizationAdminInvitations.targetUserId))
      .where(
        and(
          eq(organizationAdminInvitations.organizationId, organizationId),
          eq(organizationAdminInvitations.status, 'PENDING'),
          gt(organizationAdminInvitations.expiresAt, now),
        ),
      )
      .orderBy(desc(organizationAdminInvitations.createdAt));
  }

  async revokeAdminInvitation(
    user: AuthenticatedUser,
    organizationId: string,
    invitationId: string,
  ) {
    const now = new Date();
    return this.database().transaction(async (tx) => {
      const [organization] = await tx
        .select({ id: organizations.id, ownerUserId: organizations.ownerUserId })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .for('update')
        .limit(1);
      if (!organization) throw new NotFoundException('Organization not found.');
      if (organization.ownerUserId !== user.id) {
        throw new ForbiddenException('Only the Organization Owner can manage Admins.');
      }
      const [invitation] = await tx
        .select({
          id: organizationAdminInvitations.id,
          status: organizationAdminInvitations.status,
        })
        .from(organizationAdminInvitations)
        .where(
          and(
            eq(organizationAdminInvitations.id, invitationId),
            eq(organizationAdminInvitations.organizationId, organizationId),
          ),
        )
        .for('update')
        .limit(1);
      if (!invitation) throw new NotFoundException('Invitation not found.');
      if (invitation.status !== 'PENDING') {
        throw new ConflictException('Only pending invitations can be revoked.');
      }
      await tx
        .update(organizationAdminInvitations)
        .set({ status: 'REVOKED', respondedAt: now })
        .where(eq(organizationAdminInvitations.id, invitation.id));
      return { id: invitation.id, status: 'REVOKED' as const };
    });
  }

  async removeAdmin(user: AuthenticatedUser, organizationId: string, targetUserId: string) {
    return this.database().transaction(async (tx) => {
      const [organization] = await tx
        .select({ id: organizations.id, ownerUserId: organizations.ownerUserId })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .for('update')
        .limit(1);
      if (!organization) throw new NotFoundException('Organization not found.');
      if (organization.ownerUserId !== user.id) {
        throw new ForbiddenException('Only the Organization Owner can manage Admins.');
      }
      if (targetUserId === organization.ownerUserId) {
        throw new BadRequestException('The Organization Owner cannot be removed.');
      }
      const [admin] = await tx
        .select({ userId: organizationAdmins.userId })
        .from(organizationAdmins)
        .where(
          and(
            eq(organizationAdmins.organizationId, organization.id),
            eq(organizationAdmins.userId, targetUserId),
          ),
        )
        .for('update')
        .limit(1);
      if (!admin) throw new NotFoundException('Organization Admin not found.');
      await tx
        .delete(organizationAdmins)
        .where(
          and(
            eq(organizationAdmins.organizationId, organization.id),
            eq(organizationAdmins.userId, admin.userId),
          ),
        );
      return { userId: admin.userId };
    });
  }

  async transferOwnership(user: AuthenticatedUser, organizationId: string, targetUserId: string) {
    return this.database().transaction(async (tx) => {
      const [organization] = await tx
        .select({
          id: organizations.id,
          slug: organizations.slug,
          ownerUserId: organizations.ownerUserId,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .for('update')
        .limit(1);
      if (!organization) throw new NotFoundException('Organization not found.');
      if (organization.ownerUserId !== user.id) {
        throw new ForbiddenException('Only the Organization Owner can transfer ownership.');
      }
      if (targetUserId === organization.ownerUserId) {
        throw new BadRequestException('This User already owns the Organization.');
      }

      const [target] = await tx
        .select({ id: users.id, accountStatus: users.accountStatus })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);
      if (!target || target.accountStatus !== 'ACTIVE') {
        throw new BadRequestException('Choose an active Wasl User.');
      }

      const [admin] = await tx
        .select({ userId: organizationAdmins.userId })
        .from(organizationAdmins)
        .where(
          and(
            eq(organizationAdmins.organizationId, organization.id),
            eq(organizationAdmins.userId, target.id),
          ),
        )
        .for('update')
        .limit(1);
      if (!admin) {
        throw new BadRequestException('The new Owner must be an Organization Admin first.');
      }

      await tx
        .update(organizations)
        .set({ ownerUserId: target.id, updatedAt: new Date() })
        .where(eq(organizations.id, organization.id));
      await tx
        .delete(organizationAdmins)
        .where(
          and(
            eq(organizationAdmins.organizationId, organization.id),
            eq(organizationAdmins.userId, target.id),
          ),
        );
      await tx
        .insert(organizationAdmins)
        .values({ organizationId: organization.id, userId: user.id });

      return {
        id: organization.id,
        slug: organization.slug,
        ownerUserId: target.id,
        previousOwnerRole: 'ADMIN' as const,
      };
    });
  }

  async listVerificationRequests(userId: string, organizationId: string) {
    await this.requireManager(userId, organizationId);
    return this.database()
      .select({
        id: organizationVerificationRequests.id,
        organizationId: organizationVerificationRequests.organizationId,
        status: organizationVerificationRequests.status,
        requestNote: organizationVerificationRequests.requestNote,
        decisionNote: organizationVerificationRequests.decisionNote,
        createdAt: organizationVerificationRequests.createdAt,
        decidedAt: organizationVerificationRequests.decidedAt,
      })
      .from(organizationVerificationRequests)
      .where(eq(organizationVerificationRequests.organizationId, organizationId))
      .orderBy(desc(organizationVerificationRequests.createdAt));
  }

  async requestVerification(
    user: AuthenticatedUser,
    organizationId: string,
    input: RequestOrganizationVerificationDto,
  ) {
    const note = input.note?.trim() || null;
    return this.database().transaction(async (tx) => {
      const [organization] = await tx
        .select({
          id: organizations.id,
          ownerUserId: organizations.ownerUserId,
          verificationStatus: organizations.verificationStatus,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .for('update')
        .limit(1);
      if (!organization) throw new NotFoundException('Organization not found.');
      if (organization.ownerUserId !== user.id) {
        const [admin] = await tx
          .select({ userId: organizationAdmins.userId })
          .from(organizationAdmins)
          .where(
            and(
              eq(organizationAdmins.organizationId, organization.id),
              eq(organizationAdmins.userId, user.id),
            ),
          )
          .limit(1);
        if (!admin) {
          throw new ForbiddenException('Organization management permission is required.');
        }
      }
      if (organization.verificationStatus === 'VERIFIED') {
        throw new ConflictException('This Organization is already verified.');
      }

      const [pending] = await tx
        .select({ id: organizationVerificationRequests.id })
        .from(organizationVerificationRequests)
        .where(
          and(
            eq(organizationVerificationRequests.organizationId, organization.id),
            eq(organizationVerificationRequests.status, 'PENDING'),
          ),
        )
        .limit(1);
      if (pending) throw new ConflictException('A verification request is already pending.');

      const [request] = await tx
        .insert(organizationVerificationRequests)
        .values({
          organizationId: organization.id,
          requestedByUserId: user.id,
          requestNote: note,
        })
        .returning();
      if (organization.verificationStatus === 'REJECTED') {
        await tx
          .update(organizations)
          .set({ verificationStatus: 'PENDING', updatedAt: new Date() })
          .where(eq(organizations.id, organization.id));
      }
      return request;
    });
  }

  async listPendingVerificationRequests() {
    return this.database()
      .select({
        id: organizationVerificationRequests.id,
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        requestedByDisplayName: profiles.displayName,
        requestNote: organizationVerificationRequests.requestNote,
        createdAt: organizationVerificationRequests.createdAt,
      })
      .from(organizationVerificationRequests)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationVerificationRequests.organizationId),
      )
      .leftJoin(profiles, eq(profiles.id, organizationVerificationRequests.requestedByUserId))
      .where(eq(organizationVerificationRequests.status, 'PENDING'))
      .orderBy(asc(organizationVerificationRequests.createdAt));
  }

  async decideVerification(
    platformAdminUserId: string,
    requestId: string,
    input: DecideOrganizationVerificationDto,
  ) {
    const note = input.note?.trim() || null;
    return this.database().transaction(async (tx) => {
      const [request] = await tx
        .select({
          id: organizationVerificationRequests.id,
          organizationId: organizationVerificationRequests.organizationId,
          status: organizationVerificationRequests.status,
        })
        .from(organizationVerificationRequests)
        .where(eq(organizationVerificationRequests.id, requestId))
        .for('update')
        .limit(1);
      if (!request) throw new NotFoundException('Verification request not found.');
      if (request.status !== 'PENDING') {
        throw new ConflictException('This verification request has already been decided.');
      }

      const [organization] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, request.organizationId))
        .for('update')
        .limit(1);
      if (!organization)
        throw new ConflictException('This verification request is no longer valid.');

      const now = new Date();
      const status = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const verificationStatus = input.decision === 'APPROVE' ? 'VERIFIED' : 'REJECTED';
      await tx
        .update(organizationVerificationRequests)
        .set({
          status,
          decisionNote: note,
          decidedByUserId: platformAdminUserId,
          decidedAt: now,
        })
        .where(eq(organizationVerificationRequests.id, request.id));
      await tx
        .update(organizations)
        .set({ verificationStatus, updatedAt: now })
        .where(eq(organizations.id, organization.id));

      return {
        id: request.id,
        organizationId: organization.id,
        status,
        verificationStatus,
        decisionNote: note,
        decidedAt: now,
      };
    });
  }

  async acceptAdminInvitation(user: AuthenticatedUser, token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const [invitationReference] = await this.database()
      .select({ organizationId: organizationAdminInvitations.organizationId })
      .from(organizationAdminInvitations)
      .where(eq(organizationAdminInvitations.tokenHash, tokenHash))
      .limit(1);
    if (!invitationReference) {
      throw new BadRequestException('This invitation is invalid or no longer available.');
    }
    return this.database().transaction(async (tx) => {
      const [organization] = await tx
        .select({
          id: organizations.id,
          slug: organizations.slug,
          ownerUserId: organizations.ownerUserId,
        })
        .from(organizations)
        .where(eq(organizations.id, invitationReference.organizationId))
        .for('update')
        .limit(1);
      if (!organization) throw new ConflictException('This invitation is no longer valid.');
      const [invitation] = await tx
        .select({
          id: organizationAdminInvitations.id,
          organizationId: organizationAdminInvitations.organizationId,
          targetUserId: organizationAdminInvitations.targetUserId,
          invitedByUserId: organizationAdminInvitations.invitedByUserId,
          expiresAt: organizationAdminInvitations.expiresAt,
          status: organizationAdminInvitations.status,
        })
        .from(organizationAdminInvitations)
        .where(
          and(
            eq(organizationAdminInvitations.tokenHash, tokenHash),
            eq(organizationAdminInvitations.organizationId, invitationReference.organizationId),
          ),
        )
        .for('update')
        .limit(1);
      if (!invitation)
        throw new BadRequestException('This invitation is invalid or no longer available.');
      if (invitation.targetUserId !== user.id) {
        throw new ForbiddenException('This invitation belongs to another Wasl User.');
      }
      if (invitation.status !== 'PENDING' || invitation.expiresAt.getTime() <= now.getTime()) {
        throw new ConflictException('This invitation is expired or has already been used.');
      }

      if (organization.ownerUserId !== invitation.invitedByUserId) {
        throw new ConflictException('This invitation is no longer valid.');
      }
      if (organization.ownerUserId === user.id) {
        throw new ConflictException('The Organization Owner cannot also be an Admin.');
      }
      const [existingAdmin] = await tx
        .select({ userId: organizationAdmins.userId })
        .from(organizationAdmins)
        .where(
          and(
            eq(organizationAdmins.organizationId, organization.id),
            eq(organizationAdmins.userId, user.id),
          ),
        )
        .limit(1);
      if (existingAdmin) throw new ConflictException('You are already an Organization Admin.');

      await tx
        .insert(organizationAdmins)
        .values({ organizationId: organization.id, userId: user.id });
      await tx
        .update(organizationAdminInvitations)
        .set({ status: 'ACCEPTED', respondedAt: now })
        .where(eq(organizationAdminInvitations.id, invitation.id));
      return {
        organizationId: organization.id,
        organizationSlug: organization.slug,
        role: 'ADMIN' as const,
      };
    });
  }

  async update(
    user: AuthenticatedUser,
    organizationId: string,
    input: UpdateOrganizationDto,
    language?: string,
  ) {
    const organization = await this.requireManager(user.id, organizationId);
    const changes = await this.validateUpdate(user, input);

    await this.database()
      .update(organizations)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(organizations.id, organization.id));

    return this.getPublic(organization.slug, language);
  }

  private cityName(language?: string) {
    return language === 'ar' ? cities.nameAr : language === 'tr' ? cities.nameTr : cities.nameEn;
  }

  private async validateCreate(input: CreateOrganizationDto) {
    const name = input.name.trim();
    const description = input.description.trim();
    const type = input.type.trim();
    const locationName = input.locationName?.trim() || null;
    const websiteUrl = input.websiteUrl?.trim() || null;
    const socialUrl = input.socialUrl?.trim() || null;
    if (
      !name ||
      name.length > 160 ||
      !description ||
      description.length > 5000 ||
      !type ||
      type.length > 80
    ) {
      throw new BadRequestException('Organization details are invalid.');
    }
    if (locationName && locationName.length > 160) {
      throw new BadRequestException('Organization location is invalid.');
    }
    if (!isPublicUrl(websiteUrl) || !isPublicUrl(socialUrl)) {
      throw new BadRequestException('Organization links must use HTTP or HTTPS.');
    }
    if (input.cityId) {
      const [city] = await this.database()
        .select({ id: cities.id })
        .from(cities)
        .where(eq(cities.id, input.cityId))
        .limit(1);
      if (!city) throw new BadRequestException('Choose a city from the available list.');
    }
    return {
      name,
      description,
      type,
      cityId: input.cityId ?? null,
      locationName,
      websiteUrl,
      socialUrl,
    };
  }

  private async requireOwner(user: AuthenticatedUser, organizationId: string) {
    const [organization] = await this.database()
      .select({ id: organizations.id, ownerUserId: organizations.ownerUserId })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!organization) throw new NotFoundException('Organization not found.');
    if (organization.ownerUserId !== user.id) {
      throw new ForbiddenException('Only the Organization Owner can manage Admins.');
    }
    return organization;
  }

  private async requireManager(userId: string, organizationId: string) {
    const [organization] = await this.database()
      .select({
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        ownerUserId: organizations.ownerUserId,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!organization) throw new NotFoundException('Organization not found.');
    if (organization.ownerUserId === userId) return organization;

    const [admin] = await this.database()
      .select({ userId: organizationAdmins.userId })
      .from(organizationAdmins)
      .where(
        and(
          eq(organizationAdmins.organizationId, organization.id),
          eq(organizationAdmins.userId, userId),
        ),
      )
      .limit(1);
    if (!admin) throw new ForbiddenException('Organization management permission is required.');
    return organization;
  }

  async assertCanManageOrganization(
    userId: string,
    organizationId: string,
  ): Promise<{ id: string; name: string }> {
    const organization = await this.requireManager(userId, organizationId);
    return { id: organization.id, name: organization.name };
  }

  private async validateUpdate(user: AuthenticatedUser, input: UpdateOrganizationDto) {
    const changes: Partial<typeof organizations.$inferInsert> = {};
    if (input.name !== undefined)
      changes.name = this.requiredText(input.name, 160, 'Organization name');
    if (input.description !== undefined) {
      changes.description = this.requiredText(input.description, 5000, 'Organization description');
    }
    if (input.type !== undefined)
      changes.type = this.requiredText(input.type, 80, 'Organization type');
    if (input.locationName !== undefined) {
      const locationName = input.locationName?.trim() || null;
      if (locationName && locationName.length > 160) {
        throw new BadRequestException('Organization location is invalid.');
      }
      changes.locationName = locationName;
    }
    if (input.websiteUrl !== undefined) {
      const websiteUrl = input.websiteUrl?.trim() || null;
      if (!isPublicUrl(websiteUrl)) {
        throw new BadRequestException('Organization links must use HTTP or HTTPS.');
      }
      changes.websiteUrl = websiteUrl;
    }
    if (input.socialUrl !== undefined) {
      const socialUrl = input.socialUrl?.trim() || null;
      if (!isPublicUrl(socialUrl)) {
        throw new BadRequestException('Organization links must use HTTP or HTTPS.');
      }
      changes.socialUrl = socialUrl;
    }
    if (input.cityId !== undefined) {
      if (input.cityId) {
        const [city] = await this.database()
          .select({ id: cities.id })
          .from(cities)
          .where(eq(cities.id, input.cityId))
          .limit(1);
        if (!city) throw new BadRequestException('Choose a city from the available list.');
      }
      changes.cityId = input.cityId ?? null;
    }
    if (input.logoPath !== undefined) {
      if (input.logoPath !== null) await this.validateLogo(user.authUserId, input.logoPath);
      changes.logoPath = input.logoPath;
    }
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('Provide at least one organization field to update.');
    }
    return changes;
  }

  private requiredText(value: string, maxLength: number, label: string): string {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxLength)
      throw new BadRequestException(`${label} is invalid.`);
    return trimmed;
  }

  private async validateLogo(authUserId: string, path: string): Promise<void> {
    const fileName = path.startsWith(`${authUserId}/`) ? path.slice(authUserId.length + 1) : '';
    if (!/^[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp)$/i.test(fileName)) {
      throw new BadRequestException('Choose an image uploaded to your account.');
    }
    if (!this.storage)
      throw new ServiceUnavailableException('Organization photo storage is not configured.');
    const { data, error } = await this.storage.storage.from(PHOTO_BUCKET).download(path);
    if (error || !data) throw new BadRequestException('Upload the organization photo again.');
    if (data.size === 0 || data.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Organization photos must be smaller than 5 MB.');
    }
    const signature = new Uint8Array(await data.slice(0, 12).arrayBuffer());
    const isJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
    const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => signature[index] === byte,
    );
    const isWebp =
      signature.length >= 12 &&
      String.fromCharCode(...signature.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';
    if (!isJpeg && !isPng && !isWebp) {
      throw new BadRequestException('Upload a valid JPEG, PNG, or WebP image.');
    }
  }

  private publicLogoUrl(path: string | null): string | null {
    if (!path || !this.supabaseUrl) return null;
    const objectPath = path.split('/').map(encodeURIComponent).join('/');
    return `${this.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${PHOTO_BUCKET}/${objectPath}`;
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }
}

function slugPart(value: string, fallback: string): string {
  const part = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return part || fallback;
}

function isPublicUrl(value: string | null): boolean {
  if (!value || value.length > 2048) return value === null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
