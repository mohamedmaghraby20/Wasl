import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import {
  ageEligibilities,
  communities,
  communityMembershipTransitions,
  communityMemberships,
  discussionPosts,
  discussionThreads,
  eventRegistrationTransitions,
  eventRegistrations,
  events,
  legalAcceptances,
  legalDocuments,
  messagingConversations,
  moderationReports,
  notifications,
  organizationAdmins,
  organizations,
  privacyProviderActions,
  privacyRequestEvents,
  privacyRequests,
  privacyRequestStatus,
  profiles,
  retentionPolicies,
  users,
} from '../../db/schema';
import { PrivacyGateService } from '../auth/privacy-gate.service';
import type {
  AcceptDocumentDto,
  CreatePrivacyRequestDto,
  DecidePrivacyRequestDto,
  RetentionPolicyDto,
  ReviewAgeEligibilityDto,
} from './privacy.dto';
import { PrivacyProviderActionsService } from './privacy-provider-actions.service';

/** KVKK data-subject applications ordinarily require a controller response within 30 days. */
export const PRIVACY_RESPONSE_DAYS = 30;
const ANONYMIZED_DISPLAY_NAME = 'Deleted member';
const AUTHORITATIVE_DATA_NOTE =
  'Wasl-owned records are included. Stream message bodies and Resend delivery records are held by those processors and must be covered by the approved processor procedure.';

