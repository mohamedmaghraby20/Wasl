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
    // SupabaseAuthGuard validates this very bearer token before resolving request.user.
    // Never use a claim from an unverified token to grant the administrator role.
    const token = /^Bearer\s+([^\s]+)$/i.exec(request.headers.authorization ?? '')?.[1];
    let assurance: unknown;
    try {
      const claims: unknown = JSON.parse(
        Buffer.from(token?.split('.')[1] ?? '', 'base64url').toString('utf8'),
      );
      if (claims && typeof claims === 'object' && 'aal' in claims) assurance = claims.aal;
    } catch {
      // Opaque or malformed tokens cannot prove a second factor.
    }
    if (assurance !== 'aal2') {
      throw new ForbiddenException(
        'Complete multi-factor authentication to access platform tools.',
      );
    }
    return true;
  }
}
