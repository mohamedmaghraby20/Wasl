import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { notificationEmailDeliveries, notifications } from './schema';

describe('notification persistence schema', () => {
  it('deduplicates a recipient event and supports owned unread lists', () => {
    const table = getTableConfig(notifications);
    expect(table.enableRLS).toBe(true);
    expect(table.indexes.map((entry) => entry.config.name)).toEqual(
      expect.arrayContaining([
        'notifications_recipient_event_unique',
        'notifications_recipient_created_idx',
        'notifications_recipient_unread_idx',
      ]),
    );
    expect(
      table.indexes.find((entry) => entry.config.name === 'notifications_recipient_event_unique')
        ?.config.unique,
    ).toBe(true);
    expect(table.columns.find((column) => column.name === 'read_at')?.notNull).toBe(false);
    expect(table.checks.map((entry) => entry.name)).toContain('notifications_context_type_check');
  });

  it('tracks one private email delivery and retry status per notification', () => {
    const table = getTableConfig(notificationEmailDeliveries);
    expect(table.enableRLS).toBe(true);
    expect(table.columns.find((column) => column.name === 'notification_id')?.primary).toBe(true);
    expect(table.indexes.map((entry) => entry.config.name)).toContain(
      'notification_email_deliveries_due_idx',
    );
    expect(table.checks.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        'notification_email_deliveries_status_check',
        'notification_email_deliveries_attempt_count_check',
        'notification_email_deliveries_sent_check',
      ]),
    );
  });
});
