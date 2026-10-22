import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCommunityDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  cityId!: string;

  @ApiProperty({ type: [String], minItems: 1, maxItems: 5 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  categoryIds!: string[];

  @ApiProperty({ enum: ['open', 'approval', 'automatic'] })
  @IsIn(['open', 'approval', 'automatic'])
  admissionMode!: 'open' | 'approval' | 'automatic';

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  organizationId?: string | null;
}

export class UpdateCommunityDto extends CreateCommunityDto {}

export class ManagedCommunityDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
}

export class CreatedResourceDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
}
