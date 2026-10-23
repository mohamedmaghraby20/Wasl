import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, asc, count, eq, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DATABASE, type Database } from '../../db/database.module';
import {
  discussionPosts,
  discussionThreads,
  communities,
  communityMemberships,
  eventRegistrations,
  events,
  profiles,
} from '../../db/schema';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { EventsService } from '../events/events.service';
import { CommunitiesService } from '../communities/communities.service';
import type {
  CreateCommunityTopicDto,
  CreateDiscussionPostDto,
  UpdateDiscussionPostDto,
} from './discussions.dto';

@Injectable()
export class DiscussionsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly eventsService: EventsService,
    private readonly communitiesService: CommunitiesService,
  ) {}

  async communityTopics(communityId: string, pageInput?: string) {
    const page = this.pageNumber(pageInput);
    const community = await this.publicCommunity(communityId);
    const rows = await this.database()
      .select({
        id: discussionThreads.id,
        title: discussionThreads.title,
        body: discussionThreads.body,
        authorId: discussionThreads.authorUserId,
        authorName: profiles.displayName,
        archivedAt: discussionThreads.archivedAt,
        createdAt: discussionThreads.createdAt,
      })
      .from(discussionThreads)
      .innerJoin(profiles, eq(profiles.id, discussionThreads.authorUserId))
      .where(eq(discussionThreads.communityId, community.id))
      .orderBy(asc(discussionThreads.createdAt), asc(discussionThreads.id))
      .limit(21)
      .offset((page - 1) * 20);
    return {
      items: rows.slice(0, 20).map(({ archivedAt, createdAt, ...topic }) => ({
        ...topic,
        title: topic.title!,
        body: topic.body!,
        authorId: topic.authorId!,
        archived: Boolean(archivedAt),
        createdAt: createdAt.toISOString(),
      })),
      page,
      pageSize: 20,
      hasMore: rows.length > 20,
    };
  }

  async communityTopic(communityId: string, topicId: string, pageInput?: string) {
    const page = this.pageNumber(pageInput);
    const community = await this.publicCommunity(communityId);
    const [topic] = await this.database()
      .select({
        id: discussionThreads.id,
        title: discussionThreads.title,
        body: discussionThreads.body,
        authorId: discussionThreads.authorUserId,
        authorName: profiles.displayName,
        archivedAt: discussionThreads.archivedAt,
        createdAt: discussionThreads.createdAt,
      })
      .from(discussionThreads)
      .innerJoin(profiles, eq(profiles.id, discussionThreads.authorUserId))
      .where(
        and(eq(discussionThreads.id, topicId), eq(discussionThreads.communityId, community.id)),
      )
      .limit(1);
    if (!topic) throw new NotFoundException('Topic not found.');
    return {
      id: topic.id,
      title: topic.title!,
      body: topic.body!,
      authorId: topic.authorId!,
      authorName: topic.authorName,
      archived: Boolean(topic.archivedAt),
      createdAt: topic.createdAt.toISOString(),
      posts: await this.postPage(topic.id, page, 20, Boolean(topic.archivedAt)),
    };
  }

  async createCommunityTopic(
    user: AuthenticatedUser,
    communityId: string,
    input: CreateCommunityTopicDto,
  ) {
    const title = typeof input?.title === 'string' ? input.title.trim() : '';
    const body = this.postBody(input?.body);
    if (!title || title.length > 160)
      throw new BadRequestException('Enter a topic title (max 160 characters).');
    const community = await this.publicCommunity(communityId);
    const manager = await this.isCommunityManager(user.id, community.id);
    return this.database().transaction(async (tx) => {
      await this.assertCommunityWriting(tx, community.id, user.id, manager);
      const [author] = await tx
        .select({ name: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);
      if (!author) throw new NotFoundException('Author profile not found.');
      const [topic] = await tx
        .insert(discussionThreads)
        .values({ communityId: community.id, authorUserId: user.id, title, body })
        .returning({ id: discussionThreads.id, createdAt: discussionThreads.createdAt });
      return {
        id: topic!.id,
        title,
        body,
        authorId: user.id,
        authorName: author.name,
        archived: false,
        createdAt: topic!.createdAt.toISOString(),
      };
    });
  }

  async createCommunityPost(
    user: AuthenticatedUser,
    communityId: string,
    topicId: string,
    input: CreateDiscussionPostDto,
  ) {
    const body = this.postBody(input?.body);
    this.validateParentId(input?.parentId);
    const community = await this.publicCommunity(communityId);
    const manager = await this.isCommunityManager(user.id, community.id);
    return this.database().transaction(async (tx) => {
      await this.assertCommunityWriting(tx, community.id, user.id, manager);
      const [topic] = await tx
        .select({ id: discussionThreads.id, archivedAt: discussionThreads.archivedAt })
        .from(discussionThreads)
        .where(
          and(eq(discussionThreads.id, topicId), eq(discussionThreads.communityId, community.id)),
        )
        .for('update');
      if (!topic) throw new NotFoundException('Topic not found.');
      if (topic.archivedAt) throw new ForbiddenException('This topic is closed.');
      if (input.parentId) {
        const [parent] = await tx
          .select({ depth: discussionPosts.depth, threadId: discussionPosts.threadId })
          .from(discussionPosts)
          .where(eq(discussionPosts.id, input.parentId))
          .limit(1);
        if (!parent || parent.depth !== 0 || parent.threadId !== topic.id)
          throw new BadRequestException('Reply target not found.');
      }
      const [author] = await tx
        .select({ name: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);
      if (!author) throw new NotFoundException('Author profile not found.');
      const [post] = await tx
        .insert(discussionPosts)
        .values({
          threadId: topic.id,
          authorUserId: user.id,
          body,
          ...(input.parentId ? { parentId: input.parentId, parentDepth: 0, depth: 1 } : {}),
        })
        .returning({ id: discussionPosts.id, createdAt: discussionPosts.createdAt });
      return {
        id: post!.id,
        parentId: input.parentId ?? null,
        authorId: user.id,
        authorName: author.name,
        body,
        createdAt: post!.createdAt.toISOString(),
        updatedAt: post!.createdAt.toISOString(),
      };
    });
  }

  async closeCommunityTopic(user: AuthenticatedUser, communityId: string, topicId: string) {
    const community = await this.publicCommunity(communityId);
    await this.communitiesService.assertCanManage(user.id, community.id);
    const [topic] = await this.database()
      .update(discussionThreads)
      .set({ archivedAt: new Date(), archivedByUserId: user.id })
      .where(
        and(eq(discussionThreads.id, topicId), eq(discussionThreads.communityId, community.id)),
      )
      .returning({ id: discussionThreads.id });
    if (!topic) throw new NotFoundException('Topic not found.');
    return this.communityTopic(community.id, topic.id);
  }

  async closeEventDiscussion(user: AuthenticatedUser, eventId: string) {
    const [event] = await this.database()
      .select({ id: events.id })
      .from(events)
      .where(or(eq(events.id, eventId), eq(events.slug, eventId)))
      .limit(1);
    if (!event) throw new NotFoundException('Event not found.');
    await this.eventsService.assertCanManageById(user, event.id);
    await this.database().transaction(async (tx) => {
      await tx.select({ id: events.id }).from(events).where(eq(events.id, event.id)).for('update');
      const [existing] = await tx
        .select({ id: discussionThreads.id })
        .from(discussionThreads)
        .where(eq(discussionThreads.eventId, event.id))
        .limit(1);
      if (!existing) {
        await tx
          .insert(discussionThreads)
          .values({ id: randomUUID(), eventId: event.id })
          .onConflictDoNothing();
      }
      const [thread] = await tx
        .select({ id: discussionThreads.id })
        .from(discussionThreads)
        .where(eq(discussionThreads.eventId, event.id))
        .limit(1);
      if (!thread) throw new ServiceUnavailableException('Discussion could not be closed.');
      await tx
        .update(discussionThreads)
        .set({ archivedAt: new Date(), archivedByUserId: user.id })
        .where(eq(discussionThreads.id, thread.id));
    });
    return { closed: true };
  }

  async moderatePost(
    user: AuthenticatedUser,
    kind: 'event' | 'community',
    resourceId: string,
    postId: string,
    input?: UpdateDiscussionPostDto,
    topicId?: string,
  ) {
    const body = input ? this.postBody(input.body) : null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId))
      throw new BadRequestException('Invalid post identifier.');

    const db = this.database();
    const resource =
      kind === 'event'
        ? await db
            .select({ id: events.id })
            .from(events)
            .where(or(eq(events.id, resourceId), eq(events.slug, resourceId)))
            .limit(1)
        : [await this.publicCommunity(resourceId)];
    const [parent] = resource;
    if (!parent) throw new NotFoundException('Resource not found.');
    let manager = false;
    try {
      if (kind === 'event') await this.eventsService.assertCanManageById(user, parent.id);
      else await this.communitiesService.assertCanManage(user.id, parent.id);
      manager = true;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) throw error;
    }

    return db.transaction(async (tx) => {
      const [resourceState] =
        kind === 'event'
          ? await tx
              .select({ closed: events.cancelled })
              .from(events)
              .where(eq(events.id, parent.id))
              .for('update')
          : await tx
              .select({ closed: communities.archived })
              .from(communities)
              .where(eq(communities.id, parent.id))
              .for('update');
      const [post] = await tx
        .select({
          id: discussionPosts.id,
          authorId: discussionPosts.authorUserId,
          body: discussionPosts.body,
          deletedAt: discussionPosts.deletedAt,
          parentId: discussionPosts.parentId,
          archivedAt: discussionThreads.archivedAt,
        })
        .from(discussionPosts)
        .innerJoin(discussionThreads, eq(discussionThreads.id, discussionPosts.threadId))
        .where(
          and(
            eq(discussionPosts.id, postId),
            kind === 'event'
              ? eq(discussionThreads.eventId, parent.id)
              : and(
                  eq(discussionThreads.communityId, parent.id),
                  eq(discussionThreads.id, topicId!),
                ),
          ),
        )
        .for('update');
      if (!post) throw new NotFoundException('Post not found.');
      if (!manager && post.authorId !== user.id)
        throw new ForbiddenException('You cannot manage this post.');
      if (post.deletedAt) throw new BadRequestException('This post was already removed.');

      if (!manager) {
        if (resourceState?.closed || post.archivedAt)
          throw new ForbiddenException('This discussion is closed.');
        if (kind === 'event') {
          const [registration] = await tx
            .select({ status: eventRegistrations.status })
            .from(eventRegistrations)
            .where(
              and(
                eq(eventRegistrations.eventId, parent.id),
                eq(eventRegistrations.userId, user.id),
              ),
            )
            .for('update');
          if (registration?.status !== 'ACCEPTED')
            throw new ForbiddenException('Only accepted attendees may edit comments.');
        } else {
          const [membership] = await tx
            .select({ status: communityMemberships.status })
            .from(communityMemberships)
            .where(
              and(
                eq(communityMemberships.communityId, parent.id),
                eq(communityMemberships.userId, user.id),
              ),
            )
            .for('update');
          if (membership?.status !== 'ACTIVE')
            throw new ForbiddenException('Only active members may edit comments.');
        }
      }

      const [updated] = await tx
        .update(discussionPosts)
        .set(
          body !== null
            ? { body, updatedAt: new Date() }
            : { deletedAt: new Date(), deletedByUserId: user.id, updatedAt: new Date() },
        )
        .where(eq(discussionPosts.id, post.id))
        .returning({
          id: discussionPosts.id,
          createdAt: discussionPosts.createdAt,
          updatedAt: discussionPosts.updatedAt,
        });
      const [author] = await tx
        .select({ name: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, post.authorId))
        .limit(1);
      return {
        id: updated!.id,
        parentId: post.parentId,
        authorId: post.authorId,
        authorName: author?.name ?? '',
        body,
        createdAt: updated!.createdAt.toISOString(),
        updatedAt: updated!.updatedAt.toISOString(),
      };
    });
  }

  async createEventPost(user: AuthenticatedUser, eventId: string, input: CreateDiscussionPostDto) {
    const body = typeof input?.body === 'string' ? input.body.trim() : '';
    if (!body || body.length > 5000)
      throw new BadRequestException('Enter a comment (max 5000 characters).');
    if (
      input.parentId !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.parentId,
      )
    ) {
      throw new BadRequestException('Invalid reply target.');
    }

    const db = this.database();
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(or(eq(events.id, eventId), eq(events.slug, eventId)))
      .limit(1);
    if (!event) throw new NotFoundException('Event not found.');

    let manager = false;
    try {
      await this.eventsService.assertCanManageById(user, event.id);
      manager = true;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) throw error;
    }

    return db.transaction(async (tx) => {
      const [currentEvent] = await tx
        .select({ cancelled: events.cancelled })
        .from(events)
        .where(eq(events.id, event.id))
        .for('update');
      if (!manager) {
        if (currentEvent?.cancelled)
          throw new ForbiddenException('This event is closed to comments.');
        const [registration] = await tx
          .select({ status: eventRegistrations.status })
          .from(eventRegistrations)
          .where(
            and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, user.id)),
          )
          .for('update');
        if (registration?.status !== 'ACCEPTED')
          throw new ForbiddenException('Only accepted attendees may comment.');
      }

      const [existingThread] = await tx
        .select({ id: discussionThreads.id, archivedAt: discussionThreads.archivedAt })
        .from(discussionThreads)
        .where(eq(discussionThreads.eventId, event.id))
        .limit(1);
      if (existingThread?.archivedAt) throw new ForbiddenException('This discussion is closed.');
      const threadId = existingThread?.id ?? randomUUID();
      if (!existingThread)
        await tx
          .insert(discussionThreads)
          .values({ id: threadId, eventId: event.id })
          .onConflictDoNothing();
      const [thread] = await tx
        .select({ id: discussionThreads.id })
        .from(discussionThreads)
        .where(eq(discussionThreads.eventId, event.id))
        .limit(1);
      if (!thread) throw new ServiceUnavailableException('Discussion could not be created.');

      if (input.parentId) {
        const [parent] = await tx
          .select({
            id: discussionPosts.id,
            depth: discussionPosts.depth,
            threadId: discussionPosts.threadId,
          })
          .from(discussionPosts)
          .where(eq(discussionPosts.id, input.parentId))
          .limit(1);
        if (!parent || parent.depth !== 0 || parent.threadId !== thread.id)
          throw new BadRequestException('Reply target not found.');
      }

      const [author] = await tx
        .select({ displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);
      if (!author) throw new NotFoundException('Author profile not found.');

      const [post] = await tx
        .insert(discussionPosts)
        .values({
          threadId: thread.id,
          authorUserId: user.id,
          body,
          ...(input.parentId ? { parentId: input.parentId, parentDepth: 0, depth: 1 } : {}),
        })
        .returning({ id: discussionPosts.id, createdAt: discussionPosts.createdAt });
      return {
        id: post!.id,
        parentId: input.parentId ?? null,
        authorId: user.id,
        authorName: author.displayName,
        body,
        createdAt: post!.createdAt.toISOString(),
        updatedAt: post!.createdAt.toISOString(),
      };
    });
  }

  async eventPosts(eventId: string, pageInput?: string, pageSizeInput?: string) {
    const page = this.pageNumber(pageInput);
    const pageSize = this.pageSizeNumber(pageSizeInput);
    const db = this.database();
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(or(eq(events.id, eventId), eq(events.slug, eventId)))
      .limit(1);
    if (!event) throw new NotFoundException('Event not found.');

    const [thread] = await db
      .select({ id: discussionThreads.id, archivedAt: discussionThreads.archivedAt })
      .from(discussionThreads)
      .where(eq(discussionThreads.eventId, event.id))
      .limit(1);
    return this.postPage(thread?.id, page, pageSize, Boolean(thread?.archivedAt));
  }

  private async publicCommunity(value: string) {
    const [community] = await this.database()
      .select({ id: communities.id })
      .from(communities)
      .where(
        and(
          or(eq(communities.id, value), eq(communities.slug, value)),
          eq(communities.archived, false),
        ),
      )
      .limit(1);
    if (!community) throw new NotFoundException('Community not found.');
    return community;
  }

  private async isCommunityManager(userId: string, communityId: string) {
    try {
      await this.communitiesService.assertCanManage(userId, communityId);
      return true;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) throw error;
      return false;
    }
  }

  private async assertCommunityWriting(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    communityId: string,
    userId: string,
    manager: boolean,
  ) {
    const [community] = await tx
      .select({ archived: communities.archived })
      .from(communities)
      .where(eq(communities.id, communityId))
      .for('update');
    if (!community || (community.archived && !manager))
      throw new ForbiddenException('This community is closed.');
    if (manager) return;
    const [membership] = await tx
      .select({ status: communityMemberships.status })
      .from(communityMemberships)
      .where(
        and(
          eq(communityMemberships.communityId, communityId),
          eq(communityMemberships.userId, userId),
        ),
      )
      .for('update');
    if (membership?.status !== 'ACTIVE')
      throw new ForbiddenException('Only active members may participate in discussions.');
  }

  private postBody(value: unknown): string {
    const body = typeof value === 'string' ? value.trim() : '';
    if (!body || body.length > 5000)
      throw new BadRequestException('Enter a comment (max 5000 characters).');
    return body;
  }

  private validateParentId(value: unknown): void {
    if (
      value !== undefined &&
      (typeof value !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
    ) {
      throw new BadRequestException('Invalid reply target.');
    }
  }

  private pageNumber(value?: string): number {
    const page = Number(value ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || (page - 1) * 100 > Number.MAX_SAFE_INTEGER)
      throw new BadRequestException('Invalid pagination.');
    return page;
  }

  private pageSizeNumber(value?: string): number {
    const pageSize = Number(value ?? 20);
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100)
      throw new BadRequestException('Invalid pagination.');
    return pageSize;
  }

  private async postPage(
    threadId: string | undefined,
    page: number,
    pageSize: number,
    closed = false,
  ) {
    if (!threadId) return { items: [], page, pageSize, hasMore: false, total: 0, closed: false };
    const db = this.database();

    const [result] = await db
      .select({ total: count() })
      .from(discussionPosts)
      .where(eq(discussionPosts.threadId, threadId));

    const rows = await db
      .select({
        id: discussionPosts.id,
        parentId: discussionPosts.parentId,
        authorId: discussionPosts.authorUserId,
        authorName: profiles.displayName,
        body: discussionPosts.body,
        deletedAt: discussionPosts.deletedAt,
        createdAt: discussionPosts.createdAt,
        updatedAt: discussionPosts.updatedAt,
      })
      .from(discussionPosts)
      .innerJoin(profiles, eq(profiles.id, discussionPosts.authorUserId))
      .where(eq(discussionPosts.threadId, threadId))
      .orderBy(asc(discussionPosts.createdAt), asc(discussionPosts.depth), asc(discussionPosts.id))
      .limit(pageSize + 1)
      .offset((page - 1) * pageSize);

    return {
      items: rows.slice(0, pageSize).map(({ deletedAt, body, ...post }) => ({
        ...post,
        body: deletedAt ? null : body,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
      page,
      pageSize,
      hasMore: rows.length > pageSize,
      total: result?.total ?? 0,
      closed,
    };
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database unavailable.');
    return this.db;
  }
}
