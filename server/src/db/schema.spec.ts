import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  organizationAdminInvitations,
  organizationAdmins,
  organizationVerificationRequests,
  organizations,
} from './schema';

describe('organization ownership schema', () => {
  it('requires one current owner and enables RLS', () => {
    const config = getTableConfig(organizations);
    const owner = config.columns.find((column) => column.name === 'owner_user_id');
    const publicColumns = config.columns.map((column) => column.name);

    expect(owner?.notNull).toBe(true);
    expect(publicColumns).toEqual(
      expect.arrayContaining([
        'slug',
        'name',
        'description',
        'type',
        'city_id',
        'location_name',
        'website_url',
        'social_url',
        'logo_path',
        'verification_status',
      ]),
    );
    expect(config.indexes.map((index) => index.config.name)).toContain(
      'organizations_owner_user_id_idx',
    );
    expect(config.indexes.map((index) => index.config.name)).toContain('organizations_city_id_idx');
    expect(config.enableRLS).toBe(true);
  });

  it('uses one scoped Admin association per organization and user', () => {
    const config = getTableConfig(organizationAdmins);

    expect(config.primaryKeys).toHaveLength(1);
    expect(config.primaryKeys[0]?.columns.map((column) => column.name)).toEqual([
      'organization_id',
      'user_id',
    ]);
    expect(config.indexes.map((index) => index.config.name)).toContain(
      'organization_admins_user_id_idx',
    );
    expect(config.enableRLS).toBe(true);
  });

  it('stores only hashed, expiring, single-use Admin invitations behind RLS', () => {
    const config = getTableConfig(organizationAdminInvitations);
    const columns = config.columns.map((column) => column.name);
    const indexes = config.indexes.map((index) => index.config.name);

    expect(columns).toEqual(
      expect.arrayContaining([
        'organization_id',
        'target_user_id',
        'invited_by_user_id',
        'token_hash',
        'expires_at',
        'status',
        'responded_at',
      ]),
    );
    expect(indexes).toContain('organization_admin_invitations_token_hash_unique');
    expect(indexes).toContain('organization_admin_invitations_target_status_expiry_idx');
    expect(config.checks).toHaveLength(4);
    expect(config.enableRLS).toBe(true);
  });

  it('stores platform-reviewed verification requests behind RLS with one pending request', () => {
    const config = getTableConfig(organizationVerificationRequests);
    const columns = config.columns.map((column) => column.name);
    const indexes = config.indexes.map((index) => index.config.name);
    const pendingIndex = config.indexes.find(
      (index) => index.config.name === 'organization_verification_requests_pending_unique',
    );

    expect(columns).toEqual(
      expect.arrayContaining([
        'organization_id',
        'requested_by_user_id',
        'status',
        'request_note',
        'decision_note',
        'decided_by_user_id',
        'decided_at',
      ]),
    );
    expect(indexes).toContain('organization_verification_requests_org_created_idx');
    expect(indexes).toContain('organization_verification_requests_status_created_idx');
    expect(pendingIndex?.config.where).toBeDefined();
    expect(config.checks.map((check) => check.name)).toEqual(
      expect.arrayContaining([
        'organization_verification_requests_request_note_length',
        'organization_verification_requests_decision_note_length',
        'organization_verification_requests_decision_matches_status',
      ]),
    );
    expect(config.enableRLS).toBe(true);
  });
});
