import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { getAuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import {
  CommunityTopicDetailsDto,
  CommunityTopicDto,
  CommunityTopicPageDto,
  CreateCommunityTopicDto,
  CreateDiscussionPostDto,
  DiscussionPostDto,
  DiscussionPostPageDto,
  UpdateDiscussionPostDto,
} from './discussions.dto';
import { DiscussionsService } from './discussions.service';

@ApiTags('discussions')
@Controller('events')
export class DiscussionsController {
  constructor(private readonly discussions: DiscussionsService) {}

  @Get(':id/discussion')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: DiscussionPostPageDto })
  listEventPosts(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.discussions.eventPosts(id, page, pageSize);
  }

  @Post(':id/discussion')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: DiscussionPostDto })
  createEventPost(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
    @Body() input: CreateDiscussionPostDto,
  ) {
    return this.discussions.createEventPost(getAuthenticatedUser(request), id, input);
  }

  @Patch(':id/discussion/close')
  @UseGuards(SupabaseAuthGuard)
  close(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.discussions.closeEventDiscussion(getAuthenticatedUser(request), id);
  }

  @Patch(':id/discussion/posts/:postId')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: DiscussionPostDto })
  update(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
    @Param('postId') postId: string,
    @Body() input: UpdateDiscussionPostDto,
  ) {
    return this.discussions.moderatePost(getAuthenticatedUser(request), 'event', id, postId, input);
  }

  @Delete(':id/discussion/posts/:postId')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: DiscussionPostDto })
  remove(@Req() request: FastifyRequest, @Param('id') id: string, @Param('postId') postId: string) {
    return this.discussions.moderatePost(getAuthenticatedUser(request), 'event', id, postId);
  }
}

@ApiTags('discussions')
@Controller('communities')
export class CommunityDiscussionsController {
  constructor(private readonly discussions: DiscussionsService) {}

  @Get(':id/topics')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiOkResponse({ type: CommunityTopicPageDto })
  list(@Param('id') id: string, @Query('page') page?: string) {
    return this.discussions.communityTopics(id, page);
  }

  @Get(':id/topics/:topicId')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiOkResponse({ type: CommunityTopicDetailsDto })
  details(
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Query('page') page?: string,
  ) {
    return this.discussions.communityTopic(id, topicId, page);
  }

  @Post(':id/topics')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CommunityTopicDto })
  create(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
    @Body() input: CreateCommunityTopicDto,
  ) {
    return this.discussions.createCommunityTopic(getAuthenticatedUser(request), id, input);
  }

  @Post(':id/topics/:topicId/posts')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: DiscussionPostDto })
  post(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Body() input: CreateDiscussionPostDto,
  ) {
    return this.discussions.createCommunityPost(getAuthenticatedUser(request), id, topicId, input);
  }

  @Patch(':id/topics/:topicId/close')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CommunityTopicDto })
  close(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
    @Param('topicId') topicId: string,
  ) {
    return this.discussions.closeCommunityTopic(getAuthenticatedUser(request), id, topicId);
  }

  @Patch(':id/topics/:topicId/posts/:postId')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: DiscussionPostDto })
  update(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Param('postId') postId: string,
    @Body() input: UpdateDiscussionPostDto,
  ) {
    return this.discussions.moderatePost(
      getAuthenticatedUser(request),
      'community',
      id,
      postId,
      input,
      topicId,
    );
  }

  @Delete(':id/topics/:topicId/posts/:postId')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: DiscussionPostDto })
  remove(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
    @Param('topicId') topicId: string,
    @Param('postId') postId: string,
  ) {
    return this.discussions.moderatePost(
      getAuthenticatedUser(request),
      'community',
      id,
      postId,
      undefined,
      topicId,
    );
  }
}
