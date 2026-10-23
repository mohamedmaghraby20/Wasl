import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { getAuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import {
  BlockUserDto,
  CreateDirectMessageDto,
  MessagingBlockedUserDto,
  MessagingBlockResultDto,
  MessagingChannelDto,
  MessagingConversationItemDto,
  MessagingReportResultDto,
  MessagingSessionDto,
  ReportConversationDto,
} from './messaging.dto';
import { MessagingService } from './messaging.service';

@ApiTags('messaging')
@Controller('messaging')
@UseGuards(SupabaseAuthGuard)
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Post('session')
  @ApiOkResponse({ type: MessagingSessionDto })
  session(@Req() request: FastifyRequest) {
    return this.messaging.session(getAuthenticatedUser(request));
  }

  @Get('conversations')
  @ApiOkResponse({ type: [MessagingConversationItemDto] })
  conversations(@Req() request: FastifyRequest) {
    return this.messaging.listConversations(getAuthenticatedUser(request));
  }

  @Post('direct-messages')
  @ApiOkResponse({ type: MessagingChannelDto })
  directMessage(@Req() request: FastifyRequest, @Body() input: CreateDirectMessageDto) {
    return this.messaging.createDirectMessage(getAuthenticatedUser(request), input.recipientUserId);
  }

  @Post('blocks')
  @ApiOkResponse({ type: MessagingBlockResultDto })
  block(@Req() request: FastifyRequest, @Body() input: BlockUserDto) {
    return this.messaging.setBlock(getAuthenticatedUser(request), input.userId, true);
  }

  @Get('blocks')
  @ApiOkResponse({ type: [MessagingBlockedUserDto] })
  blockedUsers(@Req() request: FastifyRequest) {
    return this.messaging.blockedUsers(getAuthenticatedUser(request));
  }

  @Delete('blocks/:userId')
  @ApiOkResponse({ type: MessagingBlockResultDto })
  unblock(@Req() request: FastifyRequest, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.messaging.setBlock(getAuthenticatedUser(request), userId, false);
  }

  @Post('conversations/:id/report')
  @ApiOkResponse({ type: MessagingReportResultDto })
  report(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReportConversationDto,
  ) {
    return this.messaging.reportConversation(getAuthenticatedUser(request), id, input.reason);
  }

  @Post('communities/:id/access')
  @ApiOkResponse({ type: MessagingChannelDto })
  community(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.messaging.openResourceChannel(getAuthenticatedUser(request), 'community', id);
  }

  @Post('events/:id/access')
  @ApiOkResponse({ type: MessagingChannelDto })
  event(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.messaging.openResourceChannel(getAuthenticatedUser(request), 'event', id);
  }
}
