import { ApiProperty } from '@nestjs/swagger';

export class MembershipStateDto {
  @ApiProperty({
    enum: ['PENDING', 'WAITLISTED', 'ACTIVE', 'REJECTED', 'LEFT', 'REMOVED'],
    nullable: true,
  })
  status!: string | null;
}

export class RegistrationStateDto {
  @ApiProperty({
    enum: [
      'PENDING',
      'WAITLISTED',
      'ACCEPTED',
      'REJECTED',
      'CANCELLED_BY_USER',
      'REMOVED_BY_ORGANIZER',
      'ATTENDED',
      'NO_SHOW',
    ],
    nullable: true,
  })
  status!: string | null;
}

export class CommunityActivityItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: ['PENDING', 'WAITLISTED', 'ACTIVE', 'REJECTED', 'LEFT', 'REMOVED'] })
  status!: string;
  @ApiProperty({ format: 'date-time' }) requestedAt!: string;
}

export class EventActivityItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty() cancelled!: boolean;
  @ApiProperty({
    enum: [
      'PENDING',
      'WAITLISTED',
      'ACCEPTED',
      'REJECTED',
      'CANCELLED_BY_USER',
      'REMOVED_BY_ORGANIZER',
      'ATTENDED',
      'NO_SHOW',
    ],
  })
  status!: string;
  @ApiProperty({ format: 'date-time' }) requestedAt!: string;
}

export class MyActivityDto {
  @ApiProperty({ type: [CommunityActivityItemDto] }) communities!: CommunityActivityItemDto[];
  @ApiProperty({ type: [EventActivityItemDto] }) events!: EventActivityItemDto[];
}

export class ParticipantListItemDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ format: 'date-time' }) requestedAt!: string;
}

export class ParticipationCountsDto {
  @ApiProperty() capacity!: string;
  @ApiProperty() admissionMode!: string;
  @ApiProperty() PENDING!: number;
  @ApiProperty() WAITLISTED!: number;
  @ApiProperty() ACTIVE!: number;
  @ApiProperty() ACCEPTED!: number;
  @ApiProperty() REJECTED!: number;
  @ApiProperty() LEFT!: number;
  @ApiProperty() REMOVED!: number;
  @ApiProperty() CANCELLED_BY_USER!: number;
  @ApiProperty() REMOVED_BY_ORGANIZER!: number;
  @ApiProperty() ATTENDED!: number;
  @ApiProperty() NO_SHOW!: number;
}

export class ParticipationDecisionDto {
  @ApiProperty({ format: 'uuid' }) participantId!: string;
  @ApiProperty() status!: string;
}
