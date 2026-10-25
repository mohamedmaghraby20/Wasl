import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import {
  communities,
  events,
  notificationEmailDeliveries,
  notifications,
  organizations,
} from '../../db/schema';

export type NotificationTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export type NotificationEvent = {
  recipientUserId: string;
  eventKey: string;
  type: string;
  contextType: 'community' | 'event' | 'organization';
  contextId: string;
};

@Injectable()
export class NotificationsService {
  constructor(@Inject(DATABASE) private readonly db: Database | undefined) {}

  async create(tx: NotificationTransaction, event: NotificationEvent, email = false) {
    const [created] = await tx
      .insert(notifications)
      .values(event)
      .onConflictDoNothing()
      .returning({ id: notifications.id });
    if (created && email) {
      await tx.insert(notificationEmailDeliveries).values({ notificationId: created.id });
      await tx.execute(
        sql`select pgmq.send('notification_emails', jsonb_build_object('notification_id', ${created.id}::uuid))`,
      );
    }
    return created?.id ?? null;
  }

  async list(recipientUserId: string) {
    const rows = await this.database()
      .select({
        id: notifications.id,
        type: notifications.type,
        contextType: notifications.contextType,
        contextId: notifications.contextId,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        communitySlug: communities.slug,
        eventSlug: events.slug,
        organizationSlug: organizations.slug,
      })
      .from(notifications)
      .leftJoin(
        communities,
        and(
          eq(notifications.contextType, 'community'),
          eq(notifications.contextId, communities.id),
        ),
      )
      .leftJoin(
        events,
        and(eq(notifications.contextType, 'event'), eq(notifications.contextId, events.id)),
      )
      .leftJoin(
        organizations,
        and(
          eq(notifications.contextType, 'organization'),
          eq(notifications.contextId, sql`${organizations.id}::text`),
        ),
      )
      .where(eq(notifications.recipientUserId, recipientUserId))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(50);
    return rows.map(({ communitySlug, eventSlug, organizationSlug, ...notification }) => ({
      ...notification,
      href: communitySlug
        ? `/communities/${communitySlug}`
        : eventSlug
          ? `/events/${eventSlug}`
          : organizationSlug
            ? `/organizations/${organizationSlug}`
            : null,
    }));
  }

  async markRead(recipientUserId: string, id: string) {
    const [updated] = await this.database()
      .update(notifications)
      .set({ readAt: sql`coalesce(${notifications.readAt}, now())` })
      .where(and(eq(notifications.id, id), eq(notifications.recipientUserId, recipientUserId)))
      .returning({ id: notifications.id, readAt: notifications.readAt });
    return updated ?? null;
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }
}
