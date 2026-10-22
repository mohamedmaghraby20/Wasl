import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ minLength: 1, maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ minLength: 1, maxLength: 80 })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  type!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 80 })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(80)
  cityId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  locationName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048, format: 'uri' })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2048)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  websiteUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048, format: 'uri' })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2048)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  socialUrl?: string | null;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  type?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 80 })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(80)
  cityId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  locationName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048, format: 'uri' })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2048)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  websiteUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048, format: 'uri' })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2048)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  socialUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  logoPath?: string | null;
}

export class OrganizationResourceLinkDto {
  @ApiProperty({ enum: ['community', 'event'] })
  kind!: 'community' | 'event';

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;
}

export class PublicOrganizationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  logoUrl!: string | null;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  cityId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  cityName!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  locationName!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  websiteUrl!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  socialUrl!: string | null;

  @ApiProperty({ enum: ['PENDING', 'VERIFIED', 'REJECTED'] })
  verificationStatus!: 'PENDING' | 'VERIFIED' | 'REJECTED';

  @ApiProperty({ type: [OrganizationResourceLinkDto] })
  resources!: OrganizationResourceLinkDto[];
}

export class ManagedOrganizationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['OWNER', 'ADMIN'] }) role!: 'OWNER' | 'ADMIN';
}

export class OrganizationManagerDto {
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty({ enum: ['OWNER', 'ADMIN'] }) role!: 'OWNER' | 'ADMIN';
}

export class RemovedOrganizationAdminDto {
  @ApiProperty({ format: 'uuid' }) userId!: string;
}

export class CreateOrganizationAdminInvitationDto {
  @ApiProperty({ format: 'email', maxLength: 320 })
  @IsEmail()
  @MaxLength(320)
  targetEmail!: string;
}

export class AcceptOrganizationAdminInvitationDto {
  @ApiProperty({ minLength: 32, maxLength: 128 })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;
}

export class CreatedOrganizationAdminInvitationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() token!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: Date;
}

export class OrganizationAdminInvitationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) targetUserId!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) targetDisplayName!: string | null;
  @ApiProperty({ enum: ['PENDING'] }) status!: 'PENDING';
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) expiresAt!: Date;
}

export class AcceptedOrganizationAdminInvitationDto {
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty() organizationSlug!: string;
  @ApiProperty({ enum: ['ADMIN'] }) role!: 'ADMIN';
}

export class RevokedOrganizationAdminInvitationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['REVOKED'] }) status!: 'REVOKED';
}

export class TransferOrganizationOwnershipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetUserId!: string;
}

export class TransferredOrganizationOwnershipDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ format: 'uuid' }) ownerUserId!: string;
  @ApiProperty({ enum: ['ADMIN'] }) previousOwnerRole!: 'ADMIN';
}

export class RequestOrganizationVerificationDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}

export class OrganizationVerificationRequestDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';
  @ApiPropertyOptional({ type: String, nullable: true }) requestNote!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) decisionNote!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiPropertyOptional({ format: 'date-time', type: String, nullable: true })
  decidedAt!: Date | null;
}

export class OrganizationVerificationQueueItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty() organizationName!: string;
  @ApiProperty() organizationSlug!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) requestedByDisplayName!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) requestNote!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class DecideOrganizationVerificationDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}

export class DecidedOrganizationVerificationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) organizationId!: string;
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  status!: 'APPROVED' | 'REJECTED';
  @ApiProperty({ enum: ['VERIFIED', 'REJECTED'] })
  verificationStatus!: 'VERIFIED' | 'REJECTED';
  @ApiPropertyOptional({ type: String, nullable: true }) decisionNote!: string | null;
  @ApiProperty({ format: 'date-time' }) decidedAt!: Date;
}
