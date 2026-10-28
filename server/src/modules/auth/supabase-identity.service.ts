import { randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import { authIdentities, profiles, users } from '../../db/schema';
import type { VerifiedSupabaseUser } from './supabase-auth.service';
import { Inject } from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user';

@Injectable()
export class SupabaseIdentityService {
  constructor(@Inject(DATABASE) private readonly db: Database | undefined) {}

  async resolve(authUser: VerifiedSupabaseUser): Promise<AuthenticatedUser> {
    const db = this.database();
    const resolved = await db.transaction(async (tx) => {
      const provider = 'email';
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${provider}), hashtext(${authUser.authUserId}))`,
      );

      const [existingIdentity] = await tx
        .select({ userId: authIdentities.userId })
        .from(authIdentities)
        .where(
          and(
            eq(authIdentities.provider, provider),
            eq(authIdentities.providerUserId, authUser.authUserId),
          ),
        )
        .limit(1);
      let resolvedId = existingIdentity?.userId;

      if (resolvedId) {
        await tx
          .update(users)
          .set({
            normalizedEmail: authUser.email,
            emailVerifiedAt: authUser.emailVerifiedAt,
            updatedAt: new Date(),
          })
          .where(eq(users.id, resolvedId));
      } else {
        resolvedId = randomUUID();
        await tx.insert(users).values({
          id: resolvedId,
          normalizedEmail: authUser.email,
          emailVerifiedAt: authUser.emailVerifiedAt,
        });
        await tx.insert(authIdentities).values({
          userId: resolvedId,
          provider,
          providerUserId: authUser.authUserId,
        });
      }

      const [account] = await tx
        .select({ status: users.accountStatus })
        .from(users)
        .where(eq(users.id, resolvedId))
        .limit(1);
      if (!account || !['ACTIVE', 'DELETION_PENDING'].includes(account.status)) {
        throw new ForbiddenException('This Wasl account is not active.');
      }

      await tx
        .insert(profiles)
        .values({ id: resolvedId, displayName: authUser.displayName })
        .onConflictDoNothing({ target: profiles.id });
      return { id: resolvedId, accountStatus: account.status };
    });
    return { ...resolved, authUserId: authUser.authUserId };
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }
}
