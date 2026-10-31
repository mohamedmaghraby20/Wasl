import { Module } from '@nestjs/common';
import { StreamChatAdapter } from './stream-chat.adapter';
import { ChannelDeletionService } from './channel-deletion.service';

@Module({
  providers: [StreamChatAdapter, ChannelDeletionService],
  exports: [StreamChatAdapter, ChannelDeletionService],
})
export class StreamChatModule {}
