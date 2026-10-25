import { Module } from '@nestjs/common';
import { CommunityDiscussionsController, DiscussionsController } from './discussions.controller';
import { DiscussionsService } from './discussions.service';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { CommunitiesModule } from '../communities/communities.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [AuthModule, EventsModule, CommunitiesModule, ModerationModule],
  controllers: [DiscussionsController, CommunityDiscussionsController],
  providers: [DiscussionsService],
})
export class DiscussionsModule {}
