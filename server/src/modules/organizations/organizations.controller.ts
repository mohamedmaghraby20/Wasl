import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { getAuthenticatedUser } from '../auth/authenticated-user';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreatedResourceDto } from '../communities/communities.dto';
import {
  AcceptOrganizationAdminInvitationDto,
  AcceptedOrganizationAdminInvitationDto,
  CreateOrganizationAdminInvitationDto,
  CreateOrganizationDto,
  CreatedOrganizationAdminInvitationDto,
  DecideOrganizationVerificationDto,
  DecidedOrganizationVerificationDto,
  ManagedOrganizationDto,
  OrganizationAdminInvitationDto,
  OrganizationManagerDto,
  OrganizationVerificationQueueItemDto,
  OrganizationVerificationRequestDto,
  PublicOrganizationDto,
  RemovedOrganizationAdminDto,
  RequestOrganizationVerificationDto,
  RevokedOrganizationAdminInvitationDto,
  TransferOrganizationOwnershipDto,
  TransferredOrganizationOwnershipDto,
  UpdateOrganizationDto,
} from './organizations.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('mine')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: ManagedOrganizationDto, isArray: true })
  mine(@Req() request: FastifyRequest) {
    return this.organizations.listMine(getAuthenticatedUser(request).id);
  }

  @Post('admin-invitations/accept')
  @UseGuards(SupabaseAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ type: AcceptedOrganizationAdminInvitationDto })
  acceptAdminInvitation(
    @Req() request: FastifyRequest,
    @Body() input: AcceptOrganizationAdminInvitationDto,
  ) {
    return this.organizations.acceptAdminInvitation(getAuthenticatedUser(request), input.token);
  }

  @Post(':id/admin-invitations')
  @UseGuards(SupabaseAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ type: CreatedOrganizationAdminInvitationDto })
  createAdminInvitation(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreateOrganizationAdminInvitationDto,
  ) {
    return this.organizations.createAdminInvitation(getAuthenticatedUser(request), id, input);
  }

  @Get(':id/admin-invitations')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: OrganizationAdminInvitationDto, isArray: true })
  listAdminInvitations(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.organizations.listAdminInvitations(getAuthenticatedUser(request), id);
  }

  @Delete(':id/admin-invitations/:invitationId')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: RevokedOrganizationAdminInvitationDto })
  revokeAdminInvitation(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    return this.organizations.revokeAdminInvitation(
      getAuthenticatedUser(request),
      id,
      invitationId,
    );
  }

  @Get(':id/admins')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: OrganizationManagerDto, isArray: true })
  listManagers(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.organizations.listManagers(getAuthenticatedUser(request).id, id);
  }

  @Delete(':id/admins/:userId')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: RemovedOrganizationAdminDto })
  removeAdmin(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.organizations.removeAdmin(getAuthenticatedUser(request), id, userId);
  }

  @Post(':id/ownership-transfer')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: TransferredOrganizationOwnershipDto })
  transferOwnership(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: TransferOrganizationOwnershipDto,
  ) {
    return this.organizations.transferOwnership(
      getAuthenticatedUser(request),
      id,
      input.targetUserId,
    );
  }

  @Get(':id/verification-requests')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: OrganizationVerificationRequestDto, isArray: true })
  listVerificationRequests(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.organizations.listVerificationRequests(getAuthenticatedUser(request).id, id);
  }

  @Post(':id/verification-requests')
  @UseGuards(SupabaseAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ type: OrganizationVerificationRequestDto })
  requestVerification(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RequestOrganizationVerificationDto,
  ) {
    return this.organizations.requestVerification(getAuthenticatedUser(request), id, input);
  }

  @Get('verification-requests')
  @UseGuards(SupabaseAuthGuard, PlatformAdminGuard)
  @ApiOkResponse({ type: OrganizationVerificationQueueItemDto, isArray: true })
  listPendingVerificationRequests() {
    return this.organizations.listPendingVerificationRequests();
  }

  @Patch('verification-requests/:requestId')
  @UseGuards(SupabaseAuthGuard, PlatformAdminGuard)
  @ApiOkResponse({ type: DecidedOrganizationVerificationDto })
  decideVerification(
    @Req() request: FastifyRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() input: DecideOrganizationVerificationDto,
  ) {
    return this.organizations.decideVerification(
      getAuthenticatedUser(request).id,
      requestId,
      input,
    );
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CreatedResourceDto })
  create(@Req() request: FastifyRequest, @Body() input: CreateOrganizationDto) {
    return this.organizations.create(getAuthenticatedUser(request), input);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: PublicOrganizationDto })
  @ApiQuery({ name: 'lang', required: false, enum: ['en', 'ar', 'tr'] })
  update(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
    @Body() input: UpdateOrganizationDto,
    @Query('lang') language?: string,
  ) {
    return this.organizations.update(getAuthenticatedUser(request), id, input, language);
  }

  @Get(':slug')
  @ApiOkResponse({ type: PublicOrganizationDto })
  @ApiQuery({ name: 'lang', required: false, enum: ['en', 'ar', 'tr'] })
  publicProfile(@Param('slug') slug: string, @Query('lang') language?: string) {
    return this.organizations.getPublic(slug, language);
  }
}
