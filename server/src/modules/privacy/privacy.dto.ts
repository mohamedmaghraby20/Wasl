import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const LEGAL_DOCUMENT_TYPES = [
  'TERMS_OF_USE',
  'PRIVACY_NOTICE',
  'AGE_ELIGIBILITY_POLICY',
  'COOKIE_NOTICE',
] as const;

export const ACCEPTABLE_DOCUMENT_TYPES = ['TERMS_OF_USE', 'PRIVACY_NOTICE'] as const;

export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

export const PRIVACY_REQUEST_TYPES = ['ACCESS', 'CORRECTION', 'EXPORT', 'DELETION'] as const;

export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_ACTIONS = ['START_REVIEW', 'APPROVE', 'REJECT'] as const;

export type PrivacyRequestAction = (typeof PRIVACY_REQUEST_ACTIONS)[number];

export class DeclareAgeEligibilityDto {
  @ApiProperty({
    description:
      'Affirmative confirmation that the account holder is 18 or older. A false answer records an under-18 determination.',
  })
  @IsBoolean()
  isAdult!: boolean;
}

export class AcceptDocumentDto {
  @ApiProperty({ enum: ACCEPTABLE_DOCUMENT_TYPES })
  @IsIn([...ACCEPTABLE_DOCUMENT_TYPES])
  documentType!: (typeof ACCEPTABLE_DOCUMENT_TYPES)[number];

  @ApiProperty({ minLength: 1, maxLength: 40 })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  version!: string;
}

export class LegalDocumentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: LEGAL_DOCUMENT_TYPES }) type!: string;
  @ApiProperty() version!: string;
  @ApiProperty({ enum: ['ar', 'en', 'tr'] }) locale!: string;
  @ApiProperty() content!: string;
  @ApiProperty() contentHash!: string;
  @ApiProperty({ format: 'date-time' }) publishedAt!: Date;
}

export class AcceptedDocumentDto {
  @ApiProperty() documentType!: string;
  @ApiProperty() version!: string;
  @ApiProperty({ format: 'date-time' }) acceptedAt!: Date;
}

export class PrivacyRequestEventDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['USER', 'ADMIN', 'SYSTEM'] }) actorRole!: string;
  @ApiProperty() eventType!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) note!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class PrivacyProviderActionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['WASL', 'SUPABASE_AUTH', 'SUPABASE_STORAGE', 'STREAM', 'RESEND'] })
  provider!: string;
  @ApiProperty() action!: string;
  @ApiProperty({ enum: ['PENDING', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'SKIPPED'] })
  status!: string;
  @ApiProperty() attemptCount!: number;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  lastAttemptAt!: Date | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  completedAt!: Date | null;
  @ApiPropertyOptional({ type: String, nullable: true }) lastError!: string | null;
}

export class PrivacyRequestDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: PRIVACY_REQUEST_TYPES }) requestType!: string;
  @ApiProperty({
    enum: ['RECEIVED', 'IN_REVIEW', 'PENDING_PROVIDER', 'COMPLETED', 'REJECTED', 'CANCELLED'],
  })
  status!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) requestNote!: string | null;
  @ApiProperty({ format: 'date-time' }) dueAt!: Date;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  identityVerifiedAt!: Date | null;
  @ApiPropertyOptional({ type: String, nullable: true }) decisionNote!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  decidedAt!: Date | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  completedAt!: Date | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
  @ApiPropertyOptional({ type: [PrivacyRequestEventDto] }) events?: PrivacyRequestEventDto[];
  @ApiPropertyOptional({ type: [PrivacyProviderActionDto] })
  providerActions?: PrivacyProviderActionDto[];
}

export class PrivacyStatusDto {
  @ApiProperty({ enum: ['UNVERIFIED', '18_PLUS', 'UNDER_18'] }) ageEligibility!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) ageVerificationMethod!: string | null;
  @ApiProperty() requiresOnboarding!: boolean;
  @ApiProperty({ type: [LegalDocumentDto] }) documents!: LegalDocumentDto[];
  @ApiProperty({ type: [AcceptedDocumentDto] }) acceptedDocuments!: AcceptedDocumentDto[];
  @ApiProperty({ type: [PrivacyRequestDto] }) openRequests!: PrivacyRequestDto[];
}

export class AdminPrivacyRequestDto extends PrivacyRequestDto {
  @ApiProperty() requesterEmail!: string;
}

export class CreatePrivacyRequestDto {
  @ApiProperty({ enum: PRIVACY_REQUEST_TYPES })
  @IsIn([...PRIVACY_REQUEST_TYPES])
  requestType!: PrivacyRequestType;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class DecidePrivacyRequestDto {
  @ApiProperty({ enum: PRIVACY_REQUEST_ACTIONS })
  @IsIn([...PRIVACY_REQUEST_ACTIONS])
  action!: PrivacyRequestAction;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ReviewAgeEligibilityDto {
  @ApiProperty({ enum: ['UNVERIFIED', '18_PLUS', 'UNDER_18'] })
  @IsIn(['UNVERIFIED', '18_PLUS', 'UNDER_18'])
  status!: 'UNVERIFIED' | '18_PLUS' | 'UNDER_18';

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class AdminAgeEligibilityDto {
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty({ enum: ['UNVERIFIED', '18_PLUS', 'UNDER_18'] }) status!: string;
  @ApiProperty() method!: string;
  @ApiProperty({ format: 'date-time' }) decidedAt!: Date;
  @ApiPropertyOptional({ type: String, nullable: true }) note!: string | null;
}

export class RetentionPolicyDto {
  @ApiProperty() dataGroup!: string;
  @ApiProperty() triggerEvent!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) durationDays!: number | null;
  @ApiProperty() handling!: string;
  @ApiProperty() owner!: string;
  @ApiProperty({ enum: ['TBD_LEGAL', 'APPROVED'] }) status!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) approvedBy!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  approvedAt!: Date | null;
}

export class RetentionPreviewDto {
  @ApiProperty({ type: [RetentionPolicyDto] }) policies!: RetentionPolicyDto[];
  @ApiProperty() erasureEnabled!: boolean;
  @ApiProperty({ type: [String] }) blockedDataGroups!: string[];
}
