import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommunitiesModule } from '../communities/communities.module';
import { EventsModule } from '../events/events.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { StreamChatAdapter } from './stream-chat.adapter';
import { MessagingSyncWorker } from './messaging-sync.worker';

@Module({
  imports: [AuthModule, CommunitiesModule, EventsModule],
  controllers: [MessagingController],
  providers: [MessagingService, StreamChatAdapter, MessagingSyncWorker],
  exports: [MessagingService, StreamChatAdapter],
})
export class MessagingModule {}
