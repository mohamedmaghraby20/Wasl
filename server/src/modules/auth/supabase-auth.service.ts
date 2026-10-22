import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export const SUPABASE_AUTH_CLIENT = Symbol('SUPABASE_AUTH_CLIENT');

export interface VerifiedSupabaseUser {
  authUserId: string;
  email: string;
  emailVerifiedAt: Date | null;
  displayName: string;
}

@Injectable()
export class SupabaseAuthService {
  constructor(private readonly client: Pick<SupabaseClient, 'auth'> | undefined) {}

  async authenticate(accessToken: string): Promise<VerifiedSupabaseUser> {
    if (!this.client) throw new ServiceUnavailableException('Authentication is not configured.');

    let user: User | null;
    try {
      const result = await this.client.auth.getUser(accessToken);
      if (result.error) {
        const status = result.error.status;
        if (status !== undefined && status >= 400 && status < 500 && status !== 429)
          throw new UnauthorizedException('Invalid or expired access token.');
        throw new ServiceUnavailableException('Authentication provider is unavailable.');
      }
      user = result.data.user;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException)
        throw error;
      throw new ServiceUnavailableException('Authentication provider is unavailable.');
    }

    if (!user || !user.email) throw new UnauthorizedException('Invalid or expired access token.');
    return {
      authUserId: user.id,
      email: user.email.trim().toLowerCase(),
      emailVerifiedAt: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
      displayName: displayNameFrom(user),
    };
  }
}

function displayNameFrom(user: User): string {
  const metadata: unknown = user.user_metadata;
  const candidate =
    metadata && typeof metadata === 'object' && 'display_name' in metadata
      ? metadata.display_name
      : undefined;
  if (typeof candidate !== 'string') return 'Wasl member';
  const normalized = [...candidate.trim()]
    .filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127)
    .join('')
    .slice(0, 80);
  return normalized || 'Wasl member';
}
