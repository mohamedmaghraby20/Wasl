import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { PRIVACY_GATE_EXEMPT } from './privacy-gate.decorator';
import { PrivacyGateService } from './privacy-gate.service';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseIdentityService } from './supabase-identity.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly auth: SupabaseAuthService,
    private readonly identity: SupabaseIdentityService,
    private readonly gate: PrivacyGateService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authorization = request.headers.authorization;
    const match = authorization && /^Bearer\s+([^\s]+)$/i.exec(authorization);
    if (!match?.[1]) throw new UnauthorizedException('A valid bearer token is required.');

    const authUser = await this.auth.authenticate(match[1]);
    const user = await this.identity.resolve(authUser);
    request.user = user;

    const exempt = this.reflector.getAllAndOverride<boolean>(PRIVACY_GATE_EXEMPT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (exempt) return true;

    if (user.accountStatus === 'DELETION_PENDING') {
      throw new ForbiddenException('Account deletion is pending review.');
    }

    const state = await this.gate.stateFor(user.id);
    if (state.ageEligibility === 'UNDER_18') {
      throw new ForbiddenException(
        'This account is not eligible for authenticated Wasl features because it was recorded as under 18.',
      );
    }
    if (state.ageEligibility !== '18_PLUS') {
      throw new ForbiddenException('Confirm that you are 18 or older to use authenticated Wasl features.');
    }
    if (state.missingAcceptances.length > 0) {
      throw new ForbiddenException(
        'Accept the current Wasl terms and privacy notice to continue.',
      );
    }
    return true;
  }
}
