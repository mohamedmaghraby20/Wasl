import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { getAuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { NotificationDto, ReadNotificationDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(SupabaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOkResponse({ type: NotificationDto, isArray: true })
  list(@Req() request: FastifyRequest) {
    return this.notifications.list(getAuthenticatedUser(request).id);
  }

  @Patch(':id/read')
  @ApiOkResponse({ type: ReadNotificationDto })
  async markRead(@Req() request: FastifyRequest, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.notifications.markRead(getAuthenticatedUser(request).id, id);
    if (!result) throw new NotFoundException('Notification not found.');
    return result;
  }
}
