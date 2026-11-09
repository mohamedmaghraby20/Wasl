import { Body, Controller, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { getAuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreatedResourceDto } from '../communities/communities.dto';
import { CreateEventDto, ManagedEventDto, UpdateEventDto } from './events.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get('mine')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: [ManagedEventDto] })
  mine(@Req() request: FastifyRequest) {
    return this.events.listMine(getAuthenticatedUser(request));
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CreatedResourceDto })
  create(@Req() request: FastifyRequest, @Body() input: CreateEventDto) {
    return this.events.create(getAuthenticatedUser(request), input);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CreatedResourceDto })
  update(@Req() request: FastifyRequest, @Param('id') id: string, @Body() input: UpdateEventDto) {
    return this.events.update(getAuthenticatedUser(request), id, input);
  }

  @Patch(':id/cancel')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CreatedResourceDto })
  cancel(@Req() request: FastifyRequest, @Param('id') id: string) {
    return this.events.cancel(getAuthenticatedUser(request), id);
  }
}
