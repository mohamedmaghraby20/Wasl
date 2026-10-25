import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CurrentUserDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' }) emailVerifiedAt!:
    | string
    | null;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl!: string | null;
  @ApiProperty() bio!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) cityId!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) cityName!: string | null;
  @ApiProperty({ type: [String] }) interests!: string[];
}

export class UserSearchResultDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl!: string | null;
}

export class PublicUserProfileDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl!: string | null;
  @ApiProperty() bio!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) cityId!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) cityName!: string | null;
  @ApiProperty({ type: [String] }) interests!: string[];
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(80)
  cityId?: string | null;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  interests?: string[];

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  avatarPath?: string | null;
}
