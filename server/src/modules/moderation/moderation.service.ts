import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import {
  communities,
  communityMemberships,
  discussionPosts,
  eventRegistrations,
  events,
  moderationReports,
  organizations,
  resourceModerators,
  users,
} from '../../db/schema';
import { CommunitiesService } from '../communities/communities.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateReportDto, DecideReportDto } from './moderation.dto';

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly communitiesService: CommunitiesService,
    private readonly eventsService: EventsService,
    private readonly notifications: NotificationsService,
  ) {}

  async isModerator(
    userId: string,
    kind: 'community' | 'event',
    resourceId: string,
  ): Promise<boolean> {
    const db = this.database();
    const [assignment] =
      kind === 'community'
        ? await db
            .select({ id: resourceModerators.id })
            .from(resourceModerators)
            .innerJoin(
              communityMemberships,
              and(
                eq(communityMemberships.communityId, resourceModerators.communityId),
                eq(communityMemberships.userId, resourceModerators.userId),
              ),
            )
            .innerJoin(users, eq(users.id, resourceModerators.userId))
            .where(
              and(
                eq(resourceModerators.userId, userId),
                eq(resourceModerators.communityId, resourceId),
                eq(communityMemberships.status, 'ACTIVE'),
                eq(users.accountStatus, 'ACTIVE'),
              ),
            )
            .limit(1)
        : await db
            .select({ id: resourceModerators.id })
            .from(resourceModerators)
            .innerJoin(
              eventRegistrations,
              and(
                eq(eventRegistrations.eventId, resourceModerators.eventId),
                eq(eventRegistrations.userId, resourceModerators.userId),
              ),
            )
            .innerJoin(users, eq(users.id, resourceModerators.userId))
            .where(
              and(
                eq(resourceModerators.userId, userId),
                eq(resourceModerators.eventId, resourceId),
                eq(eventRegistrations.status, 'ACCEPTED'),
                eq(users.accountStatus, 'ACTIVE'),
              ),
            )
            .limit(1);
    return Boolean(assignment);
  }

  async assertManager(
    userId: string,
    kind: 'community' | 'event',
    resourceId: string,
  ): Promise<void> {
    if (kind === 'community') await this.communitiesService.assertCanManage(userId, resourceId);
    else await this.eventsService.assertCanManageById({ id: userId, authUserId: '' }, resourceId);
  }

  async permissions(userId: string, kind: 'community' | 'event', resourceId: string) {
    let manager = false;
    try {
      await this.assertManager(userId, kind, resourceId);
      manager = true;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) throw error;
    }
    return { manager, moderator: await this.isModerator(userId, kind, resourceId) };
  }

  async listModerators(userId: string, kind: 'community' | 'event', resourceId: string) {
    await this.assertManager(userId, kind, resourceId);
    return this.database()
      .select({ userId: resourceModerators.userId })
      .from(resourceModerators)
      .where(
        kind === 'community'
          ? eq(resourceModerators.communityId, resourceId)
          : eq(resourceModerators.eventId, resourceId),
      );
  }

  async assignModerator(
    actorUserId: string,
    kind: 'community' | 'event',
    resourceId: string,
    userId: string,
  ) {
    await this.assertManager(actorUserId, kind, resourceId);
    if (actorUserId === userId)
      throw new BadRequestException('Managers already have moderation permissions.');
    const db = this.database();
    const [eligible] =
      kind === 'community'
        ? await db
            .select({ id: users.id })
            .from(communityMemberships)
            .innerJoin(users, eq(users.id, communityMemberships.userId))
            .where(
              and(
                eq(communityMemberships.communityId, resourceId),
                eq(communityMemberships.userId, userId),
                eq(communityMemberships.status, 'ACTIVE'),
                eq(users.accountStatus, 'ACTIVE'),
              ),
            )
            .limit(1)
        : await db
            .select({ id: users.id })
            .from(eventRegistrations)
            .innerJoin(users, eq(users.id, eventRegistrations.userId))
            .where(
              and(
                eq(eventRegistrations.eventId, resourceId),
                eq(eventRegistrations.userId, userId),
                eq(eventRegistrations.status, 'ACCEPTED'),
                eq(users.accountStatus, 'ACTIVE'),
              ),
            )
            .limit(1);
    if (!eligible) throw new BadRequestException('Choose an active member or accepted attendee.');
    await db
      .insert(resourceModerators)
      .values({
        communityId: kind === 'community' ? resourceId : null,
        eventId: kind === 'event' ? resourceId : null,
        userId,
        assignedByUserId: actorUserId,
      })
      .onConflictDoNothing();
    return { userId };
  }

  async removeModerator(
    actorUserId: string,
    kind: 'community' | 'event',
    resourceId: string,
    userId: string,
  ) {
    await this.assertManager(actorUserId, kind, resourceId);
    await this.database()
      .delete(resourceModerators)
      .where(
        and(
          eq(resourceModerators.userId, userId),
          kind === 'community'
            ? eq(resourceModerators.communityId, resourceId)
            : eq(resourceModerators.eventId, resourceId),
        ),
      );
    return { userId };
  }

  async report(reporterUserId: string, input: CreateReportDto) {
    const reason = input.reason.trim();
    if (!reason) throw new BadRequestException('Enter a report reason.');
    if (input.targetType === 'user' && reporterUserId === input.targetId)
      throw new BadRequestException('You cannot report yourself.');

    const database = this.database();
    const targets = {
      user: users,
      community: communities,
      event: events,
      organization: organizations,
      post: discussionPosts,
    };
    const table = targets[input.targetType];
    if (!table) throw new BadRequestException('Unsupported report target.');
    const [target] = await database
      .select({ id: table.id })
      .from(table)
      .where(eq(table.id, input.targetId))
      .limit(1);
    if (!target) throw new NotFoundException('Report target not found.');
    const [created] = await database
      .insert(moderationReports)
      .values({ reporterUserId, targetType: input.targetType, targetId: input.targetId, reason })
      .returning({ id: moderationReports.id });
    return { id: created!.id };
  }

  async listReports() {
    return this.database()
      .select()
      .from(moderationReports)
      .where(eq(moderationReports.status, 'OPEN'))
      .orderBy(desc(moderationReports.createdAt))
      .limit(100);
  }

  async decideReport(actorUserId: string, reportId: string, input: DecideReportDto) {
    const db = this.database();
    return db.transaction(async (tx) => {
      const [report] = await tx
        .select()
        .from(moderationReports)
        .where(eq(moderationReports.id, reportId))
        .for('update')
        .limit(1);
      if (!report) throw new NotFoundException('Report not found.');
      if (report.status !== 'OPEN')
        throw new BadRequestException('This report has already been reviewed.');
      const kind =
        input.action === 'DISMISSED'
          ? null
          : input.action.endsWith('_USER')
            ? 'user'
            : input.action === 'ARCHIVE_COMMUNITY'
              ? 'community'
              : 'event';
      if (kind && report.targetType !== kind)
        throw new BadRequestException('Action does not match the reported target.');
      if (input.action === 'SUSPEND_USER' || input.action === 'RESTORE_USER') {
        if (report.targetId === actorUserId)
          throw new ForbiddenException('You cannot change your own account.');
        const [target] = await tx
          .select({ status: users.accountStatus })
          .from(users)
          .where(eq(users.id, report.targetId))
          .for('update')
          .limit(1);
        if (!target) throw new NotFoundException('Reported user not found.');
        if (!['ACTIVE', 'SUSPENDED'].includes(target.status))
          throw new BadRequestException('Account cannot be changed in its current state.');
        await tx
          .update(users)
          .set({
            accountStatus: input.action === 'SUSPEND_USER' ? 'SUSPENDED' : 'ACTIVE',
            updatedAt: new Date(),
          })
          .where(eq(users.id, report.targetId));
      } else if (input.action === 'ARCHIVE_COMMUNITY') {
        const [changed] = await tx
          .update(communities)
          .set({ archived: true })
          .where(eq(communities.id, report.targetId))
          .returning({ id: communities.id });
        if (!changed) throw new NotFoundException('Reported community not found.');
      } else if (input.action === 'CANCEL_EVENT') {
        const [changed] = await tx
          .update(events)
          .set({ cancelled: true })
          .where(and(eq(events.id, report.targetId), eq(events.cancelled, false)))
          .returning({ id: events.id });
        if (!changed) throw new BadRequestException('Event is already cancelled or unavailable.');
        const recipients = await tx
          .select({ userId: eventRegistrations.userId })
          .from(eventRegistrations)
          .where(
            and(
              eq(eventRegistrations.eventId, report.targetId),
              inArray(eventRegistrations.status, ['ACCEPTED', 'PENDING', 'WAITLISTED']),
            ),
          );
        for (const recipient of recipients) {
          await this.notifications.create(
            tx,
            {
              recipientUserId: recipient.userId,
              eventKey: `event-cancelled:${report.targetId}`,
              type: 'event_cancelled',
              contextType: 'event',
              contextId: report.targetId,
            },
            true,
          );
        }
      }
      const [updated] = await tx
        .update(moderationReports)
        .set({
          status: input.action === 'DISMISSED' ? 'DISMISSED' : 'ACTIONED',
          decidedByUserId: actorUserId,
          decidedAt: new Date(),
          decisionNote: input.note?.trim() || input.action,
        })
        .where(eq(moderationReports.id, reportId))
        .returning();
      return updated!;
    });
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }
}
