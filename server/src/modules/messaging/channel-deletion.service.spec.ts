import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import { ChannelDeletionService } from './channel-deletion.service';
import type { StreamChatAdapter } from './stream-chat.adapter';

describe('ChannelDeletionService provider coordination', () => {
  it('retains the deletion row lock on the provider pool, not the API pool', async () => {
    const mainTransaction = vi.fn();
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: () => [{ id: 'conversation-1' }] }) }) }),
      transaction: mainTransaction,
    };
    const forUpdate = vi.fn(() => ({ limit: () => [{ deletedAt: new Date(), providerChannelId: 'channel-1' }] }));
    const tx = {
      select: () => ({ from: () => ({ where: () => ({ for: forUpdate }) }) }),
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    };
    const providerTransaction = vi.fn((work: (transaction: typeof tx) => Promise<void>) => work(tx));
    const stream = { deleteChannel: vi.fn().mockResolvedValue(undefined) };
    const service = new ChannelDeletionService(
      db as unknown as Database, stream as unknown as StreamChatAdapter,
      { transaction: providerTransaction } as unknown as Database,
    );
    await expect(service.process()).resolves.toBe(false);
    expect(forUpdate).toHaveBeenCalledWith('update');
    expect(stream.deleteChannel).toHaveBeenCalledWith('channel-1');
    expect(providerTransaction).toHaveBeenCalledOnce();
    expect(mainTransaction).not.toHaveBeenCalled();
  });
});
