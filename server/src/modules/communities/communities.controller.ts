import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { getAuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import {
  CreatedResourceDto,
  CreateCommunityDto,
  ManagedCommunityDto,
  UpdateCommunityDto,
} from './communities.dto';
import { CommunitiesService } from './communities.service';

@ApiTags('communities')
@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communities: CommunitiesService) {}

  @Get('mine')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: ManagedCommunityDto, isArray: true })
  mine(@Req() request: FastifyRequest) {
    return this.communities.listMine(getAuthenticatedUser(request));
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CreatedResourceDto })
  create(@Req() request: FastifyRequest, @Body() input: CreateCommunityDto) {
    return this.communities.create(getAuthenticatedUser(request), input);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CreatedResourceDto })
  update(
    @Req() request: FastifyRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateCommunityDto,
  ) {
    return this.communities.update(getAuthenticatedUser(request), id, input);
  }

  @Patch(':id/archive')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CreatedResourceDto })
  archive(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.communities.archive(getAuthenticatedUser(request), id);
  }
}
