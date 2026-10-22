import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseIdentityService } from './supabase-identity.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly auth: SupabaseAuthService,
    private readonly identity: SupabaseIdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authorization = request.headers.authorization;
    const match = authorization && /^Bearer\s+([^\s]+)$/i.exec(authorization);
    if (!match?.[1]) throw new UnauthorizedException('A valid bearer token is required.');

    const authUser = await this.auth.authenticate(match[1]);
    request.user = await this.identity.resolve(authUser);
    return true;
  }
}
