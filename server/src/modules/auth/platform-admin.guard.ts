import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request.user) throw new UnauthorizedException('A valid bearer token is required.');

    const configured = this.config.get<string>('PLATFORM_ADMIN_USER_IDS') ?? '';
    const allowedUserIds = new Set(
      configured
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
    if (!allowedUserIds.has(request.user.id)) {
      throw new ForbiddenException('Platform administrator access is required.');
    }
    return true;
  }
}
