import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class DiscussionPostDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) parentId!: string | null;
  @ApiProperty() authorId!: string;
  @ApiProperty() authorName!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) body!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class DiscussionPostPageDto {
  @ApiProperty({ type: [DiscussionPostDto] }) items!: DiscussionPostDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() hasMore!: boolean;
  @ApiProperty() total!: number;
  @ApiProperty() closed!: boolean;
}

export class CreateDiscussionPostDto {
  @ApiProperty() @IsString() @MaxLength(5000) body!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() parentId?: string;
}

export class CreateCommunityTopicDto {
  @ApiProperty() @IsString() @MaxLength(160) title!: string;
  @ApiProperty() @IsString() @MaxLength(5000) body!: string;
}

export class CommunityTopicDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() authorId!: string;
  @ApiProperty() authorName!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() archived!: boolean;
}

export class CommunityTopicPageDto {
  @ApiProperty({ type: [CommunityTopicDto] }) items!: CommunityTopicDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() hasMore!: boolean;
}

export class CommunityTopicDetailsDto extends CommunityTopicDto {
  @ApiProperty({ type: DiscussionPostPageDto }) posts!: DiscussionPostPageDto;
}

export class UpdateDiscussionPostDto {
  @ApiProperty() @IsString() @MaxLength(5000) body!: string;
}
