import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ResendEmailAdapter } from './resend-email.adapter';
import { NotificationEmailWorker } from './notification-email.worker';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, ResendEmailAdapter, NotificationEmailWorker],
  exports: [NotificationsService],
})
export class NotificationsModule {}
