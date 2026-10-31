import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';
import { CommunityDeletionService } from './community-deletion.service';
import { StreamChatModule } from '../messaging/stream-chat.module';

@Module({
  imports: [AuthModule, OrganizationsModule, StreamChatModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService, CommunityDeletionService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
