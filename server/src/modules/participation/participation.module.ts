import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommunitiesModule } from '../communities/communities.module';
import { EventsModule } from '../events/events.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ParticipationController } from './participation.controller';
import { ParticipationService } from './participation.service';

@Module({
  imports: [AuthModule, CommunitiesModule, EventsModule, MessagingModule, NotificationsModule],
  controllers: [ParticipationController],
  providers: [ParticipationService],
  exports: [ParticipationService],
})
export class ParticipationModule {}
