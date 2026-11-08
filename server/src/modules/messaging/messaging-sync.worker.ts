import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { ChannelDeletionService } from './channel-deletion.service';

@Injectable()
export class MessagingSyncWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(MessagingSyncWorker.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly messaging: MessagingService,
    private readonly deletion: ChannelDeletionService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      void this.deletion.process().catch(() => {
        this.logger.error('Unable to process deleted chat channels.');
      });
      void this.messaging.reconcilePendingMemberships().catch(() => {
        this.logger.error('Unable to reconcile pending chat membership.');
      });
    }, 30_000);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
