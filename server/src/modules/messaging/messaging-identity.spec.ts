import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { messagingConversations, messagingUserMappings } from '../../db/schema';
import { directMessagePair, providerChannelId, providerUserId } from './messaging-identity';

describe('messaging identity mapping', () => {
  it('keeps Wasl user/conversation identifiers distinct from provider identifiers', () => {
    const id = 'a7289f17-c7fe-479e-adff-85716c9a9730';
    expect(providerUserId(id)).toBe('wasl_a7289f17c7fe479eadff85716c9a9730');
    expect(providerChannelId(id)).toBe('wasl_a7289f17c7fe479eadff85716c9a9730');
  });

  it('canonicalizes DM participants and rejects a self-conversation', () => {
    expect(directMessagePair('b', 'a')).toEqual(['a', 'b']);
    expect(directMessagePair('a', 'b')).toEqual(['a', 'b']);
    expect(() => directMessagePair('a', 'a')).toThrow();
  });

  it('persists scoped provider mappings behind RLS', () => {
    const users = getTableConfig(messagingUserMappings);
    const conversations = getTableConfig(messagingConversations);
    expect(users.enableRLS).toBe(true);
    expect(conversations.enableRLS).toBe(true);
    expect(conversations.checks.map((item) => item.name)).toContain(
      'messaging_conversations_kind_check',
    );
    expect(conversations.indexes.map((item) => item.config.name)).toEqual(
      expect.arrayContaining([
        'messaging_conversations_community_unique',
        'messaging_conversations_event_unique',
        'messaging_conversations_dm_pair_unique',
      ]),
    );
  });
});
