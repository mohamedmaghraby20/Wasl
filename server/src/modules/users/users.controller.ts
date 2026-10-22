import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { getAuthenticatedUser } from '../auth/authenticated-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { UsersService } from './users.service';
import { CurrentUserDto, PublicUserProfileDto, UpdateProfileDto } from './users.dto';

@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiQuery({ name: 'lang', required: false, enum: ['en', 'ar', 'tr'] })
  current(@Req() request: FastifyRequest, @Query('lang') language?: string) {
    return this.users.getCurrent(getAuthenticatedUser(request), language);
  }

  @Patch('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiQuery({ name: 'lang', required: false, enum: ['en', 'ar', 'tr'] })
  async update(
    @Req() request: FastifyRequest,
    @Body() input: UpdateProfileDto,
    @Query('lang') language?: string,
  ) {
    const authenticated = getAuthenticatedUser(request);
    const oldAvatar = await this.users.getCurrentAvatarPath(authenticated);
    const updated = await this.users.updateCurrent(authenticated, input, language);
    await this.users.removeUnusedAvatar(
      authenticated,
      oldAvatar,
      input.avatarPath === undefined ? oldAvatar : input.avatarPath,
    );
    return updated;
  }

  @Get(':id')
  @ApiOkResponse({ type: PublicUserProfileDto })
  @ApiQuery({ name: 'lang', required: false, enum: ['en', 'ar', 'tr'] })
  publicProfile(@Param('id', ParseUUIDPipe) id: string, @Query('lang') language?: string) {
    return this.users.getPublic(id, language);
  }
}
