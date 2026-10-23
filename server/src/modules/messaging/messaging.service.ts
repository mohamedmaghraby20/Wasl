import {
  ForbiddenException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DATABASE, type Database } from '../../db/database.module';
import {
  communities,
  communityMemberships,
  eventRegistrations,
  events,
  messagingConversations,
  messagingMemberSync,
  messagingReports,
  messagingUserBlocks,
  messagingUserMappings,
  profiles,
  users,
} from '../../db/schema';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CommunitiesService } from '../communities/communities.service';
import { EventsService } from '../events/events.service';
import { directMessagePair, providerChannelId, providerUserId } from './messaging-identity';
import { StreamChatAdapter } from './stream-chat.adapter';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly config: ConfigService,
    private readonly stream: StreamChatAdapter,
    private readonly communitiesService: CommunitiesService,
    private readonly eventsService: EventsService,
  ) {}

  async session(user: AuthenticatedUser) {
    this.assertProviderReady();
    const db = this.database();
    await this.reconcileMemberships(user);
    const [profile] = await db
      .select({ name: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    if (!profile) throw new ServiceUnavailableException('Messaging profile is unavailable.');
    const streamUserId = providerUserId(user.id);
    await db
      .insert(messagingUserMappings)
      .values({ userId: user.id, providerUserId: streamUserId })
      .onConflictDoNothing();
    await this.stream.upsertUser(streamUserId, profile.name);
    const issued = this.stream.token(streamUserId);
    return { apiKey: this.stream.apiKey!, userId: streamUserId, ...issued };
  }

  async openResourceChannel(
    user: AuthenticatedUser,
    kind: 'community' | 'event',
    resourceId: string,
  ) {
    this.assertProviderReady();
    const db = this.database();
    const [resource] =
      kind === 'community'
        ? await db
            .select({ id: communities.id })
            .from(communities)
            .where(
              and(
                or(eq(communities.id, resourceId), eq(communities.slug, resourceId)),
                eq(communities.archived, false),
              ),
            )
            .limit(1)
        : await db
            .select({ id: events.id })
            .from(events)
            .where(
              and(
                or(eq(events.id, resourceId), eq(events.slug, resourceId)),
                eq(events.cancelled, false),
              ),
            )
            .limit(1);
    if (!resource) throw new NotFoundException('Resource not found.');
    await this.assertEligible(user, kind, resource.id);
    const [profile] = await db
      .select({ name: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    if (!profile) throw new ServiceUnavailableException('Messaging profile is unavailable.');
    const streamUserId = providerUserId(user.id);
    await db
      .insert(messagingUserMappings)
      .values({ userId: user.id, providerUserId: streamUserId })
      .onConflictDoNothing();

    const id = randomUUID();
    await db
      .insert(messagingConversations)
      .values({
        id,
        kind,
        providerChannelId: providerChannelId(id),
        ...(kind === 'community' ? { communityId: resource.id } : { eventId: resource.id }),
      })
      .onConflictDoNothing();
    const [conversation] = await db
      .select({
        id: messagingConversations.id,
        channelId: messagingConversations.providerChannelId,
      })
      .from(messagingConversations)
      .where(
        kind === 'community'
          ? eq(messagingConversations.communityId, resource.id)
          : eq(messagingConversations.eventId, resource.id),
      )
      .limit(1);
    if (!conversation)
      throw new ServiceUnavailableException('Messaging channel could not be created.');

    await db
      .insert(messagingMemberSync)
      .values({
        conversationId: conversation.id,
        userId: user.id,
        providerMember: false,
        desiredMember: true,
        lastCheckedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [messagingMemberSync.conversationId, messagingMemberSync.userId],
        set: { desiredMember: true, lastCheckedAt: new Date() },
      });

    const isManager = await this.isManager(user.id, kind, resource.id);
    try {
      await this.stream.upsertUser(streamUserId, profile.name);
      await this.stream.ensureChannel(conversation.channelId);
      await this.stream.setMemberRole(conversation.channelId, streamUserId, isManager);
      await db
        .insert(messagingMemberSync)
        .values({
          conversationId: conversation.id,
          userId: user.id,
          providerMember: true,
          desiredMember: true,
          lastError: null,
          lastCheckedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [messagingMemberSync.conversationId, messagingMemberSync.userId],
          set: {
            providerMember: true,
            desiredMember: true,
            lastError: null,
            lastCheckedAt: new Date(),
          },
        });
    } catch (error) {
      await db
        .insert(messagingMemberSync)
        .values({
          conversationId: conversation.id,
          userId: user.id,
          providerMember: false,
          desiredMember: true,
          lastError:
            error instanceof Error
              ? error.message.slice(0, 2000)
              : 'Provider membership sync failed.',
          lastCheckedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [messagingMemberSync.conversationId, messagingMemberSync.userId],
          set: {
            desiredMember: true,
            lastError:
              error instanceof Error
                ? error.message.slice(0, 2000)
                : 'Provider membership sync failed.',
            lastCheckedAt: new Date(),
          },
        });
      throw error;
    }
    try {
      await this.assertEligible(user, kind, resource.id);
    } catch (error) {
      await db
        .update(messagingMemberSync)
        .set({ desiredMember: false, lastCheckedAt: new Date() })
        .where(
          and(
            eq(messagingMemberSync.conversationId, conversation.id),
            eq(messagingMemberSync.userId, user.id),
          ),
        );
      try {
        await this.stream.removeMember(conversation.channelId, streamUserId);
        await db
          .update(messagingMemberSync)
          .set({ providerMember: false, lastError: null, lastCheckedAt: new Date() })
          .where(
            and(
              eq(messagingMemberSync.conversationId, conversation.id),
              eq(messagingMemberSync.userId, user.id),
            ),
          );
      } catch (syncError) {
        await db
          .update(messagingMemberSync)
          .set({
            lastError:
              syncError instanceof Error
                ? syncError.message.slice(0, 2000)
                : 'Stream access revocation failed.',
            lastCheckedAt: new Date(),
          })
          .where(
            and(
              eq(messagingMemberSync.conversationId, conversation.id),
              eq(messagingMemberSync.userId, user.id),
            ),
          );
        throw new ServiceUnavailableException(
          'Chat access changed; provider synchronization is pending for retry.',
        );
      }
      throw error;
    }
    return {
      conversationId: conversation.id,
      channelId: conversation.channelId,
      channelType: 'messaging',
    };
  }

  async reconcileResourceAccess(kind: 'community' | 'event', resourceId: string): Promise<boolean> {
    const [conversation] = await this.database()
      .select({
        id: messagingConversations.id,
        channelId: messagingConversations.providerChannelId,
      })
      .from(messagingConversations)
      .where(
        kind === 'community'
          ? eq(messagingConversations.communityId, resourceId)
          : eq(messagingConversations.eventId, resourceId),
      )
      .limit(1);
    if (!conversation) return false;
    const members = await this.database()
      .select({
        userId: messagingMemberSync.userId,
        providerMember: messagingMemberSync.providerMember,
      })
      .from(messagingMemberSync)
      .where(eq(messagingMemberSync.conversationId, conversation.id));
    let syncPending = false;
    for (const member of members) {
      let desired = false;
      let moderator = false;
      try {
        if (await this.isAccountActive(member.userId)) {
          const manager = await this.isManager(member.userId, kind, resourceId);
          moderator = manager;
          const [resource] =
            kind === 'community'
              ? await this.database()
                  .select({ closed: communities.archived })
                  .from(communities)
                  .where(eq(communities.id, resourceId))
                  .limit(1)
              : await this.database()
                  .select({ closed: events.cancelled })
                  .from(events)
                  .where(eq(events.id, resourceId))
                  .limit(1);
          if (!resource?.closed) {
            const [participation] =
              kind === 'community'
                ? await this.database()
                    .select({ status: communityMemberships.status })
                    .from(communityMemberships)
                    .where(
                      and(
                        eq(communityMemberships.communityId, resourceId),
                        eq(communityMemberships.userId, member.userId),
                      ),
                    )
                    .limit(1)
                : await this.database()
                    .select({ status: eventRegistrations.status })
                    .from(eventRegistrations)
                    .where(
                      and(
                        eq(eventRegistrations.eventId, resourceId),
                        eq(eventRegistrations.userId, member.userId),
                      ),
                    )
                    .limit(1);
            desired = manager || this.hasParticipationAccess(kind, participation?.status);
          }
        }
      } catch (error) {
        if (!(error instanceof ForbiddenException)) throw error;
      }
      await this.database()
        .update(messagingMemberSync)
        .set({ desiredMember: desired, lastCheckedAt: new Date() })
        .where(
          and(
            eq(messagingMemberSync.conversationId, conversation.id),
            eq(messagingMemberSync.userId, member.userId),
          ),
        );
      if (this.config.get<string>('STREAM_PERMISSIONS_VERIFIED') !== 'true') {
        if (desired) {
          syncPending ||= !member.providerMember;
          continue;
        }
        try {
          await this.syncMember(
            conversation.id,
            conversation.channelId,
            member.userId,
            false,
            member.providerMember,
          );
        } catch (error) {
          if (!(error instanceof ServiceUnavailableException)) throw error;
          syncPending = true;
        }
        continue;
      }
      try {
        await this.syncMember(
          conversation.id,
          conversation.channelId,
          member.userId,
          desired,
          member.providerMember,
          moderator,
        );
      } catch (error) {
        if (!(error instanceof ServiceUnavailableException)) throw error;
        syncPending = true;
      }
    }
    return syncPending;
  }

  async reconcilePendingMemberships(): Promise<void> {
    if (this.config.get<string>('STREAM_PERMISSIONS_VERIFIED') !== 'true') return;
    const usersWithMessagingChannels = await this.database()
      .selectDistinct({ userId: messagingMemberSync.userId })
      .from(messagingMemberSync);
    for (const row of usersWithMessagingChannels) {
      try {
        await this.reconcileMemberships({ id: row.userId, authUserId: 'messaging-reconcile' });
      } catch {
        // syncMember persists the provider error and the next scheduled pass retries it.
        this.logger.warn('A pending Stream membership sync remains in the retry queue.');
      }
    }
  }

  private async reconcileMemberships(user: AuthenticatedUser) {
    const pending = await this.database()
      .select({
        conversationId: messagingMemberSync.conversationId,
        providerMember: messagingMemberSync.providerMember,
        desiredMember: messagingMemberSync.desiredMember,
        kind: messagingConversations.kind,
        channelId: messagingConversations.providerChannelId,
        communityId: messagingConversations.communityId,
        eventId: messagingConversations.eventId,
      })
      .from(messagingMemberSync)
      .innerJoin(
        messagingConversations,
        eq(messagingConversations.id, messagingMemberSync.conversationId),
      )
      .where(eq(messagingMemberSync.userId, user.id));
    for (const item of pending) {
      let authorized = item.desiredMember;
      let moderator = false;
      if (authorized && !(await this.isAccountActive(user.id))) authorized = false;
      if (authorized && item.kind !== 'dm') {
        try {
          if (item.kind === 'community' && item.communityId) {
            moderator = await this.isManager(user.id, 'community', item.communityId);
            await this.assertEligible(user, 'community', item.communityId);
          } else if (item.kind === 'event' && item.eventId) {
            moderator = await this.isManager(user.id, 'event', item.eventId);
            await this.assertEligible(user, 'event', item.eventId);
          }
        } catch (error) {
          if (!(error instanceof ForbiddenException)) throw error;
          authorized = false;
        }
      } else if (authorized && item.kind === 'dm') {
        const otherUserId = await this.otherDmUser(item.conversationId, user.id);
        if (!(await this.isAccountActive(otherUserId))) authorized = false;
        const [blocked] = await this.database()
          .select({ blocker: messagingUserBlocks.blockerUserId })
          .from(messagingUserBlocks)
          .where(
            or(
              and(
                eq(messagingUserBlocks.blockerUserId, user.id),
                eq(messagingUserBlocks.blockedUserId, otherUserId),
              ),
              and(
                eq(messagingUserBlocks.blockedUserId, user.id),
                eq(messagingUserBlocks.blockerUserId, otherUserId),
              ),
            ),
          )
          .limit(1);
        if (blocked) authorized = false;
      }
      if (authorized !== item.desiredMember) {
        await this.database()
          .update(messagingMemberSync)
          .set({ desiredMember: authorized, lastCheckedAt: new Date() })
          .where(
            and(
              eq(messagingMemberSync.conversationId, item.conversationId),
              eq(messagingMemberSync.userId, user.id),
            ),
          );
      }
      if (item.providerMember !== authorized || (authorized && item.kind !== 'dm'))
        await this.syncMember(
          item.conversationId,
          item.channelId,
          user.id,
          authorized,
          item.providerMember,
          moderator,
        );
    }
  }

  private async syncMember(
    conversationId: string,
    channelId: string,
    userId: string,
    desired: boolean,
    current: boolean,
    moderator = false,
  ) {
    if (desired === current && (!desired || !channelId.startsWith('wasl_'))) return;
    const providerId = providerUserId(userId);
    try {
      if (desired) {
        const [profile] = await this.database()
          .select({ name: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.id, userId))
          .limit(1);
        if (!profile) throw new ServiceUnavailableException('Messaging profile is unavailable.');
        await this.stream.upsertUser(providerId, profile.name);
        await this.stream.ensureChannel(channelId);
        await this.stream.setMemberRole(channelId, providerId, moderator);
      } else {
        await this.stream.removeMember(channelId, providerId);
      }
      await this.database()
        .update(messagingMemberSync)
        .set({ providerMember: desired, lastError: null, lastCheckedAt: new Date() })
        .where(
          and(
            eq(messagingMemberSync.conversationId, conversationId),
            eq(messagingMemberSync.userId, userId),
          ),
        );
    } catch (error) {
      await this.database()
        .update(messagingMemberSync)
        .set({
          lastError:
            error instanceof Error
              ? error.message.slice(0, 2000)
              : 'Provider membership sync failed.',
          lastCheckedAt: new Date(),
        })
        .where(
          and(
            eq(messagingMemberSync.conversationId, conversationId),
            eq(messagingMemberSync.userId, userId),
          ),
        );
      throw new ServiceUnavailableException('Messaging access synchronization is pending.');
    }
  }

  private async otherDmUser(conversationId: string, userId: string): Promise<string> {
    const [conversation] = await this.database()
      .select({
        low: messagingConversations.dmUserLowId,
        high: messagingConversations.dmUserHighId,
      })
      .from(messagingConversations)
      .where(eq(messagingConversations.id, conversationId))
      .limit(1);
    if (!conversation?.low || !conversation.high)
      throw new NotFoundException('Direct conversation not found.');
    return conversation.low === userId ? conversation.high : conversation.low;
  }

  private async isAccountActive(userId: string): Promise<boolean> {
    const [account] = await this.database()
      .select({ status: users.accountStatus })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return account?.status === 'ACTIVE';
  }

  async listConversations(user: AuthenticatedUser) {
    const rows = await this.database()
      .select({
        id: messagingConversations.id,
        kind: messagingConversations.kind,
        channelId: messagingConversations.providerChannelId,
        communityId: messagingConversations.communityId,
        eventId: messagingConversations.eventId,
        dmUserLowId: messagingConversations.dmUserLowId,
        dmUserHighId: messagingConversations.dmUserHighId,
      })
      .from(messagingConversations)
      .where(
        or(
          eq(messagingConversations.dmUserLowId, user.id),
          eq(messagingConversations.dmUserHighId, user.id),
        ),
      );
    const memberships = await this.database()
      .select({
        conversationId: messagingMemberSync.conversationId,
        kind: messagingConversations.kind,
        channelId: messagingConversations.providerChannelId,
        communityId: messagingConversations.communityId,
        eventId: messagingConversations.eventId,
        communityName: communities.name,
        eventTitle: events.title,
      })
      .from(messagingMemberSync)
      .innerJoin(
        messagingConversations,
        eq(messagingConversations.id, messagingMemberSync.conversationId),
      )
      .leftJoin(communities, eq(communities.id, messagingConversations.communityId))
      .leftJoin(events, eq(events.id, messagingConversations.eventId))
      .where(
        and(
          eq(messagingMemberSync.userId, user.id),
          eq(messagingMemberSync.desiredMember, true),
          or(
            eq(messagingConversations.kind, 'community'),
            eq(messagingConversations.kind, 'event'),
          ),
        ),
      );
    const blocks = await this.database()
      .select({
        blocker: messagingUserBlocks.blockerUserId,
        blocked: messagingUserBlocks.blockedUserId,
      })
      .from(messagingUserBlocks)
      .where(
        or(
          eq(messagingUserBlocks.blockerUserId, user.id),
          eq(messagingUserBlocks.blockedUserId, user.id),
        ),
      );
    const allowed = new Set(memberships.map((row) => row.conversationId));
    const combined = [
      ...rows.map((row) => ({ ...row, communityName: null, eventTitle: null })),
      ...memberships.map((row) => ({
        id: row.conversationId,
        kind: row.kind,
        channelId: row.channelId,
        communityId: row.communityId,
        eventId: row.eventId,
        communityName: row.communityName,
        eventTitle: row.eventTitle,
        dmUserLowId: null,
        dmUserHighId: null,
      })),
    ].filter((row) =>
      row.kind === 'dm'
        ? !blocks.some(
            (block) =>
              (block.blocker === user.id &&
                block.blocked ===
                  (row.dmUserLowId === user.id ? row.dmUserHighId : row.dmUserLowId)) ||
              (block.blocked === user.id &&
                block.blocker ===
                  (row.dmUserLowId === user.id ? row.dmUserHighId : row.dmUserLowId)),
          )
        : allowed.has(row.id),
    );
    const otherIds = [
      ...new Set(
        combined.flatMap((row) =>
          row.kind === 'dm'
            ? [row.dmUserLowId === user.id ? row.dmUserHighId : row.dmUserLowId].filter(
                (value): value is string => Boolean(value),
              )
            : [],
        ),
      ),
    ];
    const activeOthers = otherIds.length
      ? await this.database()
          .select({ id: users.id })
          .from(users)
          .where(and(inArray(users.id, otherIds), eq(users.accountStatus, 'ACTIVE')))
      : [];
    const activeIds = new Set(activeOthers.map((row) => row.id));
    const names = activeIds.size
      ? await this.database()
          .select({ id: profiles.id, name: profiles.displayName })
          .from(profiles)
          .where(inArray(profiles.id, [...activeIds]))
      : [];
    const nameMap = new Map(names.map((row) => [row.id, row.name]));
    return combined
      .filter(
        (row) =>
          row.kind !== 'dm' ||
          activeIds.has(row.dmUserLowId === user.id ? row.dmUserHighId! : row.dmUserLowId!),
      )
      .map((row) => {
        const otherUserId =
          row.kind === 'dm'
            ? row.dmUserLowId === user.id
              ? row.dmUserHighId
              : row.dmUserLowId
            : null;
        return {
          ...row,
          otherUserId,
          title:
            row.kind === 'community'
              ? row.communityName
              : row.kind === 'event'
                ? row.eventTitle
                : otherUserId
                  ? nameMap.get(otherUserId)
                  : null,
        };
      });
  }

  async createDirectMessage(user: AuthenticatedUser, recipientId: string) {
    this.assertProviderReady();
    if (recipientId === user.id) throw new ForbiddenException('You cannot message yourself.');
    const [lowId, highId] = directMessagePair(user.id, recipientId);
    const db = this.database();
    const [recipient] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, recipientId), eq(users.accountStatus, 'ACTIVE')))
      .limit(1);
    if (!recipient) throw new NotFoundException('Recipient not found.');
    const [block] = await db
      .select({ blocker: messagingUserBlocks.blockerUserId })
      .from(messagingUserBlocks)
      .where(
        or(
          and(
            eq(messagingUserBlocks.blockerUserId, user.id),
            eq(messagingUserBlocks.blockedUserId, recipientId),
          ),
          and(
            eq(messagingUserBlocks.blockerUserId, recipientId),
            eq(messagingUserBlocks.blockedUserId, user.id),
          ),
        ),
      )
      .limit(1);
    if (block) throw new ForbiddenException('Direct messaging is unavailable for this user pair.');
    const [idRow] = await db
      .insert(messagingConversations)
      .values({
        id: randomUUID(),
        kind: 'dm',
        dmUserLowId: lowId,
        dmUserHighId: highId,
        providerChannelId: providerChannelId(randomUUID()),
      })
      .onConflictDoNothing()
      .returning({ id: messagingConversations.id });
    const conversation = idRow
      ? (
          await db
            .select({
              id: messagingConversations.id,
              channelId: messagingConversations.providerChannelId,
            })
            .from(messagingConversations)
            .where(eq(messagingConversations.id, idRow.id))
            .limit(1)
        )[0]
      : (
          await db
            .select({
              id: messagingConversations.id,
              channelId: messagingConversations.providerChannelId,
            })
            .from(messagingConversations)
            .where(
              and(
                eq(messagingConversations.dmUserLowId, lowId),
                eq(messagingConversations.dmUserHighId, highId),
              ),
            )
            .limit(1)
        )[0];
    if (!conversation) throw new ServiceUnavailableException('Conversation could not be created.');
    const profilesForUsers = await db
      .select({ id: profiles.id, name: profiles.displayName })
      .from(profiles)
      .where(or(eq(profiles.id, user.id), eq(profiles.id, recipientId)));
    const currentProfile = profilesForUsers.find((profile) => profile.id === user.id);
    const recipientProfile = profilesForUsers.find((profile) => profile.id === recipientId);
    if (!currentProfile || !recipientProfile)
      throw new NotFoundException('User profile not found.');
    const currentProviderId = providerUserId(user.id);
    const recipientProviderId = providerUserId(recipientId);
    for (const participantId of [user.id, recipientId]) {
      await db
        .insert(messagingMemberSync)
        .values({
          conversationId: conversation.id,
          userId: participantId,
          desiredMember: true,
          providerMember: false,
          lastCheckedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [messagingMemberSync.conversationId, messagingMemberSync.userId],
          set: { desiredMember: true, lastCheckedAt: new Date() },
        });
    }
    try {
      for (const profile of [currentProfile, recipientProfile]) {
        const providerId = providerUserId(profile.id);
        await db
          .insert(messagingUserMappings)
          .values({ userId: profile.id, providerUserId: providerId })
          .onConflictDoNothing();
        await this.stream.upsertUser(providerId, profile.name);
      }
      await this.stream.ensureChannel(conversation.channelId);
      await this.stream.addMember(conversation.channelId, currentProviderId);
      await this.stream.addMember(conversation.channelId, recipientProviderId);
      const [lateBlock] = await db
        .select({ id: messagingUserBlocks.blockerUserId })
        .from(messagingUserBlocks)
        .where(
          or(
            and(
              eq(messagingUserBlocks.blockerUserId, user.id),
              eq(messagingUserBlocks.blockedUserId, recipientId),
            ),
            and(
              eq(messagingUserBlocks.blockerUserId, recipientId),
              eq(messagingUserBlocks.blockedUserId, user.id),
            ),
          ),
        )
        .limit(1);
      if (lateBlock) {
        await this.updateDmSyncDesired(conversation.id, [user.id, recipientId], false);
        await this.stream.removeMember(conversation.channelId, currentProviderId);
        await this.stream.removeMember(conversation.channelId, recipientProviderId);
        await this.updateDmSyncState(conversation.id, false, false, null);
        throw new ForbiddenException('Direct messaging is unavailable for this user pair.');
      }
      for (const participantId of [user.id, recipientId]) {
        await db
          .insert(messagingMemberSync)
          .values({
            conversationId: conversation.id,
            userId: participantId,
            providerMember: true,
            desiredMember: true,
            lastCheckedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [messagingMemberSync.conversationId, messagingMemberSync.userId],
            set: {
              providerMember: true,
              desiredMember: true,
              lastError: null,
              lastCheckedAt: new Date(),
            },
          });
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      await this.updateDmSyncError(conversation.id, error);
      throw new ServiceUnavailableException('Direct message channel synchronization is pending.');
    }
    return {
      conversationId: conversation.id,
      channelId: conversation.channelId,
      channelType: 'messaging',
    };
  }

  async setBlock(user: AuthenticatedUser, targetId: string, blocked: boolean) {
    if (targetId === user.id) throw new ForbiddenException('You cannot block yourself.');
    const [target] = await this.database()
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, targetId), eq(users.accountStatus, 'ACTIVE')))
      .limit(1);
    if (!target) throw new NotFoundException('User not found.');
    const [lowId, highId] = directMessagePair(user.id, targetId);
    const [conversation] = await this.database()
      .select({
        id: messagingConversations.id,
        channelId: messagingConversations.providerChannelId,
      })
      .from(messagingConversations)
      .where(
        and(
          eq(messagingConversations.kind, 'dm'),
          eq(messagingConversations.dmUserLowId, lowId),
          eq(messagingConversations.dmUserHighId, highId),
        ),
      )
      .limit(1);
    const [existingBlock] = await this.database()
      .select({ blocker: messagingUserBlocks.blockerUserId })
      .from(messagingUserBlocks)
      .where(
        and(
          eq(messagingUserBlocks.blockerUserId, user.id),
          eq(messagingUserBlocks.blockedUserId, targetId),
        ),
      )
      .limit(1);
    if (blocked) {
      await this.database()
        .insert(messagingUserBlocks)
        .values({ blockerUserId: user.id, blockedUserId: targetId })
        .onConflictDoNothing();
      if (!conversation) return { blocked: true, syncPending: false };
      await this.updateDmSyncDesired(conversation.id, [user.id, targetId], false);
      return {
        blocked: true,
        syncPending: await this.reconcileDirectConversation(conversation.id, [user.id, targetId]),
      };
    } else if (existingBlock) {
      await this.database()
        .delete(messagingUserBlocks)
        .where(
          and(
            eq(messagingUserBlocks.blockerUserId, user.id),
            eq(messagingUserBlocks.blockedUserId, targetId),
          ),
        );
      if (!conversation) return { blocked: false, syncPending: false };
      await this.updateDmSyncDesired(conversation.id, [user.id, targetId], true);
      return {
        blocked: false,
        syncPending: await this.reconcileDirectConversation(conversation.id, [user.id, targetId]),
      };
    }
    return { blocked: false, syncPending: false };
  }

  private async reconcileDirectConversation(
    conversationId: string,
    userIds: string[],
  ): Promise<boolean> {
    let syncPending = false;
    for (const userId of userIds) {
      const [conversation] = await this.database()
        .select({ channelId: messagingConversations.providerChannelId })
        .from(messagingConversations)
        .where(eq(messagingConversations.id, conversationId))
        .limit(1);
      const [sync] = await this.database()
        .select({
          providerMember: messagingMemberSync.providerMember,
          desiredMember: messagingMemberSync.desiredMember,
        })
        .from(messagingMemberSync)
        .where(
          and(
            eq(messagingMemberSync.conversationId, conversationId),
            eq(messagingMemberSync.userId, userId),
          ),
        )
        .limit(1);
      if (!conversation || !sync) continue;
      const [otherUserId] = userIds.filter((id) => id !== userId);
      const [blocked] = await this.database()
        .select({ blocker: messagingUserBlocks.blockerUserId })
        .from(messagingUserBlocks)
        .where(
          or(
            and(
              eq(messagingUserBlocks.blockerUserId, userId),
              eq(messagingUserBlocks.blockedUserId, otherUserId!),
            ),
            and(
              eq(messagingUserBlocks.blockedUserId, userId),
              eq(messagingUserBlocks.blockerUserId, otherUserId!),
            ),
          ),
        )
        .limit(1);
      const desired =
        sync.desiredMember &&
        !blocked &&
        (await this.isAccountActive(userId)) &&
        (await this.isAccountActive(otherUserId!));
      await this.database()
        .update(messagingMemberSync)
        .set({ desiredMember: desired, lastCheckedAt: new Date() })
        .where(
          and(
            eq(messagingMemberSync.conversationId, conversationId),
            eq(messagingMemberSync.userId, userId),
          ),
        );
      if (desired === sync.providerMember) continue;
      try {
        await this.syncMember(
          conversationId,
          conversation.channelId,
          userId,
          desired,
          sync.providerMember,
        );
      } catch (error) {
        if (!(error instanceof ServiceUnavailableException)) throw error;
        syncPending = true;
      }
    }
    return syncPending;
  }

  private async updateDmSyncDesired(
    conversationId: string,
    userIds: string[],
    desiredMember: boolean,
  ) {
    for (const userId of userIds) {
      await this.database()
        .insert(messagingMemberSync)
        .values({
          conversationId,
          userId,
          desiredMember,
          providerMember: false,
          lastCheckedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [messagingMemberSync.conversationId, messagingMemberSync.userId],
          set: { desiredMember, lastCheckedAt: new Date() },
        });
    }
  }

  private async updateDmSyncState(
    conversationId: string,
    desiredMember: boolean,
    providerMember: boolean,
    lastError: string | null,
  ) {
    await this.database()
      .update(messagingMemberSync)
      .set({ desiredMember, providerMember, lastError, lastCheckedAt: new Date() })
      .where(eq(messagingMemberSync.conversationId, conversationId));
  }

  private async updateDmSyncError(conversationId: string, error: unknown) {
    const detail =
      error instanceof Error ? error.message.slice(0, 2000) : 'Stream membership update failed.';
    await this.database()
      .update(messagingMemberSync)
      .set({ lastError: detail, lastCheckedAt: new Date() })
      .where(eq(messagingMemberSync.conversationId, conversationId));
  }

  async reportConversation(user: AuthenticatedUser, conversationId: string, reasonInput: string) {
    const reason = typeof reasonInput === 'string' ? reasonInput.trim() : '';
    if (!reason || reason.length > 2000)
      throw new BadRequestException('Enter a report reason (max 2000 characters).');
    const [conversation] = await this.database()
      .select({
        id: messagingConversations.id,
        kind: messagingConversations.kind,
        low: messagingConversations.dmUserLowId,
        high: messagingConversations.dmUserHighId,
      })
      .from(messagingConversations)
      .where(eq(messagingConversations.id, conversationId))
      .limit(1);
    if (
      !conversation ||
      conversation.kind !== 'dm' ||
      (conversation.low !== user.id && conversation.high !== user.id)
    )
      throw new NotFoundException('Conversation not found.');
    const reportedUserId = conversation.low === user.id ? conversation.high! : conversation.low!;
    const [report] = await this.database()
      .insert(messagingReports)
      .values({ reporterUserId: user.id, reportedUserId, conversationId, reason })
      .returning({ id: messagingReports.id });
    return { id: report!.id };
  }

  async blockedUsers(user: AuthenticatedUser) {
    return this.database()
      .select({
        userId: messagingUserBlocks.blockedUserId,
        displayName: profiles.displayName,
        createdAt: messagingUserBlocks.createdAt,
      })
      .from(messagingUserBlocks)
      .innerJoin(profiles, eq(profiles.id, messagingUserBlocks.blockedUserId))
      .where(eq(messagingUserBlocks.blockerUserId, user.id));
  }

  private async isManager(userId: string, kind: 'community' | 'event', resourceId: string) {
    try {
      if (kind === 'community') await this.communitiesService.assertCanManage(userId, resourceId);
      else await this.eventsService.assertCanManageById({ id: userId, authUserId: '' }, resourceId);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) return false;
      throw error;
    }
  }

  private async assertEligible(
    user: AuthenticatedUser,
    kind: 'community' | 'event',
    resourceId: string,
  ) {
    const db = this.database();
    if (!(await this.isAccountActive(user.id)))
      throw new ForbiddenException('This account cannot access chat.');
    const [resource] =
      kind === 'community'
        ? await db
            .select({ closed: communities.archived })
            .from(communities)
            .where(eq(communities.id, resourceId))
            .limit(1)
        : await db
            .select({ closed: events.cancelled })
            .from(events)
            .where(eq(events.id, resourceId))
            .limit(1);
    if (!resource || resource.closed)
      throw new ForbiddenException('This resource is closed to chat.');
    try {
      if (kind === 'community') await this.communitiesService.assertCanManage(user.id, resourceId);
      else await this.eventsService.assertCanManageById(user, resourceId);
      return;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) throw error;
    }
    const [participation] =
      kind === 'community'
        ? await db
            .select({ status: communityMemberships.status })
            .from(communityMemberships)
            .where(
              and(
                eq(communityMemberships.communityId, resourceId),
                eq(communityMemberships.userId, user.id),
              ),
            )
            .limit(1)
        : await db
            .select({ status: eventRegistrations.status })
            .from(eventRegistrations)
            .where(
              and(
                eq(eventRegistrations.eventId, resourceId),
                eq(eventRegistrations.userId, user.id),
              ),
            )
            .limit(1);
    if (!this.hasParticipationAccess(kind, participation?.status))
      throw new ForbiddenException(
        'This channel is restricted to admitted participants and organizers.',
      );
  }

  private hasParticipationAccess(kind: 'community' | 'event', status: string | undefined): boolean {
    return kind === 'community'
      ? status === 'ACTIVE'
      : status === 'ACCEPTED' || status === 'ATTENDED' || status === 'NO_SHOW';
  }

  private assertProviderReady(): void {
    if (this.config.get<string>('STREAM_PERMISSIONS_VERIFIED') !== 'true')
      throw new ServiceUnavailableException(
        'Messaging permissions must be verified before issuing tokens.',
      );
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database unavailable.');
    return this.db;
  }
}
