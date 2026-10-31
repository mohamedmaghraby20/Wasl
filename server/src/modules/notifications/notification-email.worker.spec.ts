import type { ConfigService } from '@nestjs/config';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import { NotificationEmailWorker } from './notification-email.worker';
import type { ResendEmailAdapter } from './resend-email.adapter';

function setup() {
  const delivery = {
    status: 'PENDING', attemptCount: 0, nextAttemptAt: new Date(0), recipient: 'member@example.test',
    accountStatus: 'ACTIVE', communitySlug: 'local-circle', eventSlug: null, organizationSlug: null,
    lastError: null as string | null, providerMessageId: null as string | null,
  };
  let openTransactions = 0;
  const commands: string[] = [];
  const execute = vi.fn((query: SQL) => {
    commands.push(new PgDialect().sqlToQuery(query).sql);
    return Promise.resolve({ rows: [{ msg_id: '1', message: { notification_id: 'notice-1' } }] });
  });
  const tx = {
    execute,
    select: () => {
      const builder = {
        from: () => builder, innerJoin: () => builder, leftJoin: () => builder,
        where: () => builder, for: () => builder, limit: () => Promise.resolve([{ ...delivery }]),
      };
      return builder;
    },
    update: () => ({ set: (changes: Record<string, unknown>) => ({ where: (condition: SQL) => {
      const { params } = new PgDialect().sqlToQuery(condition);
      const apply = () => {
        if (params.length === 3 && (params[1] !== delivery.attemptCount || params[2] !== delivery.status)) return [];
        Object.assign(delivery, changes);
        return [{ id: 'notice-1' }];
      };
      return { then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(apply()).then(resolve), returning: () => Promise.resolve(apply()) };
    } }) }),
  };
  const transaction = vi.fn(async (work: (transaction: typeof tx) => Promise<unknown>) => {
    openTransactions++;
    try { return await work(tx); } finally { openTransactions--; }
  });
  const db = { execute, transaction } as unknown as Database;
  const send = vi.fn<(input: { id: string }) => Promise<string>>().mockResolvedValue('provider-id');
  const worker = () => new NotificationEmailWorker(
    db, { get: () => 'https://app.example.test' } as unknown as ConfigService,
    { send } as unknown as ResendEmailAdapter,
  );
  return { delivery, commands, transaction, send, worker, openTransactions: () => openTransactions };
}

describe('NotificationEmailWorker delivery lease', () => {
  it('releases its transaction during sending and prevents another worker from sending the same delivery', async () => {
    const fixture = setup();
    let finishSend!: (id: string) => void;
    fixture.send.mockImplementation(() => {
      expect(fixture.openTransactions()).toBe(0);
      return new Promise((resolve) => { finishSend = resolve; });
    });
    const pending = fixture.worker().processPending();
    await vi.waitFor(() => expect(fixture.send).toHaveBeenCalledOnce());
    expect(fixture.delivery.attemptCount).toBe(1);
    expect(fixture.delivery.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    await fixture.worker().processPending();
    expect(fixture.send).toHaveBeenCalledOnce();
    finishSend('provider-id');
    await pending;
    expect(fixture.delivery.status).toBe('SENT');
    expect(fixture.delivery.providerMessageId).toBe('provider-id');
    expect(fixture.commands.some((query) => query.includes('pgmq.archive'))).toBe(true);
  });

  it('schedules failed sends and retries with the same provider idempotency key', async () => {
    const fixture = setup();
    fixture.send.mockRejectedValueOnce(new Error('Provider unavailable'));
    await fixture.worker().processPending();
    expect(fixture.delivery.status).toBe('RETRY');
    expect(fixture.delivery.attemptCount).toBe(1);
    expect(fixture.delivery.lastError).toContain('retry scheduled');
    fixture.delivery.nextAttemptAt = new Date(0);
    await fixture.worker().processPending();
    expect(fixture.delivery.status).toBe('SENT');
    expect(fixture.delivery.attemptCount).toBe(2);
    expect(fixture.send.mock.calls.map(([input]) => input.id)).toEqual(['notice-1', 'notice-1']);
  });

  it('does not overwrite or archive a newer attempt when a stale send finishes', async () => {
    const fixture = setup();
    let finishSend!: (id: string) => void;
    fixture.send.mockImplementation(() => new Promise((resolve) => { finishSend = resolve; }));
    const pending = fixture.worker().processPending();
    await vi.waitFor(() => expect(fixture.send).toHaveBeenCalledOnce());
    fixture.delivery.attemptCount++;
    finishSend('stale-provider-id');
    await pending;
    expect(fixture.delivery.status).toBe('RETRY');
    expect(fixture.delivery.providerMessageId).toBeNull();
    expect(fixture.commands.some((query) => query.includes('pgmq.archive'))).toBe(false);
  });

  it('leaves a recoverable lease if completion cannot be persisted', async () => {
    const fixture = setup();
    fixture.send.mockImplementation(() => {
      fixture.transaction.mockRejectedValueOnce(new Error('Database unavailable'));
      return Promise.resolve('provider-id');
    });
    await fixture.worker().processPending();
    expect(fixture.delivery.status).toBe('RETRY');
    expect(fixture.delivery.attemptCount).toBe(1);
    expect(fixture.delivery.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(fixture.commands.some((query) => query.includes('pgmq.archive'))).toBe(false);
  });

  it('suppresses suspended recipients before claiming or sending', async () => {
    const fixture = setup();
    fixture.delivery.accountStatus = 'SUSPENDED';
    await fixture.worker().processPending();
    expect(fixture.send).not.toHaveBeenCalled();
    expect(fixture.delivery.status).toBe('FAILED');
    expect(fixture.delivery.attemptCount).toBe(0);
  });
});
