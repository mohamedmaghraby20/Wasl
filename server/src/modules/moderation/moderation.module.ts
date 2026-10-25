import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommunitiesModule } from '../communities/communities.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ModerationController, ModeratorAssignmentsController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [AuthModule, CommunitiesModule, EventsModule, NotificationsModule],
  controllers: [ModerationController, ModeratorAssignmentsController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
