import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import {
  communities,
  communityMembershipTransitions,
  communityMemberships,
  eventRegistrationTransitions,
  eventRegistrations,
  events,
  profiles,
} from '../../db/schema';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CommunitiesService } from '../communities/communities.service';
import { EventsService } from '../events/events.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  assertCommunityTransition,
  assertEventTransition,
  sameStatus,
  type CommunityStatus,
  type EventStatus,
} from './participation-transitions';

@Injectable()
export class ParticipationService {
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly communitiesService: CommunitiesService,
    private readonly eventsService: EventsService,
    @Optional() private readonly messaging?: MessagingService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  async joinCommunity(user: AuthenticatedUser, communityId: string) {
    const db = this.database();
    const result = await db.transaction(async (tx) => {
      const [community] = await tx
        .select({
          id: communities.id,
          admissionMode: communities.admissionMode,
          archived: communities.archived,
        })
        .from(communities)
        .where(eq(communities.id, communityId))
        .for('update')
        .limit(1);
      if (!community || community.archived) throw new NotFoundException('Community not found.');

      const [existing] = await tx
        .select({ id: communityMemberships.id, status: communityMemberships.status })
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.communityId, communityId),
            eq(communityMemberships.userId, user.id),
          ),
        )
        .for('update')
        .limit(1);
      if (existing && ['PENDING', 'WAITLISTED', 'ACTIVE'].includes(existing.status)) {
        return { status: existing.status };
      }
      const status: CommunityStatus = community.admissionMode === 'approval' ? 'PENDING' : 'ACTIVE';

