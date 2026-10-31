import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommunitiesModule } from '../communities/communities.module';
import { EventsModule } from '../events/events.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingSyncWorker } from './messaging-sync.worker';
import { StreamChatModule } from './stream-chat.module';

@Module({
  imports: [AuthModule, CommunitiesModule, EventsModule, StreamChatModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingSyncWorker],
  exports: [MessagingService, StreamChatModule],
})
export class MessagingModule {}
