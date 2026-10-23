import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  messagingConversations,
  messagingMemberSync,
  messagingReports,
  messagingUserBlocks,
  messagingUserMappings,
} from './schema';

describe('messaging persistence schema', () => {
  it('uses stable provider mappings and private conversation identifiers', () => {
    const users = getTableConfig(messagingUserMappings);
    const conversations = getTableConfig(messagingConversations);
    expect(users.enableRLS).toBe(true);
    expect(users.columns.find((column) => column.name === 'provider_user_id')?.isUnique).toBe(true);
    expect(conversations.enableRLS).toBe(true);
    expect(conversations.checks.map((entry) => entry.name)).toContain(
      'messaging_conversations_kind_check',
    );
    expect(conversations.indexes.map((entry) => entry.config.name)).toEqual(
      expect.arrayContaining([
        'messaging_conversations_community_unique',
        'messaging_conversations_event_unique',
        'messaging_conversations_dm_pair_unique',
      ]),
    );
  });

  it('persists desired/provider access state, blocks and scoped reports behind RLS', () => {
    const sync = getTableConfig(messagingMemberSync);
    const blocks = getTableConfig(messagingUserBlocks);
    const reports = getTableConfig(messagingReports);
    expect(sync.enableRLS).toBe(true);
    expect(sync.primaryKeys[0]?.columns.map((column) => column.name)).toEqual([
      'conversation_id',
      'user_id',
    ]);
    expect(blocks.enableRLS).toBe(true);
    expect(blocks.checks.map((entry) => entry.name)).toContain('messaging_user_blocks_not_self');
    expect(reports.enableRLS).toBe(true);
    expect(reports.checks.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(['messaging_reports_reason_length', 'messaging_reports_target_check']),
    );
  });
});
