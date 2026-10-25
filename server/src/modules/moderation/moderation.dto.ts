import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, MaxLength, MinLength, IsOptional } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ enum: ['user', 'community', 'event', 'organization', 'post'] })
  @IsIn(['user', 'community', 'event', 'organization', 'post'])
  targetType!: 'user' | 'community' | 'event' | 'organization' | 'post';

  @ApiProperty({ format: 'uuid' }) @IsUUID() targetId!: string;
  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;
}

export class CreatedReportDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
}

export class ModeratorUserDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() userId!: string;
}

export class ModerationPermissionsDto {
  @ApiProperty() manager!: boolean;
  @ApiProperty() moderator!: boolean;
}

export class ReportReviewDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() targetType!: string;
  @ApiProperty() targetId!: string;
  @ApiProperty() reason!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ format: 'uuid' }) reporterUserId!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) decidedByUserId!: string | null;
  @ApiProperty({ type: String, nullable: true }) decisionNote!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) decidedAt!: Date | null;
}

export class DecideReportDto {
  @ApiProperty({
    enum: ['DISMISSED', 'SUSPEND_USER', 'RESTORE_USER', 'ARCHIVE_COMMUNITY', 'CANCEL_EVENT'],
  })
  @IsIn(['DISMISSED', 'SUSPEND_USER', 'RESTORE_USER', 'ARCHIVE_COMMUNITY', 'CANCEL_EVENT'])
  action!: 'DISMISSED' | 'SUSPEND_USER' | 'RESTORE_USER' | 'ARCHIVE_COMMUNITY' | 'CANCEL_EVENT';

  @ApiProperty({ required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
