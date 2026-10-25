import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() type!: string;
  @ApiProperty({ enum: ['community', 'event', 'organization'] }) contextType!: string;
  @ApiProperty() contextId!: string;
  @ApiProperty({ type: String, nullable: true }) href!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) readAt!: Date | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class ReadNotificationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) readAt!: Date;
}
