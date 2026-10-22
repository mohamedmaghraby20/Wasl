import { Body, Controller, Param, ParseUUIDPipe, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { getAuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreatedResourceDto } from '../communities/communities.dto';
import { CreateEventDto, UpdateEventDto } from './events.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CreatedResourceDto })
  create(@Req() request: FastifyRequest, @Body() input: CreateEventDto) {
    return this.events.create(getAuthenticatedUser(request), input);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CreatedResourceDto })
  update(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateEventDto) {
    return this.events.update(getAuthenticatedUser(request), id, input);
  }

  @Patch(':id/cancel')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CreatedResourceDto })
  cancel(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.cancel(getAuthenticatedUser(request), id);
  }
}
