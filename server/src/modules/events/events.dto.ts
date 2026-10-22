import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ minLength: 1, maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @ApiProperty({ minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({ enum: ['public', 'unlisted'], default: 'public' })
  @IsOptional()
  @IsIn(['public', 'unlisted'])
  visibility?: 'public' | 'unlisted';

  @ApiProperty({ type: [String], minItems: 1, maxItems: 5 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  categoryIds!: string[];

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @ApiProperty()
  @IsBoolean()
  online!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(80)
  cityId?: string | null;

  @ApiProperty({ enum: ['instant', 'approval', 'automatic'] })
  @IsIn(['instant', 'approval', 'automatic'])
  admissionMode!: 'instant' | 'approval' | 'automatic';

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(80)
  communityId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsUUID()
  organizationId?: string | null;
}

export class UpdateEventDto extends CreateEventDto {}
