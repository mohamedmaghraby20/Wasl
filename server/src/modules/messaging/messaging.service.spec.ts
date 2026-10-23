import type { ConfigService } from '@nestjs/config';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../db/database.module';
import { MessagingService } from './messaging.service';
import { StreamChatAdapter } from './stream-chat.adapter';
import type { CommunitiesService } from '../communities/communities.service';
import type { EventsService } from '../events/events.service';

const user = { id: 'a7289f17-c7fe-479e-adff-85716c9a9730', authUserId: 'auth-1' };

function mockSelect(responses: unknown[][]) {
  const select = vi.fn(() => {
    const builder: {
      from: () => typeof builder;
      innerJoin: () => typeof builder;
      where: () => typeof builder;
      limit: () => Promise<unknown[]>;
      then: (
        resolve: (value: unknown[]) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise<unknown>;
    } = {
      from: () => builder,
      innerJoin: () => builder,
      where: () => builder,
      limit: () => Promise.resolve(responses.shift() ?? []),
      then: (resolve, reject) => Promise.resolve(responses.shift() ?? []).then(resolve, reject),
    };
    return builder;
  });
  return select;
}

describe('messaging token boundary', () => {
  it('fails closed until channel permissions have been checked', async () => {
    const config = { get: () => 'false' } as unknown as ConfigService;
    const stream = { upsertUser: vi.fn(), token: vi.fn() };
    const service = new MessagingService(
      undefined,
      config,
      stream as unknown as StreamChatAdapter,
      undefined!,
      undefined!,
    );
    await expect(service.session(user)).rejects.toThrow(ServiceUnavailableException);
    expect(stream.upsertUser).not.toHaveBeenCalled();
    expect(stream.token).not.toHaveBeenCalled();
  });

  it('keeps the secret on the server and expires tokens after fifteen minutes', () => {
    const config = {
      get: (key: string) =>
        ({ STREAM_API_KEY: 'test-key', STREAM_API_SECRET: 'test-secret' })[
          key as 'STREAM_API_KEY' | 'STREAM_API_SECRET'
        ],
    } as unknown as ConfigService;
    const adapter = new StreamChatAdapter(config);
    const issued = adapter.token('wasl_user');
    const payload = JSON.parse(
      Buffer.from(issued.token.split('.')[1]!, 'base64url').toString(),
    ) as { user_id: string; exp: number; iat: number };
    expect(payload.user_id).toBe('wasl_user');
    expect(payload.exp - payload.iat).toBe(900);
    expect(issued).not.toHaveProperty('secret');
    expect(adapter.apiKey).toBe('test-key');
  });

  it('uses the Wasl user mapping when a configured session is requested', async () => {
    const config = { get: () => 'true' } as unknown as ConfigService;
    const insert = vi.fn(() => ({
      values: () => ({
        onConflictDoNothing: () => Promise.resolve(),
        onConflictDoUpdate: () => Promise.resolve(),
      }),
    }));
    const select = mockSelect([[], [{ name: 'Mariam' }]]);
    const db = { insert, select } as unknown as Database;
    const stream = {
      apiKey: 'public-key',
      upsertUser: vi.fn(() => Promise.resolve()),
      token: vi.fn(() => ({ token: 'signed-token', expiresAt: '2026-10-22T15:00:00Z' })),
    };
    const service = new MessagingService(
      db,
      config,
      stream as unknown as StreamChatAdapter,
      undefined!,
      undefined!,
    );
    expect(await service.session(user)).toEqual({
      apiKey: 'public-key',
      userId: 'wasl_a7289f17c7fe479eadff85716c9a9730',
      token: 'signed-token',
      expiresAt: '2026-10-22T15:00:00Z',
    });
    expect(stream.upsertUser).toHaveBeenCalledWith(
      'wasl_a7289f17c7fe479eadff85716c9a9730',
      'Mariam',
    );
  });

  it.each([
    ['community', 'PENDING'],
    ['community', 'WAITLISTED'],
    ['community', 'REMOVED'],
    ['event', 'PENDING'],
    ['event', 'REJECTED'],
    ['event', 'REMOVED_BY_ORGANIZER'],
  ] as const)(
    'denies %s channel access to a %s participant before provisioning',
    async (kind, status) => {
      const responses = [
        [{ id: 'resource-1' }],
        [{ status: 'ACTIVE' }],
        [{ closed: false }],
        [{ status }],
      ];
      const select = mockSelect(responses);
      const insert = vi.fn();
      const db = { select, insert } as unknown as Database;
      const config = { get: () => 'true' } as unknown as ConfigService;
      const stream = {
        upsertUser: vi.fn(),
        ensureChannel: vi.fn(),
        addMember: vi.fn(),
      };
      const manager = {
        assertCanManage: () => Promise.reject(new ForbiddenException()),
      } as unknown as CommunitiesService;
      const eventManager = {
        assertCanManageById: () => Promise.reject(new ForbiddenException()),
      } as unknown as EventsService;
      const service = new MessagingService(
        db,
        config,
        stream as unknown as StreamChatAdapter,
        manager,
        eventManager,
      );
      await expect(service.openResourceChannel(user, kind, 'resource-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(insert).not.toHaveBeenCalled();
      expect(stream.upsertUser).not.toHaveBeenCalled();
      expect(stream.addMember).not.toHaveBeenCalled();
    },
  );

  it('provisions an accepted Event attendee in the mapped channel', async () => {
    const responses = [
      [{ id: 'event-1' }],
      [{ status: 'ACTIVE' }],
      [{ closed: false }],
      [{ status: 'ACCEPTED' }],
      [{ name: 'Mariam' }],
      [{ id: 'conversation-1', channelId: 'wasl_conversation1' }],
      [{ status: 'ACTIVE' }],
      [{ closed: false }],
      [{ status: 'ACCEPTED' }],
    ];
    const select = mockSelect(responses);
    const insert = vi.fn(() => ({
      values: () => ({
        onConflictDoNothing: () => Promise.resolve(),
        onConflictDoUpdate: () => Promise.resolve(),
      }),
    }));
    const db = { select, insert } as unknown as Database;
    const config = { get: () => 'true' } as unknown as ConfigService;
    const stream = {
      upsertUser: vi.fn(() => Promise.resolve()),
      ensureChannel: vi.fn(() => Promise.resolve()),
      setMemberRole: vi.fn(() => Promise.resolve()),
      addMember: vi.fn(() => Promise.resolve()),
      removeMember: vi.fn(() => Promise.resolve()),
    };
    const eventManager = {
      assertCanManageById: () => Promise.reject(new ForbiddenException()),
    } as unknown as EventsService;
    const service = new MessagingService(
      db,
      config,
      stream as unknown as StreamChatAdapter,
      undefined!,
      eventManager,
    );
    expect(await service.openResourceChannel(user, 'event', 'event-1')).toEqual({
      conversationId: 'conversation-1',
      channelId: 'wasl_conversation1',
      channelType: 'messaging',
    });
    expect(stream.ensureChannel).toHaveBeenCalledWith('wasl_conversation1');
    expect(stream.setMemberRole).toHaveBeenCalledWith(
      'wasl_conversation1',
      'wasl_a7289f17c7fe479eadff85716c9a9730',
      false,
    );
    expect(stream.removeMember).not.toHaveBeenCalled();
  });
});
