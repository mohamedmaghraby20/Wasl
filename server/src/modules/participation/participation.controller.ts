import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { getAuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import {
  MembershipStateDto,
  MyActivityDto,
  ParticipantListItemDto,
  ParticipationCountsDto,
  ParticipationDecisionDto,
  RegistrationStateDto,
} from './participation.dto';
import { ParticipationService } from './participation.service';

@ApiTags('participation')
@Controller()
@UseGuards(SupabaseAuthGuard)
export class ParticipationController {
  constructor(private readonly participation: ParticipationService) {}

  @Get('participation/me')
  @ApiOkResponse({ type: MyActivityDto })
  myActivity(@Req() request: FastifyRequest) {
    return this.participation.myActivity(getAuthenticatedUser(request));
  }

  @Post('communities/:id/join')
  @ApiOkResponse({ type: MembershipStateDto })
  joinCommunity(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.participation.joinCommunity(getAuthenticatedUser(request), id);
  }

  @Patch('communities/:id/leave')
  @ApiOkResponse({ type: MembershipStateDto })
  leaveCommunity(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.participation.leaveCommunity(getAuthenticatedUser(request), id);
  }

  @Get('communities/:id/membership')
  @ApiOkResponse({ type: MembershipStateDto })
  communityStatus(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.participation.myCommunityStatus(getAuthenticatedUser(request), id);
  }

  @Post('events/:id/register')
  @ApiOkResponse({ type: RegistrationStateDto })
  registerForEvent(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.participation.registerForEvent(getAuthenticatedUser(request), id);
  }

  @Patch('events/:id/cancel-registration')
  @ApiOkResponse({ type: RegistrationStateDto })
  cancelEventRegistration(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.participation.cancelEventRegistration(getAuthenticatedUser(request), id);
  }

  @Get('events/:id/registration')
  @ApiOkResponse({ type: RegistrationStateDto })
  eventStatus(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.participation.myEventStatus(getAuthenticatedUser(request), id);
  }

  @Get('communities/:id/participants')
  @ApiOkResponse({ type: ParticipantListItemDto, isArray: true })
  communityParticipants(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.participation.communityParticipants(getAuthenticatedUser(request), id);
  }

  @Get('communities/:id/participation-counts')
  @ApiOkResponse({ type: ParticipationCountsDto })
  communityCounts(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.participation.communityCounts(getAuthenticatedUser(request), id);
  }

  @Patch('communities/:id/participants/:participantId/:action')
  @ApiOkResponse({ type: ParticipationDecisionDto })
  communityDecision(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Param('action') action: string,
  ) {
    if (!['approve', 'reject', 'promote', 'remove'].includes(action))
      throw new BadRequestException('Unsupported membership action.');
    return this.participation.decideCommunity(
      getAuthenticatedUser(request),
      id,
      participantId,
      action as 'approve' | 'reject' | 'promote' | 'remove',
    );
  }

  @Get('events/:id/participants')
  @ApiOkResponse({ type: ParticipantListItemDto, isArray: true })
  eventParticipants(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.participation.eventParticipants(getAuthenticatedUser(request), id);
  }

  @Get('events/:id/participation-counts')
  @ApiOkResponse({ type: ParticipationCountsDto })
  eventCounts(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.participation.eventCounts(getAuthenticatedUser(request), id);
  }

  @Patch('events/:id/participants/:participantId/:action')
  @ApiOkResponse({ type: ParticipationDecisionDto })
  eventDecision(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Param('action') action: string,
  ) {
    if (!['approve', 'reject', 'promote', 'remove', 'attended', 'no-show'].includes(action))
      throw new BadRequestException('Unsupported registration action.');
    return this.participation.decideEvent(
      getAuthenticatedUser(request),
      id,
      participantId,
      action as 'approve' | 'reject' | 'promote' | 'remove' | 'attended' | 'no-show',
    );
  }
}
