import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { DATABASE, PROVIDER_DATABASE, type Database } from '../../db/database.module';
import { messagingConversations } from '../../db/schema';
import { StreamChatAdapter } from './stream-chat.adapter';

@Injectable()
export class ChannelDeletionService {
  private readonly logger = new Logger(ChannelDeletionService.name);
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly stream: StreamChatAdapter,
    @Inject(PROVIDER_DATABASE) private readonly providerDb?: Database,
  ) {}

  async process(ids?: string[]): Promise<boolean> {
    if (!this.db) return false;
    if (ids?.length === 0) return false;
    const pending = await this.db
      .select({ id: messagingConversations.id })
      .from(messagingConversations)
      .where(
        and(
          isNotNull(messagingConversations.deletedAt),
          isNull(messagingConversations.providerDeletedAt),
          ids ? inArray(messagingConversations.id, ids) : undefined,
        ),
      )
      .limit(100);
    let incomplete = false;
    for (const { id } of pending) {
      try {
        await (this.providerDb ?? this.db).transaction(async (tx) => {
          const [conversation] = await tx
            .select()
            .from(messagingConversations)
            .where(
              and(
                eq(messagingConversations.id, id),
                isNull(messagingConversations.providerDeletedAt),
              ),
            )
            .for('update')
            .limit(1);
          if (!conversation?.deletedAt) return;
          await this.stream.deleteChannel(conversation.providerChannelId);
          await tx
            .update(messagingConversations)
            .set({ providerDeletedAt: new Date() })
            .where(eq(messagingConversations.id, id));
        });
      } catch {
        incomplete = true;
        this.logger.warn('A deleted resource chat channel remains queued for deletion.');
      }
    }
    if (ids) {
      const remaining = await this.db
        .select({ id: messagingConversations.id })
        .from(messagingConversations)
        .where(
          and(
            inArray(messagingConversations.id, ids),
            isNotNull(messagingConversations.deletedAt),
            isNull(messagingConversations.providerDeletedAt),
          ),
        );
      return remaining.length > 0;
    }
    return incomplete;
  }
}