      if (existing && sameStatus(existing.status, status)) return { status };
      assertCommunityTransition(existing?.status ?? null, status);
      const now = new Date();
      const membership = existing
        ? (
            await tx
              .update(communityMemberships)
              .set({ status, requestedAt: now, updatedAt: now })
              .where(eq(communityMemberships.id, existing.id))
              .returning({ id: communityMemberships.id })
          )[0]
        : (
            await tx
              .insert(communityMemberships)
              .values({ communityId, userId: user.id, status })
              .returning({ id: communityMemberships.id })
          )[0];
      if (!membership) throw new BadRequestException('Membership could not be saved.');
      const [transition] = await tx
        .insert(communityMembershipTransitions)
        .values({
          membershipId: membership.id,
          fromStatus: existing?.status ?? null,
          toStatus: status,
          actorUserId: user.id,
        })
        .returning({ id: communityMembershipTransitions.id });
      if (transition)
        await this.notifyParticipation(
          tx,
          'community',
          communityId,
          user.id,
          transition.id,
          status,
          existing?.status ?? null,
        );
      return { status };
    });
    const messagingSyncPending = await this.messaging?.reconcileResourceMemberAccess(
      'community',
      communityId,
      user.id,
      result.status === 'ACTIVE',
    );
    return { ...result, messagingSyncPending: messagingSyncPending ?? false };
  }

  async leaveCommunity(user: AuthenticatedUser, communityId: string) {
    const db = this.database();
    const result = await db.transaction(async (tx) => {
      const [community] = await tx
        .select({
          id: communities.id,
          admissionMode: communities.admissionMode,
        })
        .from(communities)
        .where(eq(communities.id, communityId))
        .for('update')
        .limit(1);
      if (!community) throw new NotFoundException('Community not found.');
      const [membership] = await tx
        .select({ id: communityMemberships.id, status: communityMemberships.status })
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.communityId, communityId),
            eq(communityMemberships.userId, user.id),
          ),
        )
        .for('update')
        .limit(1);
      if (!membership) throw new NotFoundException('Membership not found.');
      if (membership.status === 'LEFT') return { status: membership.status, promotedUserIds: [] };
      assertCommunityTransition(membership.status, 'LEFT');
      await tx
        .update(communityMemberships)
        .set({ status: 'LEFT', updatedAt: new Date() })
        .where(eq(communityMemberships.id, membership.id));
      await tx.insert(communityMembershipTransitions).values({
        membershipId: membership.id,
        fromStatus: membership.status,
        toStatus: 'LEFT',
        actorUserId: user.id,
      });
      const promotedUserIds =
        community.admissionMode !== 'approval'
          ? await this.promoteCommunityWaitlist(tx, communityId)
          : [];
      return { status: 'LEFT' as const, promotedUserIds };
    });
    const syncResults = await Promise.all([
      this.messaging?.reconcileResourceMemberAccess('community', communityId, user.id, false),
      ...result.promotedUserIds.map((userId) =>
        this.messaging?.reconcileResourceMemberAccess('community', communityId, userId, true),
      ),
    ]);
    return {
      status: result.status,
      messagingSyncPending: syncResults.some(Boolean),
    };
  }

  async registerForEvent(user: AuthenticatedUser, eventId: string) {
    const db = this.database();
    const result = await db.transaction(async (tx) => {
      const [event] = await tx
        .select({
          id: events.id,
          admissionMode: events.admissionMode,
          capacity: events.capacity,
          cancelled: events.cancelled,
          startsAt: events.startsAt,
        })
        .from(events)
        .where(eq(events.id, eventId))
        .for('update')
        .limit(1);
      if (!event) throw new NotFoundException('Event not found.');
      if (event.cancelled) throw new BadRequestException('This event is cancelled.');
      if (event.startsAt.getTime() <= Date.now())
        throw new BadRequestException('This event has already started.');

      const [existing] = await tx
        .select({ id: eventRegistrations.id, status: eventRegistrations.status })
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, user.id)))
        .for('update')
        .limit(1);
      if (existing && ['PENDING', 'WAITLISTED', 'ACCEPTED'].includes(existing.status)) {
        return { status: existing.status };
      }
      const acceptedCount = await tx
        .select({ value: count() })
        .from(eventRegistrations)
        .where(
          and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, 'ACCEPTED')),
        );
      const full =
        event.capacity !== null && Number(acceptedCount[0]?.value ?? 0) >= event.capacity;
      const status: EventStatus = full
        ? 'WAITLISTED'
        : event.admissionMode === 'approval'
          ? 'PENDING'
          : 'ACCEPTED';

      if (existing && sameStatus(existing.status, status)) return { status };
      assertEventTransition(existing?.status ?? null, status);
      const now = new Date();
      const registration = existing
        ? (
            await tx
              .update(eventRegistrations)
              .set({ status, requestedAt: now, updatedAt: now })
              .where(eq(eventRegistrations.id, existing.id))
              .returning({ id: eventRegistrations.id })
          )[0]
        : (
            await tx
              .insert(eventRegistrations)
              .values({ eventId, userId: user.id, status })
              .returning({ id: eventRegistrations.id })
          )[0];
      if (!registration) throw new BadRequestException('Registration could not be saved.');
      const [transition] = await tx
        .insert(eventRegistrationTransitions)
        .values({
          registrationId: registration.id,
          fromStatus: existing?.status ?? null,
          toStatus: status,
          actorUserId: user.id,
        })
        .returning({ id: eventRegistrationTransitions.id });
      if (transition)
        await this.notifyParticipation(
          tx,
          'event',
          eventId,
          user.id,
          transition.id,
          status,
          existing?.status ?? null,
        );
      return { status };
    });
    const messagingSyncPending = await this.messaging?.reconcileResourceMemberAccess(
      'event',
      eventId,
      user.id,
      result.status === 'ACCEPTED',
    );
    return { ...result, messagingSyncPending: messagingSyncPending ?? false };
  }

  async cancelEventRegistration(user: AuthenticatedUser, eventId: string) {
    const db = this.database();
    const result = await db.transaction(async (tx) => {
      const [event] = await tx
        .select({
          id: events.id,
          capacity: events.capacity,
          admissionMode: events.admissionMode,
          cancelled: events.cancelled,
          startsAt: events.startsAt,
        })
        .from(events)
        .where(eq(events.id, eventId))
        .for('update')
        .limit(1);
      if (!event) throw new NotFoundException('Event not found.');
      const [registration] = await tx
        .select({ id: eventRegistrations.id, status: eventRegistrations.status })
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, user.id)))
        .for('update')
        .limit(1);
      if (!registration) throw new NotFoundException('Registration not found.');
      if (registration.status === 'CANCELLED_BY_USER')
        return { status: registration.status, promotedUserIds: [] };
      assertEventTransition(registration.status, 'CANCELLED_BY_USER');
      await tx
        .update(eventRegistrations)
        .set({ status: 'CANCELLED_BY_USER', updatedAt: new Date() })
        .where(eq(eventRegistrations.id, registration.id));
      await tx.insert(eventRegistrationTransitions).values({
        registrationId: registration.id,
        fromStatus: registration.status,
        toStatus: 'CANCELLED_BY_USER',
        actorUserId: user.id,
      });
      const promotedUserIds =
        event.admissionMode !== 'approval' && !event.cancelled && event.startsAt > new Date()
          ? await this.promoteEventWaitlist(tx, eventId, event.capacity)
          : [];
      return { status: 'CANCELLED_BY_USER' as const, promotedUserIds };
    });
    const syncResults = await Promise.all([
      this.messaging?.reconcileResourceMemberAccess('event', eventId, user.id, false),
      ...result.promotedUserIds.map((userId) =>
        this.messaging?.reconcileResourceMemberAccess('event', eventId, userId, true),
      ),
    ]);
    return { status: result.status, messagingSyncPending: syncResults.some(Boolean) };
  }

  async myCommunityStatus(user: AuthenticatedUser, communityId: string) {
    const [row] = await this.database()
      .select({ status: communityMemberships.status })
      .from(communityMemberships)
      .where(
        and(
          eq(communityMemberships.communityId, communityId),
          eq(communityMemberships.userId, user.id),
        ),
      )
      .limit(1);
    return row ?? { status: null };
  }

  async myEventStatus(user: AuthenticatedUser, eventId: string) {
    const [row] = await this.database()
      .select({ status: eventRegistrations.status })
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, user.id)))
      .limit(1);
    return row ?? { status: null };
  }

  async myActivity(user: AuthenticatedUser) {
    const db = this.database();
    const [memberships, registrations] = await Promise.all([
      db
        .select({
          id: communities.id,
          name: communities.name,
          slug: communities.slug,
          status: communityMemberships.status,
          requestedAt: communityMemberships.requestedAt,
        })
        .from(communityMemberships)
        .innerJoin(communities, eq(communities.id, communityMemberships.communityId))
        .where(eq(communityMemberships.userId, user.id))
        .orderBy(desc(communityMemberships.requestedAt)),
      db
        .select({
          id: events.id,
          title: events.title,
          slug: events.slug,
          startsAt: events.startsAt,
          cancelled: events.cancelled,
          status: eventRegistrations.status,
          requestedAt: eventRegistrations.requestedAt,
        })
        .from(eventRegistrations)
        .innerJoin(events, eq(events.id, eventRegistrations.eventId))
        .where(eq(eventRegistrations.userId, user.id))
        .orderBy(desc(eventRegistrations.requestedAt)),
    ]);
    return { communities: memberships, events: registrations };
  }

  async communityParticipants(user: AuthenticatedUser, communityId: string) {
    await this.communitiesService.assertCanManage(user.id, communityId);
    const participants = await this.database()
      .select({
        id: communityMemberships.id,
        userId: communityMemberships.userId,
        displayName: profiles.displayName,
        avatarPath: profiles.avatarPath,
        status: communityMemberships.status,
        requestedAt: communityMemberships.requestedAt,
      })
      .from(communityMemberships)
      .innerJoin(profiles, eq(profiles.id, communityMemberships.userId))
      .where(eq(communityMemberships.communityId, communityId))
      .orderBy(communityMemberships.requestedAt);
    return participants.map(({ avatarPath, ...participant }) => ({
      ...participant,
      avatarUrl: this.publicAvatarUrl(avatarPath),
    }));
  }

  async eventParticipants(user: AuthenticatedUser, eventId: string) {
    await this.eventsService.assertCanManageById(user, eventId);
    const participants = await this.database()
      .select({
        id: eventRegistrations.id,
        userId: eventRegistrations.userId,
        displayName: profiles.displayName,
        avatarPath: profiles.avatarPath,
        status: eventRegistrations.status,
        requestedAt: eventRegistrations.requestedAt,
      })
      .from(eventRegistrations)
      .innerJoin(profiles, eq(profiles.id, eventRegistrations.userId))
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(eventRegistrations.requestedAt);
    return participants.map(({ avatarPath, ...participant }) => ({
      ...participant,
      avatarUrl: this.publicAvatarUrl(avatarPath),
    }));
  }

  async communityCounts(user: AuthenticatedUser, communityId: string) {
    await this.communitiesService.assertCanManage(user.id, communityId);
    const [community] = await this.database()
      .select({ admissionMode: communities.admissionMode })
      .from(communities)
      .where(eq(communities.id, communityId))
      .limit(1);
    if (!community) throw new NotFoundException('Community not found.');
    const counts = await this.database()
      .select({ status: communityMemberships.status, count: count() })
      .from(communityMemberships)
      .where(eq(communityMemberships.communityId, communityId))
      .groupBy(communityMemberships.status);
    return {
      capacity: 'unlimited',
      admissionMode: community.admissionMode,
      ...countStatuses(counts),
    };
  }

  async communityMembers(user: AuthenticatedUser, communityId: string) {
    await this.assertCanViewCommunityMembers(user, communityId);
    const rows = await this.database()
      .select({
        userId: profiles.id,
        displayName: profiles.displayName,
        avatarPath: profiles.avatarPath,
      })
      .from(communityMemberships)
      .innerJoin(profiles, eq(profiles.id, communityMemberships.userId))
      .where(
        and(
          eq(communityMemberships.communityId, communityId),
          eq(communityMemberships.status, 'ACTIVE'),
        ),
      )
      .orderBy(communityMemberships.requestedAt);
    const host = await this.communityHost(communityId);
    const members = rows
      .filter((member) => member.userId !== host?.userId)
      .map(({ avatarPath, ...member }) => ({
        ...member,
        isHost: false,
        avatarUrl: this.publicAvatarUrl(avatarPath),
      }));
    return host
      ? [
          {
            userId: host.userId,
            displayName: host.displayName,
            avatarUrl: this.publicAvatarUrl(host.avatarPath),
            isHost: true,
          },
          ...members,
        ]
      : members;
  }

  async communityMemberPreview(user: AuthenticatedUser, communityId: string) {
    await this.assertCanViewCommunityMembers(user, communityId);
    const db = this.database();
    const [totalRows, members, host] = await Promise.all([
      db
        .select({ total: count() })
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.communityId, communityId),
            eq(communityMemberships.status, 'ACTIVE'),
          ),
        ),
      db
        .select({
          userId: profiles.id,
          displayName: profiles.displayName,
          avatarPath: profiles.avatarPath,
        })
        .from(communityMemberships)
        .innerJoin(profiles, eq(profiles.id, communityMemberships.userId))
        .where(
          and(
            eq(communityMemberships.communityId, communityId),
            eq(communityMemberships.status, 'ACTIVE'),
          ),
        )
        .orderBy(communityMemberships.requestedAt)
        .limit(12),
      this.communityHost(communityId),
    ]);
    return {
      host: host
        ? {
            userId: host.userId,
            displayName: host.displayName,
            avatarUrl: this.publicAvatarUrl(host.avatarPath),
            isHost: true,
          }
        : null,
      total: Number(totalRows[0]?.total ?? 0) + (host && !host.isMember ? 1 : 0),
      members: members.map(({ avatarPath, ...member }) => ({
        ...member,
        isHost: member.userId === host?.userId,
        avatarUrl: this.publicAvatarUrl(avatarPath),
      })),
    };
  }

  private async communityHost(communityId: string) {
    const [host] = await this.database()
      .select({
        userId: profiles.id,
        displayName: profiles.displayName,
        avatarPath: profiles.avatarPath,
        isMember: sql<boolean>`exists (select 1 from ${communityMemberships} where ${communityMemberships.communityId} = ${communityId} and ${communityMemberships.userId} = ${profiles.id} and ${communityMemberships.status} = 'ACTIVE')`,
      })
      .from(communities)
      .innerJoin(profiles, sql`${profiles.id}::text = ${communities.ownerId}`)
      .where(and(eq(communities.id, communityId), eq(communities.ownerType, 'user')))
      .limit(1);
    return host;
  }

  private async assertCanViewCommunityMembers(user: AuthenticatedUser, communityId: string) {
    try {
      await this.communitiesService.assertCanManage(user.id, communityId);
      return;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) throw error;
    }
    const [membership] = await this.database()
      .select({ id: communityMemberships.id })
      .from(communityMemberships)
      .innerJoin(communities, eq(communities.id, communityMemberships.communityId))
      .where(
        and(
          eq(communityMemberships.communityId, communityId),
          eq(communityMemberships.userId, user.id),
          eq(communityMemberships.status, 'ACTIVE'),
          eq(communities.archived, false),
        ),
      )
      .limit(1);
    if (!membership) throw new ForbiddenException('Join this community to view its members.');
  }

  async eventCounts(user: AuthenticatedUser, eventId: string) {
    await this.eventsService.assertCanManageById(user, eventId);
    const [event] = await this.database()
      .select({ capacity: events.capacity, admissionMode: events.admissionMode })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) throw new NotFoundException('Event not found.');
    const counts = await this.database()
      .select({ status: eventRegistrations.status, count: count() })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId))
      .groupBy(eventRegistrations.status);
    return {
      capacity: event.capacity === null ? 'unlimited' : String(event.capacity),
      admissionMode: event.admissionMode,
      ...countStatuses(counts),
    };
  }

  async eventAttendees(user: AuthenticatedUser, eventId: string) {
    await this.assertCanViewEventAttendees(user, eventId);
    const rows = await this.database()
      .select({
        userId: profiles.id,
        displayName: profiles.displayName,
        avatarPath: profiles.avatarPath,
      })
      .from(eventRegistrations)
      .innerJoin(profiles, eq(profiles.id, eventRegistrations.userId))
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          inArray(eventRegistrations.status, ['ACCEPTED', 'ATTENDED', 'NO_SHOW']),
        ),
      )
      .orderBy(eventRegistrations.requestedAt);
    const host = await this.eventHost(eventId);
    const attendees = rows
      .filter((person) => person.userId !== host?.userId)
      .map(({ avatarPath, ...person }) => ({
        ...person,
        isHost: false,
        avatarUrl: this.publicAvatarUrl(avatarPath),
      }));
    return host
      ? [
          {
            userId: host.userId,
            displayName: host.displayName,
            avatarUrl: this.publicAvatarUrl(host.avatarPath),
            isHost: true,
          },
          ...attendees,
        ]
      : attendees;
  }

  async eventAttendeePreview(user: AuthenticatedUser, eventId: string) {
    await this.assertCanViewEventAttendees(user, eventId);
    const db = this.database();
    const [totals, attendees, host] = await Promise.all([
      db
        .select({ total: count() })
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.eventId, eventId),
            inArray(eventRegistrations.status, ['ACCEPTED', 'ATTENDED', 'NO_SHOW']),
          ),
        ),
      db
        .select({
          userId: profiles.id,
          displayName: profiles.displayName,
          avatarPath: profiles.avatarPath,
        })
        .from(eventRegistrations)
        .innerJoin(profiles, eq(profiles.id, eventRegistrations.userId))
        .where(
          and(
            eq(eventRegistrations.eventId, eventId),
            inArray(eventRegistrations.status, ['ACCEPTED', 'ATTENDED', 'NO_SHOW']),
          ),
        )
        .orderBy(eventRegistrations.requestedAt)
        .limit(6),
      this.eventHost(eventId),
    ]);
    return {
      host: host
        ? {
            userId: host.userId,
            displayName: host.displayName,
            avatarUrl: this.publicAvatarUrl(host.avatarPath),
            isHost: true,
          }
        : null,
      total: Number(totals[0]?.total ?? 0) + (host && !host.isMember ? 1 : 0),
      members: attendees.map(({ avatarPath, ...person }) => ({
        ...person,
        isHost: person.userId === host?.userId,
        avatarUrl: this.publicAvatarUrl(avatarPath),
      })),
    };
  }

  private async eventHost(eventId: string) {
    const [host] = await this.database()
      .select({
        userId: profiles.id,
        displayName: profiles.displayName,
        avatarPath: profiles.avatarPath,
        isMember: sql<boolean>`exists (select 1 from ${eventRegistrations} where ${eventRegistrations.eventId} = ${eventId} and ${eventRegistrations.userId} = ${profiles.id} and ${eventRegistrations.status} in ('ACCEPTED', 'ATTENDED', 'NO_SHOW'))`,
      })
      .from(events)
      .innerJoin(
        profiles,
        sql`${profiles.id}::text = case when ${events.hostType} = 'user' then ${events.hostId} else ${events.createdByUserId}::text end`,
      )
      .where(eq(events.id, eventId))
      .limit(1);
    return host;
  }

  private async assertCanViewEventAttendees(user: AuthenticatedUser, eventId: string) {
    try {
      await this.eventsService.assertCanManageById(user, eventId);
      return;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) throw error;
    }
    const [registration] = await this.database()
      .select({ id: eventRegistrations.id })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.userId, user.id),
          inArray(eventRegistrations.status, ['ACCEPTED', 'ATTENDED', 'NO_SHOW']),
        ),
      )
      .limit(1);
    if (!registration)
      throw new ForbiddenException('Register for this event to view its attendees.');
  }

  async decideCommunity(
    user: AuthenticatedUser,
    communityId: string,
    membershipId: string,
    action: 'approve' | 'reject' | 'promote' | 'remove',
  ) {
    await this.communitiesService.assertCanManage(user.id, communityId);
    const result = await this.database().transaction(async (tx) => {
      const [community] = await tx
        .select({
          id: communities.id,
          admissionMode: communities.admissionMode,
        })
        .from(communities)
        .where(eq(communities.id, communityId))
        .for('update')
        .limit(1);
      if (!community) throw new NotFoundException('Community not found.');
      const [membership] = await tx
        .select({
          id: communityMemberships.id,
          status: communityMemberships.status,
          userId: communityMemberships.userId,
        })
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.id, membershipId),
            eq(communityMemberships.communityId, communityId),
          ),
        )
        .for('update')
        .limit(1);
      if (!membership) throw new NotFoundException('Membership not found.');

      let status: CommunityStatus;
      if (action === 'reject') {
        status = 'REJECTED';
        if (!['PENDING', 'WAITLISTED'].includes(membership.status))
          throw new BadRequestException('Only pending or waitlisted members can be rejected.');
      } else if (action === 'remove') {
        status = 'REMOVED';
        if (!['PENDING', 'WAITLISTED', 'ACTIVE'].includes(membership.status))
          throw new BadRequestException('This membership cannot be removed.');
      } else {
        if (action === 'approve' && membership.status !== 'PENDING')
          throw new BadRequestException('Only pending membership requests can be approved.');
        if (
          action === 'promote' &&
          (membership.status !== 'WAITLISTED' || community.admissionMode !== 'approval')
        ) {
          throw new BadRequestException(
            'Only manual waitlist entries can be promoted by an organizer.',
          );
        }
        status = 'ACTIVE';
      }
      await this.updateMembershipState(
        tx,
        membership.id,
        membership.status,
        status,
        user.id,
        communityId,
        membership.userId,
      );
      const promotedUserIds =
        (action === 'remove' || (action === 'reject' && membership.status === 'WAITLISTED')) &&
        community.admissionMode !== 'approval'
          ? await this.promoteCommunityWaitlist(tx, communityId)
          : [];
      return { participantId: membershipId, status, userId: membership.userId, promotedUserIds };
    });
    const syncResults = await Promise.all([
      this.messaging?.reconcileResourceMemberAccess(
        'community',
        communityId,
        result.userId,
        result.status === 'ACTIVE',
      ),
      ...result.promotedUserIds.map((userId) =>
        this.messaging?.reconcileResourceMemberAccess('community', communityId, userId, true),
      ),
    ]);
    return {
      participantId: result.participantId,
      status: result.status,
      messagingSyncPending: syncResults.some(Boolean),
    };
  }

  async decideEvent(
    user: AuthenticatedUser,
    eventId: string,
    registrationId: string,
    action: 'approve' | 'reject' | 'promote' | 'remove' | 'attended' | 'no-show',
  ) {
    await this.eventsService.assertCanManageById(user, eventId);
    const result = await this.database().transaction(async (tx) => {
      const [event] = await tx
        .select({
          id: events.id,
          capacity: events.capacity,
          admissionMode: events.admissionMode,
          cancelled: events.cancelled,
          startsAt: events.startsAt,
        })
        .from(events)
        .where(eq(events.id, eventId))
        .for('update')
        .limit(1);
      if (!event) throw new NotFoundException('Event not found.');
      const [registration] = await tx
        .select({
          id: eventRegistrations.id,
          status: eventRegistrations.status,
          userId: eventRegistrations.userId,
        })
        .from(eventRegistrations)
        .where(
          and(eq(eventRegistrations.id, registrationId), eq(eventRegistrations.eventId, eventId)),
        )
        .for('update')
        .limit(1);
      if (!registration) throw new NotFoundException('Registration not found.');

      let status: EventStatus;
      if (action === 'reject') {
        status = 'REJECTED';
        if (!['PENDING', 'WAITLISTED'].includes(registration.status))
          throw new BadRequestException(
            'Only pending or waitlisted registrations can be rejected.',
          );
      } else if (action === 'remove') {
        status = 'REMOVED_BY_ORGANIZER';
        if (!['PENDING', 'WAITLISTED', 'ACCEPTED'].includes(registration.status))
          throw new BadRequestException('This registration cannot be removed.');
      } else if (action === 'attended' || action === 'no-show') {
        if (event.cancelled)
          throw new BadRequestException('Attendance cannot be recorded for a cancelled event.');
        if (!['ACCEPTED', 'ATTENDED', 'NO_SHOW'].includes(registration.status)) {
          throw new BadRequestException('Only accepted attendees can be marked for attendance.');
        }
        if (event.startsAt > new Date())
          throw new BadRequestException('Attendance can only be recorded after the event starts.');
        status = action === 'attended' ? 'ATTENDED' : 'NO_SHOW';
      } else {
        if (event.cancelled)
          throw new BadRequestException('Cancelled events cannot accept registrations.');
        if (action === 'approve' && registration.status !== 'PENDING')
          throw new BadRequestException('Only pending registrations can be approved.');
        if (
          action === 'promote' &&
          (registration.status !== 'WAITLISTED' || event.admissionMode !== 'approval')
        ) {
          throw new BadRequestException(
            'Only manual waitlist entries can be promoted by an organizer.',
          );
        }
        status = (await this.eventHasCapacity(tx, eventId, event.capacity))
          ? 'ACCEPTED'
          : 'WAITLISTED';
        if (action === 'promote' && status !== 'ACCEPTED')
          throw new BadRequestException('No event capacity is currently available.');
      }
      await this.updateRegistrationState(
        tx,
        registration.id,
        registration.status,
        status,
        user.id,
        eventId,
        registration.userId,
      );
      const promotedUserIds =
        (action === 'remove' || (action === 'reject' && registration.status === 'WAITLISTED')) &&
        event.admissionMode !== 'approval' &&
        !event.cancelled &&
        event.startsAt > new Date()
          ? await this.promoteEventWaitlist(tx, eventId, event.capacity)
          : [];
      return {
        participantId: registrationId,
        status,
        userId: registration.userId,
        promotedUserIds,
      };
    });
    const syncResults = await Promise.all([
      this.messaging?.reconcileResourceMemberAccess(
        'event',
        eventId,
        result.userId,
        ['ACCEPTED', 'ATTENDED', 'NO_SHOW'].includes(result.status),
      ),
      ...result.promotedUserIds.map((userId) =>
        this.messaging?.reconcileResourceMemberAccess('event', eventId, userId, true),
      ),
    ]);
    return {
      participantId: result.participantId,
      status: result.status,
      messagingSyncPending: syncResults.some(Boolean),
    };
  }

  private async eventHasCapacity(
    tx: Transaction,
    eventId: string,
    capacity: number | null,
  ): Promise<boolean> {
    if (capacity === null) return true;
    const [accepted] = await tx
      .select({ value: count() })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          inArray(eventRegistrations.status, ['ACCEPTED', 'ATTENDED', 'NO_SHOW']),
        ),
      );
    return Number(accepted?.value ?? 0) < capacity;
  }

  private async updateMembershipState(
    tx: Transaction,
    id: string,
    from: CommunityStatus,
    to: CommunityStatus,
    actorUserId: string | null,
    communityId: string,
    recipientUserId: string,
  ) {
    assertCommunityTransition(from, to);
    await tx
      .update(communityMemberships)
      .set({ status: to, updatedAt: new Date() })
      .where(eq(communityMemberships.id, id));
    const [transition] = await tx
      .insert(communityMembershipTransitions)
      .values({ membershipId: id, fromStatus: from, toStatus: to, actorUserId })
      .returning({ id: communityMembershipTransitions.id });
    if (transition)
      await this.notifyParticipation(
        tx,
        'community',
        communityId,
        recipientUserId,
        transition.id,
        to,
        from,
      );
  }

  private async updateRegistrationState(
    tx: Transaction,
    id: string,
    from: EventStatus,
    to: EventStatus,
    actorUserId: string | null,
    eventId: string,
    recipientUserId: string,
  ) {
    assertEventTransition(from, to);
    await tx
      .update(eventRegistrations)
      .set({ status: to, updatedAt: new Date() })
      .where(eq(eventRegistrations.id, id));
    const [transition] = await tx
      .insert(eventRegistrationTransitions)
      .values({ registrationId: id, fromStatus: from, toStatus: to, actorUserId })
      .returning({ id: eventRegistrationTransitions.id });
    if (transition)
      await this.notifyParticipation(
        tx,
        'event',
        eventId,
        recipientUserId,
        transition.id,
        to,
        from,
      );
  }

  private async promoteCommunityWaitlist(tx: Transaction, communityId: string): Promise<string[]> {
    const promotedUserIds: string[] = [];
    while (true) {
      const [next] = await tx
        .select({
          id: communityMemberships.id,
          status: communityMemberships.status,
          userId: communityMemberships.userId,
        })
        .from(communityMemberships)
        .where(
          and(
            eq(communityMemberships.communityId, communityId),
            eq(communityMemberships.status, 'WAITLISTED'),
          ),
        )
        .orderBy(asc(communityMemberships.requestedAt), asc(communityMemberships.id))
        .for('update')
        .limit(1);
      if (!next) return promotedUserIds;
      await this.updateMembershipState(
        tx,
        next.id,
        next.status,
        'ACTIVE',
        null,
        communityId,
        next.userId,
      );
      promotedUserIds.push(next.userId);
    }
  }

  private async promoteEventWaitlist(
    tx: Transaction,
    eventId: string,
    capacity: number | null,
  ): Promise<string[]> {
    const promotedUserIds: string[] = [];
    while (await this.eventHasCapacity(tx, eventId, capacity)) {
      const [next] = await tx
        .select({
          id: eventRegistrations.id,
          status: eventRegistrations.status,
          userId: eventRegistrations.userId,
        })
        .from(eventRegistrations)
        .where(
          and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, 'WAITLISTED')),
        )
        .orderBy(asc(eventRegistrations.requestedAt), asc(eventRegistrations.id))
        .for('update')
        .limit(1);
      if (!next) return promotedUserIds;
      await this.updateRegistrationState(
        tx,
        next.id,
        next.status,
        'ACCEPTED',
        null,
        eventId,
        next.userId,
      );
      promotedUserIds.push(next.userId);
    }
    return promotedUserIds;
  }

  private async notifyParticipation(
    tx: Transaction,
    contextType: 'community' | 'event',
    contextId: string,
    recipientUserId: string,
    transitionId: string,
    to: CommunityStatus | EventStatus,
    from: CommunityStatus | EventStatus | null,
  ) {
    if (
      !this.notifications ||
      !['ACTIVE', 'ACCEPTED', 'REJECTED', 'REMOVED', 'REMOVED_BY_ORGANIZER'].includes(to)
    )
      return;
    const outcome =
      from === 'WAITLISTED' && (to === 'ACTIVE' || to === 'ACCEPTED')
        ? 'waitlist_promoted'
        : to.toLowerCase();
    await this.notifications.create(
      tx,
      {
        recipientUserId,
        eventKey: `${contextType}-transition:${transitionId}`,
        type: `${contextType}_${outcome}`,
        contextType,
        contextId,
      },
      true,
    );
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }

  private publicAvatarUrl(path: string | null): string | null {
    const supabaseUrl = this.config?.get<string>('SUPABASE_URL');
    if (!path || !supabaseUrl) return null;
    return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/profile-photos/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
  }
}

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function countStatuses<T extends { status: string; count: number | string }>(rows: T[]) {
  const statuses = [
    'PENDING',
    'WAITLISTED',
    'ACTIVE',
    'ACCEPTED',
    'REJECTED',
    'LEFT',
    'REMOVED',
    'CANCELLED_BY_USER',
    'REMOVED_BY_ORGANIZER',
    'ATTENDED',
    'NO_SHOW',
  ];
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      Number(rows.find((row) => row.status === status)?.count ?? 0),
    ]),
  );
}
