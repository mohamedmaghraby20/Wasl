import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import { communities, events, notificationEmailDeliveries, notifications, organizations, users } from '../../db/schema';
import { ResendEmailAdapter } from './resend-email.adapter';

@Injectable()
export class NotificationEmailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationEmailWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly config: ConfigService,
    private readonly provider: ResendEmailAdapter,
  ) {}

  onModuleInit(): void {
    if (
      !this.db ||
      !this.config.get<string>('RESEND_API_KEY') ||
      !this.config.get<string>('RESEND_FROM_EMAIL')
    )
      return;
    this.timer = setInterval(() => {
      void this.processPending().catch(() =>
        this.logger.error('Notification email worker failed; messages will be retried.'),
      );
    }, 30_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processPending(): Promise<void> {
    if (!this.db || this.running) return;
    this.running = true;
    try {
      const batch = await this.db.execute(
        sql`select msg_id, message from pgmq.read('notification_emails', 60, 10)`,
      );
      for (const message of batch.rows) {
        const id = (message.message as { notification_id?: unknown }).notification_id;
        const messageId = String(message.msg_id);
        if (typeof id !== 'string') {
          await this.db.execute(
            sql`select pgmq.archive('notification_emails', ${messageId}::bigint)`,
          );
          continue;
        }
        try {
          await this.sendOne(messageId, id);
        } catch {
          this.logger.error(
            'Notification email could not be processed; queue visibility will retry.',
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async sendOne(messageId: string, notificationId: string): Promise<void> {
    await this.db!.transaction(async (tx) => {
      const [delivery] = await tx
        .select({
          status: notificationEmailDeliveries.status,
          attemptCount: notificationEmailDeliveries.attemptCount,
          nextAttemptAt: notificationEmailDeliveries.nextAttemptAt,
          recipient: users.normalizedEmail,
          accountStatus: users.accountStatus,
          communitySlug: communities.slug,
          eventSlug: events.slug,
          organizationSlug: organizations.slug,
        })
        .from(notificationEmailDeliveries)
        .innerJoin(notifications, eq(notifications.id, notificationEmailDeliveries.notificationId))
        .innerJoin(users, eq(users.id, notifications.recipientUserId))
        .leftJoin(communities, sql`${notifications.contextType} = 'community' and ${notifications.contextId} = ${communities.id}`)
        .leftJoin(events, sql`${notifications.contextType} = 'event' and ${notifications.contextId} = ${events.id}`)
        .leftJoin(organizations, sql`${notifications.contextType} = 'organization' and ${notifications.contextId} = ${organizations.id}::text`)
        .where(eq(notificationEmailDeliveries.notificationId, notificationId))
        .for('update', { of: notificationEmailDeliveries })
        .limit(1);

      if (!delivery || delivery.status === 'SENT' || delivery.status === 'FAILED') {
        await tx.execute(sql`select pgmq.archive('notification_emails', ${messageId}::bigint)`);
        return;
      }
      if (delivery.accountStatus !== 'ACTIVE') {
        await tx
          .update(notificationEmailDeliveries)
          .set({ status: 'FAILED', lastError: 'Recipient account is not active.' })
          .where(eq(notificationEmailDeliveries.notificationId, notificationId));
        await tx.execute(sql`select pgmq.archive('notification_emails', ${messageId}::bigint)`);
        return;
      }
      if (delivery.nextAttemptAt > new Date()) {
        const seconds = Math.max(
          1,
          Math.ceil((delivery.nextAttemptAt.getTime() - Date.now()) / 1000),
        );
        await tx.execute(
          sql`select pgmq.set_vt('notification_emails', ${messageId}::bigint, ${seconds}::integer)`,
        );
        return;
      }

      const now = new Date();
      try {
        const origin = this.config.get<string>('CLIENT_ORIGIN') ?? 'http://localhost:5173';
        const path = delivery.communitySlug
          ? `/communities/${delivery.communitySlug}`
          : delivery.eventSlug
            ? `/events/${delivery.eventSlug}`
            : delivery.organizationSlug
              ? `/organizations/${delivery.organizationSlug}`
              : '/notifications';
        const providerMessageId = await this.provider.send({
          id: notificationId,
          to: delivery.recipient,
          subject: 'An update from Wasl',
          text: `You have an update about your Wasl activity. View it at ${new URL(path, origin).toString()}`,
        });
        await tx
          .update(notificationEmailDeliveries)
          .set({
            status: 'SENT',
            attemptCount: delivery.attemptCount + 1,
            lastAttemptAt: now,
            sentAt: now,
            providerMessageId,
            lastError: null,
          })
          .where(eq(notificationEmailDeliveries.notificationId, notificationId));
        await tx.execute(sql`select pgmq.archive('notification_emails', ${messageId}::bigint)`);
      } catch {
        const attemptCount = delivery.attemptCount + 1;
        const seconds = Math.min(3600, 30 * 2 ** Math.min(attemptCount, 7));
        await tx
          .update(notificationEmailDeliveries)
          .set({
            status: 'RETRY',
            attemptCount,
            lastAttemptAt: now,
            nextAttemptAt: new Date(now.getTime() + seconds * 1000),
            lastError: 'Email delivery failed; retry scheduled.',
          })
          .where(eq(notificationEmailDeliveries.notificationId, notificationId));
        await tx.execute(
          sql`select pgmq.set_vt('notification_emails', ${messageId}::bigint, ${seconds}::integer)`,
        );
      }
    });
  }
}
