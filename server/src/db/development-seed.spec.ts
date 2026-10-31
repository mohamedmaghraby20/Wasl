import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.module';
import { seedDevelopmentData } from './development-seed';
import { sampleOwnerId } from './development-seed-data';

describe('development seed safety', () => {
  it.each(['real-email', 'auth-mapping'])(
    'refuses a reserved ID with %s before any storage or database writes',
    async (collision) => {
      const results = [
        collision === 'real-email'
          ? [{ id: sampleOwnerId, normalizedEmail: 'real@example.test' }]
          : [],
        collision === 'auth-mapping' ? [{ userId: sampleOwnerId, provider: 'email' }] : [],
      ];
      const query = { from: () => query, where: () => Promise.resolve(results.shift() ?? []) };
      const insert = vi.fn();
      const transaction = vi.fn();
      const database = { select: () => query, insert, transaction } as unknown as Database;
      const from = vi.fn();
      const storage = { storage: { from } } as unknown as SupabaseClient;
      await expect(
        seedDevelopmentData(database, storage, sampleOwnerId, 'Sample Host'),
      ).rejects.toThrow('overlap a real account');
      expect(insert).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
      expect(from).not.toHaveBeenCalled();
    },
  );
});
