import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, eq, inArray, or } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import {
  communities,
  communityCategories,
  communityMemberships,
  communityMembershipTransitions,
  discussionPosts,
  discussionThreads,
  eventCategories,
  eventRegistrations,
  eventRegistrationTransitions,
  events,
  messagingConversations,
  messagingMemberSync,
  notificationEmailDeliveries,
  notifications,
  resourceModerators,
} from '../../db/schema';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { ChannelDeletionService } from '../messaging/channel-deletion.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class CommunityDeletionService {
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly organizations: OrganizationsService,
    private readonly channelDeletion: ChannelDeletionService,
  ) {}

  async remove(user: AuthenticatedUser, id: string, confirmationName: string) {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    const channelIds = await this.db.transaction(async (tx) => {
      const [community] = await tx
        .select()
        .from(communities)
        .where(eq(communities.id, id))
        .for('update')
        .limit(1);
      if (!community) throw new NotFoundException('Community not found.');
      if (community.ownerType === 'user') {
        if (community.ownerId !== user.id) throw new NotFoundException('Community not found.');
      } else {
        await this.organizations.assertCanManageOrganization(user.id, community.ownerId);
      }
      if (confirmationName !== community.name)
        throw new BadRequestException('Type the exact community name to confirm deletion.');
      const ownedEvents = tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.communityId, id));
      // Lock the event rows before removing their dependent records and participation history.
      await tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.communityId, id))
        .for('update');
      const scope = or(
        eq(messagingConversations.communityId, id),
        inArray(messagingConversations.eventId, ownedEvents),
      );
      const conversations = await tx
        .select({ id: messagingConversations.id })
        .from(messagingConversations)
        .where(scope)
        .for('update');
      const conversationIds = conversations.map((row) => row.id);
      if (conversationIds.length) {
        await tx
          .delete(messagingMemberSync)
          .where(inArray(messagingMemberSync.conversationId, conversationIds));
        // Keep only a channel tombstone for durable provider cleanup and unchanged report references.
        await tx
          .update(messagingConversations)
          .set({ communityId: null, eventId: null, deletedAt: new Date() })
          .where(scope);
      }
      const threads = tx
        .select({ id: discussionThreads.id })
        .from(discussionThreads)
        .where(
          or(
            eq(discussionThreads.communityId, id),
            inArray(discussionThreads.eventId, ownedEvents),
          ),
        );
      await tx
        .delete(discussionPosts)
        .where(and(inArray(discussionPosts.threadId, threads), eq(discussionPosts.depth, 1)));
      await tx.delete(discussionPosts).where(inArray(discussionPosts.threadId, threads));
      await tx
        .delete(discussionThreads)
        .where(
          or(
            eq(discussionThreads.communityId, id),
            inArray(discussionThreads.eventId, ownedEvents),
          ),
        );
      await tx
        .delete(resourceModerators)
        .where(
          or(
            eq(resourceModerators.communityId, id),
            inArray(resourceModerators.eventId, ownedEvents),
          ),
        );
      const memberships = tx
        .select({ id: communityMemberships.id })
        .from(communityMemberships)
        .where(eq(communityMemberships.communityId, id));
      await tx
        .delete(communityMembershipTransitions)
        .where(inArray(communityMembershipTransitions.membershipId, memberships));
      await tx.delete(communityMemberships).where(eq(communityMemberships.communityId, id));
      const registrations = tx
        .select({ id: eventRegistrations.id })
        .from(eventRegistrations)
        .where(inArray(eventRegistrations.eventId, ownedEvents));
      await tx
        .delete(eventRegistrationTransitions)
        .where(inArray(eventRegistrationTransitions.registrationId, registrations));
      await tx.delete(eventRegistrations).where(inArray(eventRegistrations.eventId, ownedEvents));
      const noticeScope = or(
        and(eq(notifications.contextType, 'community'), eq(notifications.contextId, id)),
        and(eq(notifications.contextType, 'event'), inArray(notifications.contextId, ownedEvents)),
      );
      const notices = tx.select({ id: notifications.id }).from(notifications).where(noticeScope);
      await tx
        .delete(notificationEmailDeliveries)
        .where(inArray(notificationEmailDeliveries.notificationId, notices));
      await tx.delete(notifications).where(noticeScope);
      await tx.delete(eventCategories).where(inArray(eventCategories.eventId, ownedEvents));
      await tx.delete(events).where(eq(events.communityId, id));
      await tx.delete(communityCategories).where(eq(communityCategories.communityId, id));
      await tx.delete(communities).where(eq(communities.id, id));
      return conversationIds;
    });
    let chatCleanupPending = channelIds.length > 0;
    if (chatCleanupPending) {
      try {
        chatCleanupPending = await this.channelDeletion.process(channelIds);
      } catch {
        /* The transaction left durable channel tombstones for the worker to retry. */
      }
    }
    return { id, chatCleanupPending };
  }
}
