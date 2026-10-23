import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class MessagingSessionDto {
  @ApiProperty() apiKey!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() token!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class MessagingChannelDto {
  @ApiProperty() conversationId!: string;
  @ApiProperty() channelId!: string;
  @ApiProperty() channelType!: string;
}

export class CreateDirectMessageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  recipientUserId!: string;
}

export class ReportConversationDto {
  @ApiProperty() @IsString() @MaxLength(2000) reason!: string;
}

export class BlockUserDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}

export class MessagingConversationItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['community', 'event', 'dm'] }) kind!: 'community' | 'event' | 'dm';
  @ApiProperty() channelId!: string;
  @ApiProperty({ type: String, nullable: true }) communityId!: string | null;
  @ApiProperty({ type: String, nullable: true }) eventId!: string | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) otherUserId!: string | null;
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
}

export class MessagingBlockedUserDto {
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class MessagingReportResultDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
}

export class MessagingBlockResultDto {
  @ApiProperty() blocked!: boolean;
  @ApiProperty() syncPending!: boolean;
}