@Injectable()
export class PrivacyService {
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly config: ConfigService,
    private readonly gate: PrivacyGateService,
    private readonly providerActions: PrivacyProviderActionsService,
  ) {}

  async status(userId: string) {
    const db = this.database();
    const state = await this.gate.stateFor(userId);
    const [documents, accepted, openRequests] = await Promise.all([
      db
        .select({
          id: legalDocuments.id,
          type: legalDocuments.type,
          version: legalDocuments.version,
          locale: legalDocuments.locale,
          content: legalDocuments.content,
          contentHash: legalDocuments.contentHash,
          publishedAt: legalDocuments.publishedAt,
        })
        .from(legalDocuments)
        .where(
          and(
            eq(legalDocuments.status, 'PUBLISHED'),
            inArray(legalDocuments.type, ['TERMS_OF_USE', 'PRIVACY_NOTICE']),
          ),
        )
        .orderBy(desc(legalDocuments.publishedAt)),
      db
        .select({
          documentType: legalAcceptances.documentType,
          version: legalAcceptances.version,
          acceptedAt: legalAcceptances.acceptedAt,
        })
        .from(legalAcceptances)
        .where(eq(legalAcceptances.userId, userId))
        .orderBy(desc(legalAcceptances.acceptedAt)),
      db
        .select()
        .from(privacyRequests)
        .where(
          and(
            eq(privacyRequests.userId, userId),
            inArray(privacyRequests.status, ['RECEIVED', 'IN_REVIEW', 'PENDING_PROVIDER']),
          ),
        )
        .orderBy(desc(privacyRequests.createdAt)),
    ]);

    return {
      ageEligibility: state.ageEligibility,
      ageVerificationMethod: this.config.get<string>('AGE_VERIFICATION_METHOD') ?? null,
      requiresOnboarding: state.requiresOnboarding,
      documents: documents.flatMap((document) =>
        document.content && document.contentHash && document.publishedAt
          ? [
              {
                ...document,
                content: document.content,
                contentHash: document.contentHash,
                publishedAt: document.publishedAt,
              },
            ]
          : [],
      ),
      acceptedDocuments: accepted,
      openRequests,
    };
  }

  async declareAge(userId: string, isAdult: boolean) {
    const db = this.database();
    const method = (this.config.get<string>('AGE_VERIFICATION_METHOD') ?? 'SELF_DECLARATION').slice(
      0,
      80,
    );
    const now = new Date();
    await db
      .insert(ageEligibilities)
      .values({
        userId,
        status: isAdult ? '18_PLUS' : 'UNDER_18',
        method,
        decidedAt: now,
      })
      .onConflictDoUpdate({
        target: ageEligibilities.userId,
        set: {
          status: isAdult ? '18_PLUS' : 'UNDER_18',
          method,
          decidedAt: now,
          reviewedByUserId: null,
          note: null,
        },
      });
    return this.status(userId);
  }

  async accept(userId: string, input: AcceptDocumentDto) {
    const db = this.database();
    const [document] = await db
      .select({ id: legalDocuments.id })
      .from(legalDocuments)
      .where(
        and(
          eq(legalDocuments.type, input.documentType),
          eq(legalDocuments.version, input.version),
          eq(legalDocuments.status, 'PUBLISHED'),
        ),
      )
      .limit(1);
    if (!document) {
      throw new BadRequestException(
        'No approved published document matches that type and version.',
      );
    }
    await db
      .insert(legalAcceptances)
      .values({
        userId,
        documentType: input.documentType,
        version: input.version,
        documentId: document.id,
      })
      .onConflictDoNothing({
        target: [legalAcceptances.userId, legalAcceptances.documentType, legalAcceptances.version],
      });
    return this.status(userId);
  }

  async createRequest(userId: string, input: CreatePrivacyRequestDto) {
    const db = this.database();
    const now = new Date();
    const dueAt = new Date(now.getTime() + PRIVACY_RESPONSE_DAYS * 24 * 60 * 60 * 1000);

    if (input.requestType === 'DELETION') {
      await this.assertNoOpenDeletion(userId);
      const [owned] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.ownerUserId, userId))
        .limit(1);
      if (owned) {
        throw new ConflictException(
          'Transfer ownership of every organization you own before requesting account deletion.',
        );
      }
    }

    const request = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(privacyRequests)
        .values({
          userId,
          requestType: input.requestType,
          requestNote: input.note?.trim() || null,
          dueAt,
          identityVerifiedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      if (!created)
        throw new ServiceUnavailableException('The privacy request could not be stored.');

      await tx.insert(privacyRequestEvents).values({
        requestId: created.id,
        actorUserId: userId,
        actorRole: 'USER',
        eventType: 'REQUEST_RECEIVED',
        note: input.note?.trim() || null,
      });

      if (input.requestType === 'DELETION') {
        await tx
          .update(users)
          .set({ accountStatus: 'DELETION_PENDING', updatedAt: now })
          .where(and(eq(users.id, userId), eq(users.accountStatus, 'ACTIVE')));
        await tx.insert(privacyRequestEvents).values({
          requestId: created.id,
          actorUserId: userId,
          actorRole: 'SYSTEM',
          eventType: 'ACCOUNT_ACTIVITY_SUSPENDED',
          note: 'New activity is suspended while the deletion request is reviewed.',
        });
      }
      return created;
    });

    return this.requestView(request.id, userId);
  }

  async listRequests(userId: string) {
    const db = this.database();
    return db
      .select()
      .from(privacyRequests)
      .where(eq(privacyRequests.userId, userId))
      .orderBy(desc(privacyRequests.createdAt));
  }

  async getRequest(userId: string, id: string) {
    return this.requestView(id, userId);
  }

  async cancelRequest(userId: string, id: string) {
    const db = this.database();
    const [request] = await db
      .select()
      .from(privacyRequests)
      .where(and(eq(privacyRequests.id, id), eq(privacyRequests.userId, userId)))
      .limit(1);
    if (!request) throw new NotFoundException('Privacy request not found.');
    if (!['RECEIVED', 'IN_REVIEW'].includes(request.status)) {
      throw new BadRequestException('This privacy request can no longer be cancelled.');
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(privacyRequests)
        .set({ status: 'CANCELLED', updatedAt: now })
        .where(eq(privacyRequests.id, id));
      await tx.insert(privacyRequestEvents).values({
        requestId: id,
        actorUserId: userId,
        actorRole: 'USER',
        eventType: 'CANCELLED',
        note: 'Cancelled by the account holder.',
      });
      if (request.requestType === 'DELETION') {
        await tx
          .update(users)
          .set({ accountStatus: 'ACTIVE', updatedAt: now })
          .where(and(eq(users.id, userId), eq(users.accountStatus, 'DELETION_PENDING')));
      }
    });
    return this.requestView(id, userId);
  }

  async exportData(userId: string) {
    const db = this.database();
    const [
      accountRows,
      profileRows,
      ageRows,
      acceptanceRows,
      requestRows,
      membershipRows,
      registrationRows,
      postRows,
      threadRows,
      notificationRows,
      reportRows,
      conversationRows,
    ] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.normalizedEmail,
          emailVerifiedAt: users.emailVerifiedAt,
          accountStatus: users.accountStatus,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
      db.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
      db.select().from(ageEligibilities).where(eq(ageEligibilities.userId, userId)).limit(1),
      db.select().from(legalAcceptances).where(eq(legalAcceptances.userId, userId)),
      db.select().from(privacyRequests).where(eq(privacyRequests.userId, userId)),
      db
        .select({
          communityId: communityMemberships.communityId,
          communityName: communities.name,
          status: communityMemberships.status,
          requestedAt: communityMemberships.requestedAt,
          updatedAt: communityMemberships.updatedAt,
        })
        .from(communityMemberships)
        .innerJoin(communities, eq(communities.id, communityMemberships.communityId))
        .where(eq(communityMemberships.userId, userId)),
      db
        .select({
          eventId: eventRegistrations.eventId,
          eventTitle: events.title,
          status: eventRegistrations.status,
          requestedAt: eventRegistrations.requestedAt,
          updatedAt: eventRegistrations.updatedAt,
        })
        .from(eventRegistrations)
        .innerJoin(events, eq(events.id, eventRegistrations.eventId))
        .where(eq(eventRegistrations.userId, userId)),
      db
        .select({
          id: discussionPosts.id,
          threadId: discussionPosts.threadId,
          body: discussionPosts.body,
          createdAt: discussionPosts.createdAt,
          updatedAt: discussionPosts.updatedAt,
          deletedAt: discussionPosts.deletedAt,
        })
        .from(discussionPosts)
        .where(eq(discussionPosts.authorUserId, userId)),
      db
        .select({
          id: discussionThreads.id,
          communityId: discussionThreads.communityId,
          title: discussionThreads.title,
          body: discussionThreads.body,
          createdAt: discussionThreads.createdAt,
          archivedAt: discussionThreads.archivedAt,
        })
        .from(discussionThreads)
        .where(eq(discussionThreads.authorUserId, userId)),
      db
        .select({
          type: notifications.type,
          contextType: notifications.contextType,
          contextId: notifications.contextId,
          createdAt: notifications.createdAt,
          readAt: notifications.readAt,
        })
        .from(notifications)
        .where(eq(notifications.recipientUserId, userId)),
      db
        .select({
          targetType: moderationReports.targetType,
          targetId: moderationReports.targetId,
          reason: moderationReports.reason,
          status: moderationReports.status,
          createdAt: moderationReports.createdAt,
          decidedAt: moderationReports.decidedAt,
        })
        .from(moderationReports)
        .where(eq(moderationReports.reporterUserId, userId)),
      db
        .select({
          id: messagingConversations.id,
          kind: messagingConversations.kind,
          communityId: messagingConversations.communityId,
          eventId: messagingConversations.eventId,
          createdAt: messagingConversations.createdAt,
        })
        .from(messagingConversations)
        .where(
          or(
            eq(messagingConversations.dmUserLowId, userId),
            eq(messagingConversations.dmUserHighId, userId),
          ),
        ),
    ]);

    if (!accountRows[0]) throw new NotFoundException('User profile not found.');
    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      account: accountRows[0],
      profile: profileRows[0] ?? null,
      ageEligibility: ageRows[0] ?? null,
      documentAcceptances: acceptanceRows,
      privacyRequests: requestRows,
      memberships: membershipRows,
      eventRegistrations: registrationRows,
      discussionPosts: postRows,
      discussionThreads: threadRows,
      notifications: notificationRows,
      submittedReports: reportRows,
      messaging: {
        directConversations: conversationRows,
        note: AUTHORITATIVE_DATA_NOTE,
      },
    };
  }

  // ---- Platform administrator flows -------------------------------------------------------

  async listAllRequests(status?: string) {
    const db = this.database();
    const allowed: readonly string[] = privacyRequestStatus.enumValues;
    if (status && !allowed.includes(status)) {
      throw new BadRequestException('Unknown privacy request status.');
    }
    const filter = status
      ? eq(privacyRequests.status, status as (typeof privacyRequestStatus.enumValues)[number])
      : undefined;
    const rows = await db
      .select({ request: privacyRequests, requesterEmail: users.normalizedEmail })
      .from(privacyRequests)
      .innerJoin(users, eq(users.id, privacyRequests.userId))
      .where(filter)
      .orderBy(asc(privacyRequests.dueAt));
    return rows.map((row) => ({ ...row.request, requesterEmail: row.requesterEmail }));
  }

  async decideRequest(adminUserId: string, id: string, input: DecidePrivacyRequestDto) {
    const db = this.database();
    const [request] = await db
      .select()
      .from(privacyRequests)
      .where(eq(privacyRequests.id, id))
      .limit(1);
    if (!request) throw new NotFoundException('Privacy request not found.');
    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(request.status)) {
      throw new BadRequestException('This privacy request has already been closed.');
    }

    const now = new Date();
    if (input.action === 'START_REVIEW') {
      await db.transaction(async (tx) => {
        await tx
          .update(privacyRequests)
          .set({ status: 'IN_REVIEW', updatedAt: now })
          .where(eq(privacyRequests.id, id));
        await tx.insert(privacyRequestEvents).values({
          requestId: id,
          actorUserId: adminUserId,
          actorRole: 'ADMIN',
          eventType: 'REVIEW_STARTED',
          note: input.note?.trim() || null,
        });
      });
      return this.adminRequestView(id);
    }

    if (input.action === 'REJECT') {
      await db.transaction(async (tx) => {
        await tx
          .update(privacyRequests)
          .set({
            status: 'REJECTED',
            decidedByUserId: adminUserId,
            decidedAt: now,
            decisionNote: input.note?.trim() || null,
            updatedAt: now,
          })
          .where(eq(privacyRequests.id, id));
        await tx.insert(privacyRequestEvents).values({
          requestId: id,
          actorUserId: adminUserId,
          actorRole: 'ADMIN',
          eventType: 'REJECTED',
          note: input.note?.trim() || null,
        });
        if (request.requestType === 'DELETION') {
          await tx
            .update(users)
            .set({ accountStatus: 'ACTIVE', updatedAt: now })
            .where(and(eq(users.id, request.userId), eq(users.accountStatus, 'DELETION_PENDING')));
        }
      });
      return this.adminRequestView(id);
    }

    if (request.requestType !== 'DELETION') {
      await db.transaction(async (tx) => {
        await tx
          .update(privacyRequests)
          .set({
            status: 'COMPLETED',
            decidedByUserId: adminUserId,
            decidedAt: now,
            completedAt: now,
            decisionNote: input.note?.trim() || null,
            updatedAt: now,
          })
          .where(eq(privacyRequests.id, id));
        await tx.insert(privacyRequestEvents).values({
          requestId: id,
          actorUserId: adminUserId,
          actorRole: 'ADMIN',
          eventType: 'COMPLETED',
          note: input.note?.trim() || 'Response is available through the account data export.',
        });
      });
      return this.adminRequestView(id);
    }

    await this.approveDeletion(adminUserId, request, input.note);
    return this.adminRequestView(id);
  }

  async retryProviderActions(adminUserId: string, id: string) {
    const [request] = await this.database()
      .select()
      .from(privacyRequests)
      .where(eq(privacyRequests.id, id))
      .limit(1);
    if (!request) throw new NotFoundException('Privacy request not found.');
    if (request.requestType !== 'DELETION' || request.status !== 'PENDING_PROVIDER') {
      throw new BadRequestException(
        'Only a pending deletion request has processor actions to retry.',
      );
    }
    await this.providerActions.process(id, adminUserId);
    return this.adminRequestView(id);
  }

  async reviewAge(adminUserId: string, userId: string, input: ReviewAgeEligibilityDto) {
    const db = this.database();
    const [account] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!account) throw new NotFoundException('User not found.');

    await db
      .insert(ageEligibilities)
      .values({
        userId,
        status: input.status,
        method: 'ADMIN_REVIEW',
        reviewedByUserId: adminUserId,
        note: input.note?.trim() || null,
      })
      .onConflictDoUpdate({
        target: ageEligibilities.userId,
        set: {
          status: input.status,
          method: 'ADMIN_REVIEW',
          decidedAt: new Date(),
          reviewedByUserId: adminUserId,
          note: input.note?.trim() || null,
        },
      });
    const [row] = await db
      .select()
      .from(ageEligibilities)
      .where(eq(ageEligibilities.userId, userId))
      .limit(1);
    return row;
  }

  async retentionPreview(): Promise<{
    policies: RetentionPolicyDto[];
    erasureEnabled: boolean;
    blockedDataGroups: string[];
  }> {
    const policies = await this.database()
      .select()
      .from(retentionPolicies)
      .orderBy(asc(retentionPolicies.dataGroup));
    const blockedDataGroups = policies
      .filter((policy) => policy.status !== 'APPROVED' || policy.durationDays === null)
      .map((policy) => policy.dataGroup);
    return {
      policies,
      // Automatic irreversible erasure stays off until counsel approves every period and the
      // corresponding exception logic. The job interface exists so it can be enabled later.
      erasureEnabled: false,
      blockedDataGroups,
    };
  }

  // ---- internals -------------------------------------------------------------------------

  private async approveDeletion(
    adminUserId: string,
    request: typeof privacyRequests.$inferSelect,
    note?: string,
  ) {
    const db = this.database();
    const now = new Date();
    const userId = request.userId;

    await db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.ownerUserId, userId))
        .limit(1);
      if (owned) {
        throw new ConflictException(
          'Transfer ownership of every organization this user owns before approving deletion.',
        );
      }

      await tx
        .update(communities)
        .set({ archived: true })
        .where(and(eq(communities.createdByUserId, userId), eq(communities.archived, false)));
      await tx
        .update(events)
        .set({ cancelled: true })
        .where(and(eq(events.createdByUserId, userId), eq(events.cancelled, false)));

      const memberships = await tx
        .select({ id: communityMemberships.id, status: communityMemberships.status })
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.userId, userId),
            inArray(communityMemberships.status, ['PENDING', 'WAITLISTED', 'ACTIVE']),
          ),
        );
      if (memberships.length) {
        await tx
          .update(communityMemberships)
          .set({ status: 'LEFT', updatedAt: now })
          .where(
            inArray(
              communityMemberships.id,
              memberships.map((membership) => membership.id),
            ),
          );
        await tx.insert(communityMembershipTransitions).values(
          memberships.map((membership) => ({
            membershipId: membership.id,
            fromStatus: membership.status,
            toStatus: 'LEFT' as const,
            actorUserId: null,
            reason: 'Account deletion',
          })),
        );
      }

      const registrations = await tx
        .select({ id: eventRegistrations.id, status: eventRegistrations.status })
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.userId, userId),
            inArray(eventRegistrations.status, ['PENDING', 'WAITLISTED', 'ACCEPTED']),
          ),
        );
      if (registrations.length) {
        await tx
          .update(eventRegistrations)
          .set({ status: 'CANCELLED_BY_USER', updatedAt: now })
          .where(
            inArray(
              eventRegistrations.id,
              registrations.map((registration) => registration.id),
            ),
          );
        await tx.insert(eventRegistrationTransitions).values(
          registrations.map((registration) => ({
            registrationId: registration.id,
            fromStatus: registration.status,
            toStatus: 'CANCELLED_BY_USER' as const,
            actorUserId: null,
            reason: 'Account deletion',
          })),
        );
      }

      await tx
        .update(profiles)
        .set({
          displayName: ANONYMIZED_DISPLAY_NAME,
          bio: '',
          interests: [],
          cityId: null,
          avatarPath: null,
          updatedAt: now,
        })
        .where(eq(profiles.id, userId));
      await tx.delete(organizationAdmins).where(eq(organizationAdmins.userId, userId));
      await tx
        .update(users)
        .set({
          normalizedEmail: `deleted+${userId}@deleted.invalid`,
          accountStatus: 'DEACTIVATED',
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      await tx
        .update(privacyRequests)
        .set({
          status: 'PENDING_PROVIDER',
          decisionNote: note?.trim() || null,
          updatedAt: now,
        })
        .where(eq(privacyRequests.id, request.id));
      await tx.insert(privacyRequestEvents).values({
        requestId: request.id,
        actorUserId: adminUserId,
        actorRole: 'ADMIN',
        eventType: 'DELETION_APPROVED',
        note: note?.trim() || 'Wasl-owned data anonymized; processor removal pending.',
      });

      await tx.insert(privacyProviderActions).values([
        {
          requestId: request.id,
          provider: 'WASL',
          action: 'ANONYMIZE_WASL_DATA',
          status: 'SUCCEEDED' as const,
          attemptCount: 1,
          lastAttemptAt: now,
          completedAt: now,
        },
        { requestId: request.id, provider: 'SUPABASE_AUTH', action: 'DELETE_AUTH_USER' },
        {
          requestId: request.id,
          provider: 'SUPABASE_STORAGE',
          action: 'DELETE_PROFILE_OBJECTS',
        },
        { requestId: request.id, provider: 'STREAM', action: 'DEACTIVATE_USER' },
      ]);
    });

    await this.providerActions.process(request.id, adminUserId);
  }

  private async assertNoOpenDeletion(userId: string): Promise<void> {
    const [open] = await this.database()
      .select({ id: privacyRequests.id })
      .from(privacyRequests)
      .where(
        and(
          eq(privacyRequests.userId, userId),
          eq(privacyRequests.requestType, 'DELETION'),
          inArray(privacyRequests.status, ['RECEIVED', 'IN_REVIEW', 'PENDING_PROVIDER']),
        ),
      )
      .limit(1);
    if (open) throw new ConflictException('A deletion request is already open for this account.');
  }

  private async requestView(id: string, userId: string) {
    const db = this.database();
    const [request] = await db
      .select()
      .from(privacyRequests)
      .where(and(eq(privacyRequests.id, id), eq(privacyRequests.userId, userId)))
      .limit(1);
    if (!request) throw new NotFoundException('Privacy request not found.');
    return this.withDetails(request);
  }

  private async adminRequestView(id: string) {
    const db = this.database();
    const [row] = await db
      .select({ request: privacyRequests, requesterEmail: users.normalizedEmail })
      .from(privacyRequests)
      .innerJoin(users, eq(users.id, privacyRequests.userId))
      .where(eq(privacyRequests.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Privacy request not found.');
    return { ...(await this.withDetails(row.request)), requesterEmail: row.requesterEmail };
  }

  private async withDetails(request: typeof privacyRequests.$inferSelect) {
    const db = this.database();
    const [events, providerActions] = await Promise.all([
      db
        .select()
        .from(privacyRequestEvents)
        .where(eq(privacyRequestEvents.requestId, request.id))
        .orderBy(asc(privacyRequestEvents.createdAt)),
      db
        .select()
        .from(privacyProviderActions)
        .where(eq(privacyProviderActions.requestId, request.id))
        .orderBy(asc(privacyProviderActions.createdAt)),
    ]);
    return {
      ...request,
      events: events.map((event) => ({
        id: event.id,
        actorRole: event.actorRole,
        eventType: event.eventType,
        note: event.note,
        createdAt: event.createdAt,
      })),
      providerActions: providerActions.map((action) => ({
        id: action.id,
        provider: action.provider,
        action: action.action,
        status: action.status,
        attemptCount: action.attemptCount,
        lastAttemptAt: action.lastAttemptAt,
        completedAt: action.completedAt,
        lastError: action.lastError,
      })),
    };
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }
}
