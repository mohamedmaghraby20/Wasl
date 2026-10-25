import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { getAuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import {
  CreateReportDto,
  CreatedReportDto,
  DecideReportDto,
  ModerationPermissionsDto,
  ModeratorUserDto,
  ReportReviewDto,
} from './moderation.dto';
import { ModerationService } from './moderation.service';

@ApiTags('moderation')
@Controller('reports')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ type: CreatedReportDto })
  report(@Req() request: FastifyRequest, @Body() input: CreateReportDto) {
    return this.moderation.report(getAuthenticatedUser(request).id, input);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard, PlatformAdminGuard)
  @ApiOkResponse({ type: ReportReviewDto, isArray: true })
  list() {
    return this.moderation.listReports();
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard, PlatformAdminGuard)
  @ApiOkResponse({ type: ReportReviewDto })
  decide(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: DecideReportDto,
  ) {
    return this.moderation.decideReport(getAuthenticatedUser(request).id, id, input);
  }
}

enum ModerationKind {
  community = 'community',
  event = 'event',
}

@ApiTags('moderation')
@Controller('moderation')
@UseGuards(SupabaseAuthGuard)
export class ModeratorAssignmentsController {
  constructor(private readonly moderation: ModerationService) {}

  @Get(':kind/:id/permissions')
  @ApiParam({ name: 'kind', type: String, enum: ['community', 'event'] })
  @ApiOkResponse({ type: ModerationPermissionsDto })
  permissions(
    @Req() request: FastifyRequest,
    @Param('kind', new ParseEnumPipe(ModerationKind)) kind: ModerationKind,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.moderation.permissions(getAuthenticatedUser(request).id, kind, id);
  }

  @Get(':kind/:id/moderators')
  @ApiParam({ name: 'kind', type: String, enum: ['community', 'event'] })
  @ApiOkResponse({ type: ModeratorUserDto, isArray: true })
  list(
    @Req() request: FastifyRequest,
    @Param('kind', new ParseEnumPipe(ModerationKind)) kind: ModerationKind,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.moderation.listModerators(getAuthenticatedUser(request).id, kind, id);
  }

  @Post(':kind/:id/moderators')
  @ApiParam({ name: 'kind', type: String, enum: ['community', 'event'] })
  @ApiOkResponse({ type: ModeratorUserDto })
  assign(
    @Req() request: FastifyRequest,
    @Param('kind', new ParseEnumPipe(ModerationKind)) kind: ModerationKind,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ModeratorUserDto,
  ) {
    return this.moderation.assignModerator(
      getAuthenticatedUser(request).id,
      kind,
      id,
      input.userId,
    );
  }

  @Delete(':kind/:id/moderators/:userId')
  @ApiParam({ name: 'kind', type: String, enum: ['community', 'event'] })
  @ApiOkResponse({ type: ModeratorUserDto })
  remove(
    @Req() request: FastifyRequest,
    @Param('kind', new ParseEnumPipe(ModerationKind)) kind: ModerationKind,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.moderation.removeModerator(getAuthenticatedUser(request).id, kind, id, userId);
  }
}
