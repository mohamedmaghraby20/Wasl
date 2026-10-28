import {
  Body,
  Controller,
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
import { PrivacyGateExempt } from '../auth/privacy-gate.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import {
  AcceptDocumentDto,
  AdminAgeEligibilityDto,
  AdminPrivacyRequestDto,
  CreatePrivacyRequestDto,
  DecidePrivacyRequestDto,
  DeclareAgeEligibilityDto,
  PrivacyRequestDto,
  PrivacyStatusDto,
  RetentionPreviewDto,
  ReviewAgeEligibilityDto,
} from './privacy.dto';
import { PrivacyService } from './privacy.service';

@ApiTags('privacy')
@Controller('privacy')
@UseGuards(SupabaseAuthGuard)
@PrivacyGateExempt()
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('status')
  @ApiOkResponse({ type: PrivacyStatusDto })
  status(@Req() request: FastifyRequest) {
    return this.privacy.status(getAuthenticatedUser(request).id);
  }

  @Post('age-eligibility')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ type: PrivacyStatusDto })
  declareAge(@Req() request: FastifyRequest, @Body() input: DeclareAgeEligibilityDto) {
    return this.privacy.declareAge(getAuthenticatedUser(request).id, input.isAdult);
  }

  @Post('acceptances')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ type: PrivacyStatusDto })
  accept(@Req() request: FastifyRequest, @Body() input: AcceptDocumentDto) {
    return this.privacy.accept(getAuthenticatedUser(request).id, input);
  }

  @Get('export')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOkResponse({
    description: 'Machine-readable export of Wasl-owned personal data.',
    schema: { type: 'object', additionalProperties: true },
  })
  exportData(@Req() request: FastifyRequest) {
    return this.privacy.exportData(getAuthenticatedUser(request).id);
  }

  @Get('requests')
  @ApiOkResponse({ type: PrivacyRequestDto, isArray: true })
  listRequests(@Req() request: FastifyRequest) {
    return this.privacy.listRequests(getAuthenticatedUser(request).id);
  }

  @Post('requests')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOkResponse({ type: PrivacyRequestDto })
  createRequest(@Req() request: FastifyRequest, @Body() input: CreatePrivacyRequestDto) {
    return this.privacy.createRequest(getAuthenticatedUser(request).id, input);
  }

  @Get('requests/:id')
  @ApiOkResponse({ type: PrivacyRequestDto })
  getRequest(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.privacy.getRequest(getAuthenticatedUser(request).id, id);
  }

  @Patch('requests/:id/cancel')
  @ApiOkResponse({ type: PrivacyRequestDto })
  cancelRequest(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.privacy.cancelRequest(getAuthenticatedUser(request).id, id);
  }
}

@ApiTags('privacy')
@Controller('admin/privacy')
@UseGuards(SupabaseAuthGuard, PlatformAdminGuard)
export class PrivacyAdminController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get('requests')
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['RECEIVED', 'IN_REVIEW', 'PENDING_PROVIDER', 'COMPLETED', 'REJECTED', 'CANCELLED'],
  })
  @ApiOkResponse({ type: AdminPrivacyRequestDto, isArray: true })
  list(@Query('status') status?: string) {
    return this.privacy.listAllRequests(status);
  }

  @Patch('requests/:id')
  @ApiOkResponse({ type: PrivacyRequestDto })
  decide(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: DecidePrivacyRequestDto,
  ) {
    return this.privacy.decideRequest(getAuthenticatedUser(request).id, id, input);
  }

  @Post('requests/:id/provider-actions/retry')
  @ApiOkResponse({ type: PrivacyRequestDto })
  retry(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.privacy.retryProviderActions(getAuthenticatedUser(request).id, id);
  }

  @Patch('users/:userId/age-eligibility')
  @ApiOkResponse({ type: AdminAgeEligibilityDto })
  reviewAge(
    @Req() request: FastifyRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() input: ReviewAgeEligibilityDto,
  ) {
    return this.privacy.reviewAge(getAuthenticatedUser(request).id, userId, input);
  }

  @Get('retention')
  @ApiOkResponse({ type: RetentionPreviewDto })
  retention() {
    return this.privacy.retentionPreview();
  }
}
