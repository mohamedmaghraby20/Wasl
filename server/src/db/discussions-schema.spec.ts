import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { discussionPosts, discussionThreads } from './schema';

describe('persistent discussion schema', () => {
  it('allows only one event thread and stores community topics separately', () => {
    const config = getTableConfig(discussionThreads);

    expect(config.enableRLS).toBe(true);
    expect(config.indexes.map((index) => index.config.name)).toContain(
      'discussion_threads_event_unique',
    );
    expect(config.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        'discussion_threads_parent_check',
        'discussion_threads_title_length',
        'discussion_threads_body_length',
      ]),
    );
  });

  it('constrains replies to a top-level post in the same thread', () => {
    const config = getTableConfig(discussionPosts);

    expect(config.enableRLS).toBe(true);
    expect(config.uniqueConstraints.map((constraint) => constraint.name)).toContain(
      'discussion_posts_parent_target_unique',
    );
    expect(config.foreignKeys.map((key) => key.getName())).toContain(
      'discussion_posts_root_parent_fk',
    );
    expect(config.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        'discussion_posts_reply_depth_check',
        'discussion_posts_body_length',
        'discussion_posts_deletion_check',
      ]),
    );
  });
});
