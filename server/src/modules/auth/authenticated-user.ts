import type { FastifyRequest } from 'fastify';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETION_PENDING' | 'DEACTIVATED';

export interface AuthenticatedUser {
  /** Stable Wasl identity.users ID, separate from Supabase Auth's user UUID. */
  id: string;
  authUserId: string;
  accountStatus?: AccountStatus;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export function getAuthenticatedUser(request: FastifyRequest): AuthenticatedUser {
  if (!request.user) throw new Error('Authenticated user is unavailable.');
  return request.user;
}
