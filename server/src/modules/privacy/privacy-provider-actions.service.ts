import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { and, eq, inArray } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import {
  authIdentities,
  messagingUserMappings,
  privacyProviderActions,
  privacyRequestEvents,
  privacyRequests,
} from '../../db/schema';
import { StreamChatAdapter } from '../messaging/stream-chat.adapter';

export const SUPABASE_ADMIN_CLIENT = Symbol('SUPABASE_ADMIN_CLIENT');

const PHOTO_BUCKET = 'profile-photos';
const RETRYABLE_STATUSES = ['PENDING', 'FAILED', 'IN_PROGRESS'] as const;

type ProviderAction = typeof privacyProviderActions.$inferSelect;

/**
 * Executes the processor-side steps of an approved deletion and records each outcome. A request is
 * only completed when every processor step succeeded or was provably unnecessary.
 */
@Injectable()
export class PrivacyProviderActionsService {
  private readonly logger = new Logger(PrivacyProviderActionsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabase: SupabaseClient | undefined,
    private readonly stream: StreamChatAdapter,
  ) {}

  async process(requestId: string, deciderUserId: string) {
    const db = this.database();
    const actions = await db
      .select()
      .from(privacyProviderActions)
      .where(
        and(
          eq(privacyProviderActions.requestId, requestId),
          inArray(privacyProviderActions.status, [...RETRYABLE_STATUSES]),
        ),
      );

    for (const action of actions) await this.run(action);

    const all = await db
      .select()
      .from(privacyProviderActions)
      .where(eq(privacyProviderActions.requestId, requestId));
    const unresolved = all.filter((action) => !['SUCCEEDED', 'SKIPPED'].includes(action.status));
    const now = new Date();

    if (unresolved.length === 0) {
      await db
        .update(privacyRequests)
        .set({
          status: 'COMPLETED',
          completedAt: now,
          decidedByUserId: deciderUserId,
          decidedAt: now,
          updatedAt: now,
        })
        .where(eq(privacyRequests.id, requestId));
      await this.recordEvent(
        requestId,
        deciderUserId,
        'COMPLETED',
        'All processor actions completed; request closed.',
      );
    } else {
      await db
        .update(privacyRequests)
        .set({ status: 'PENDING_PROVIDER', updatedAt: now })
        .where(eq(privacyRequests.id, requestId));
      await this.recordEvent(
        requestId,
        deciderUserId,
        'PROVIDER_ACTIONS_INCOMPLETE',
        `${unresolved.length} processor action(s) still need attention.`,
      );
    }

    return this.load(requestId);
  }

  async load(requestId: string) {
    const db = this.database();
    const [request] = await db
      .select()
      .from(privacyRequests)
      .where(eq(privacyRequests.id, requestId))
      .limit(1);
    const actions = await db
      .select()
      .from(privacyProviderActions)
      .where(eq(privacyProviderActions.requestId, requestId));
    return { request, actions };
  }

  private async run(action: ProviderAction): Promise<void> {
    const db = this.database();
    const now = new Date();
    await db
      .update(privacyProviderActions)
      .set({
        status: 'IN_PROGRESS',
        attemptCount: action.attemptCount + 1,
        lastAttemptAt: now,
        lastError: null,
      })
      .where(eq(privacyProviderActions.id, action.id));

    try {
      const outcome = await this.execute(action);
      await db
        .update(privacyProviderActions)
        .set({
          status: outcome === 'skipped' ? 'SKIPPED' : 'SUCCEEDED',
          completedAt: outcome === 'skipped' ? null : new Date(),
          lastError: null,
        })
        .where(eq(privacyProviderActions.id, action.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processor action failed.';
      this.logger.warn(
        `Privacy processor action ${action.provider}/${action.action} failed for request ${action.requestId}.`,
      );
      await db
        .update(privacyProviderActions)
        .set({ status: 'FAILED', lastError: message.slice(0, 2000) })
        .where(eq(privacyProviderActions.id, action.id));
    }
  }

  private async execute(action: ProviderAction): Promise<'done' | 'skipped'> {
    const request = await this.requestUser(action.requestId);
    if (!request) throw new Error('The privacy request user is unavailable.');

    switch (`${action.provider}:${action.action}`) {
      case 'WASL:ANONYMIZE_WASL_DATA':
        return 'done';
      case 'SUPABASE_AUTH:DELETE_AUTH_USER': {
        const authUserId = await this.authUserId(request.userId);
        if (!authUserId) return 'skipped';
        const client = this.adminClient();
        const { error } = await client.auth.admin.deleteUser(authUserId);
        if (error && error.status !== 404) throw new Error(authError(error.message));
        return 'done';
      }
      case 'SUPABASE_STORAGE:DELETE_PROFILE_OBJECTS': {
        const authUserId = await this.authUserId(request.userId);
        if (!authUserId) return 'skipped';
        const client = this.adminClient();
        const { data, error } = await client.storage.from(PHOTO_BUCKET).list(authUserId);
        if (error) throw new Error(error.message);
        if (!data?.length) return 'skipped';
        const paths = data.map((object) => `${authUserId}/${object.name}`);
        const removal = await client.storage.from(PHOTO_BUCKET).remove(paths);
        if (removal.error) throw new Error(removal.error.message);
        return 'done';
      }
      case 'STREAM:DEACTIVATE_USER': {
        const [mapping] = await this.database()
          .select({ providerUserId: messagingUserMappings.providerUserId })
          .from(messagingUserMappings)
          .where(eq(messagingUserMappings.userId, request.userId))
          .limit(1);
        if (!mapping) return 'skipped';
        await this.stream.deactivateUser(mapping.providerUserId);
        return 'done';
      }
      default:
        throw new Error(`Unknown processor action ${action.provider}/${action.action}.`);
    }
  }

  private async requestUser(requestId: string) {
    const [row] = await this.database()
      .select({ userId: privacyRequests.userId })
      .from(privacyRequests)
      .where(eq(privacyRequests.id, requestId))
      .limit(1);
    return row;
  }

  private async authUserId(userId: string): Promise<string | undefined> {
    const [row] = await this.database()
      .select({ providerUserId: authIdentities.providerUserId })
      .from(authIdentities)
      .where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, 'email')))
      .limit(1);
    return row?.providerUserId;
  }

  private adminClient(): SupabaseClient {
    if (!this.supabase) {
      throw new ServiceUnavailableException('Supabase administration is not configured.');
    }
    return this.supabase;
  }

  private async recordEvent(
    requestId: string,
    actorUserId: string,
    eventType: string,
    note: string,
  ): Promise<void> {
    await this.database().insert(privacyRequestEvents).values({
      requestId,
      actorUserId,
      actorRole: 'ADMIN',
      eventType,
      note,
    });
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }
}

function authError(message: string): string {
  return message || 'Supabase Auth deletion failed.';
}
