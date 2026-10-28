import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import type { Database } from '../src/db/database.module';
import type { StreamChatAdapter } from '../src/modules/messaging/stream-chat.adapter';
import { PrivacyGateService } from '../src/modules/auth/privacy-gate.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { PrivacyProviderActionsService } from '../src/modules/privacy/privacy-provider-actions.service';
import { PrivacyService } from '../src/modules/privacy/privacy.service';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for privacy checks.');
const rollback = new Error('Rollback privacy fixtures');
const publishedVersion = '9.9-test';
const documentHash = 'a'.repeat(64);

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await assert.rejects(
      drizzle(pool, { schema }).transaction(async (tx) => {
        const database = tx as unknown as Database;
        const adult = randomUUID();
        const minor = randomUUID();
        const admin = randomUUID();
        for (const [id, label] of [
          [adult, 'adult'],
          [minor, 'minor'],
          [admin, 'admin'],
        ] as const) {
          await tx.execute(
            sql`insert into identity.users (id, normalized_email) values (${id}, ${`privacy-${label}-${id}@example.test`})`,
          );
          await tx.insert(schema.profiles).values({ id, displayName: `Privacy ${label}` });
        }

        const config = new ConfigService({ AGE_VERIFICATION_METHOD: 'TEST_CONFIRMATION' });
        const gate = new PrivacyGateService(database);
        const stream = {
          deactivateUser: (): Promise<void> => {
            throw new Error('Stream provider unavailable');
          },
        } as unknown as StreamChatAdapter;
        const providerActions = new PrivacyProviderActionsService(database, undefined, stream);
        const privacy = new PrivacyService(
          database,
          config,
          gate,
          providerActions,
          new NotificationsService(database),
        );

        // Gate: absent evidence means UNVERIFIED, and a published document must be accepted.
        const initial = await privacy.status(adult);
        assert.equal(initial.ageEligibility, 'UNVERIFIED');
        assert.equal(initial.requiresOnboarding, true);
        assert.equal(initial.ageVerificationMethod, 'TEST_CONFIRMATION');

        await tx.insert(schema.legalDocuments).values({
          type: 'TERMS_OF_USE',
          version: publishedVersion,
          locale: 'en',
          status: 'PUBLISHED',
          content: 'Test terms text. Not an approved legal notice.',
          contentHash: documentHash,
          approvedBy: 'Test reviewer',
          approvedAt: new Date(),
          publishedAt: new Date(),
        });
        const withDocument = await privacy.status(adult);
        assert.equal(withDocument.documents.length, 1);
        assert.equal((await gate.stateFor(adult)).missingAcceptances.length, 1);

        await assert.rejects(
          privacy.accept(adult, { documentType: 'TERMS_OF_USE', version: '0.0-missing' }),
          /No approved published document/,
        );
        await privacy.accept(adult, {
          documentType: 'TERMS_OF_USE',
          version: publishedVersion,
        });
        assert.deepEqual((await gate.stateFor(adult)).missingAcceptances, []);

        // Under-18 declarations are recorded as a restriction, never as an adult account.
        const minorStatus = await privacy.declareAge(minor, false);
        assert.equal(minorStatus.ageEligibility, 'UNDER_18');
        assert.equal((await gate.stateFor(minor)).ageEligibility, 'UNDER_18');
        const adultStatus = await privacy.declareAge(adult, true);
        assert.equal(adultStatus.ageEligibility, '18_PLUS');
        assert.equal((await gate.stateFor(adult)).requiresOnboarding, false);

        // Access request: due date tracks the 30-day KVKK response baseline.
        const access = await privacy.createRequest(adult, {
          requestType: 'ACCESS',
          note: 'Please send my data.',
        });
        assert.equal(access.status, 'RECEIVED');
        assert.equal(access.events?.length, 1);
        const dueDays = (new Date(access.dueAt).getTime() - Date.now()) / 86_400_000;
        assert.ok(dueDays > 29 && dueDays < 31, `unexpected due date window ${dueDays}`);
        assert.ok(access.identityVerifiedAt);

        const completedAccess = await privacy.decideRequest(admin, access.id, {
          action: 'APPROVE',
          note: 'Export available.',
        });
        assert.equal(completedAccess.status, 'COMPLETED');
        assert.equal(completedAccess.decidedByUserId, admin);
        assert.ok(completedAccess.completedAt);

        // A decision must reach the requester in-app only; no email is queued for a case update.
        const decisionNotice = (
          await tx
            .select()
            .from(schema.notifications)
            .where(
              and(
                eq(schema.notifications.recipientUserId, adult),
                eq(schema.notifications.type, 'privacy_request_decided'),
              ),
            )
        )[0];
        assert.equal(decisionNotice?.contextType, 'privacy');
        assert.equal(decisionNotice?.contextId, access.id);
        const decisionEmail = (
          await tx
            .select()
            .from(schema.notificationEmailDeliveries)
            .where(
              eq(
                schema.notificationEmailDeliveries.notificationId,
                decisionNotice?.id ?? 'missing',
              ),
            )
        )[0];
        assert.equal(decisionEmail, undefined);

        const correction = await privacy.createRequest(adult, {
          requestType: 'CORRECTION',
          note: 'My display name is misspelled.',
        });
        await privacy.decideRequest(admin, correction.id, {
          action: 'REJECT',
          note: 'Please identify the field to correct.',
        });
        const rejectionNotice = (
          await tx
            .select()
            .from(schema.notifications)
            .where(
              and(
                eq(schema.notifications.recipientUserId, adult),
                eq(schema.notifications.contextId, correction.id),
              ),
            )
        )[0];
        assert.ok(rejectionNotice, 'a rejection should notify the requester');

        // A user who still owns an organization cannot start deletion.
        const organizationId = randomUUID();
        await tx.insert(schema.organizations).values({
          id: organizationId,
          ownerUserId: adult,
          slug: `privacy-org-${organizationId}`,
          name: 'Privacy Test Organization',
          description: 'Fixture',
          type: 'community',
        });
        await assert.rejects(
          privacy.createRequest(adult, { requestType: 'DELETION' }),
          /Transfer ownership/,
        );
        await tx
          .update(schema.organizations)
          .set({ ownerUserId: admin })
          .where(eq(schema.organizations.id, organizationId));

        // Cancelling a deletion request restores account activity.
        const cancellable = await privacy.createRequest(adult, { requestType: 'DELETION' });
        assert.equal(
          (
            await tx
              .select({ status: schema.users.accountStatus })
              .from(schema.users)
              .where(eq(schema.users.id, adult))
          )[0]?.status,
          'DELETION_PENDING',
        );
        const cancelled = await privacy.cancelRequest(adult, cancellable.id);
        assert.equal(cancelled.status, 'CANCELLED');
        assert.equal(
          (
            await tx
              .select({ status: schema.users.accountStatus })
              .from(schema.users)
              .where(eq(schema.users.id, adult))
          )[0]?.status,
          'ACTIVE',
        );

        // Fixtures for deletion side effects.
        const communityId = randomUUID();
        await tx.execute(sql`insert into public.communities
          (id, slug, name, description, city_id, owner_type, owner_id, created_by_user_id, host_name, admission_mode)
          values (${communityId}, ${communityId}, 'Privacy deletion community', '', 'ankara', 'user', ${adult}, ${adult}, 'Privacy Adult', 'open')`);
        const eventId = randomUUID();
        await tx.execute(sql`insert into public.events
          (id, slug, title, description, host_type, host_id, created_by_user_id, host_name, online, starts_at, admission_mode)
          values (${eventId}, ${eventId}, 'Privacy deletion event', '', 'user', ${adult}, ${adult}, 'Privacy Adult', true, '2099-01-01T00:00:00Z', 'instant')`);
        await tx
          .insert(schema.communityMemberships)
          .values({ communityId, userId: adult, status: 'ACTIVE' });
        await tx
          .insert(schema.eventRegistrations)
          .values({ eventId, userId: adult, status: 'ACCEPTED' });
        await tx.insert(schema.messagingUserMappings).values({
          userId: adult,
          providerUserId: `stream-${adult}`,
        });

        const deletion = await privacy.createRequest(adult, {
          requestType: 'DELETION',
          note: 'Delete my account.',
        });
        const approved = await privacy.decideRequest(admin, deletion.id, {
          action: 'APPROVE',
          note: 'Approved after identity check.',
        });
        assert.equal(approved.status, 'PENDING_PROVIDER');
        assert.equal(approved.completedAt, null);
        const streamAction = approved.providerActions?.find(
          (action) => action.provider === 'STREAM',
        );
        assert.equal(streamAction?.status, 'FAILED');
        assert.match(streamAction?.lastError ?? '', /Stream provider unavailable/);
        assert.equal(
          approved.providerActions?.find((action) => action.provider === 'WASL')?.status,
          'SUCCEEDED',
        );

        const anonymized = (
          await tx
            .select({
              status: schema.users.accountStatus,
              email: schema.users.normalizedEmail,
              displayName: schema.profiles.displayName,
              avatarPath: schema.profiles.avatarPath,
            })
            .from(schema.users)
            .innerJoin(schema.profiles, eq(schema.profiles.id, schema.users.id))
            .where(eq(schema.users.id, adult))
        )[0];
        assert.equal(anonymized?.status, 'DEACTIVATED');
        assert.equal(anonymized?.displayName, 'Deleted member');
        assert.equal(anonymized?.avatarPath, null);
        assert.match(anonymized?.email ?? '', /@deleted\.invalid$/);
        assert.equal(
          (
            await tx
              .select({ archived: schema.communities.archived })
              .from(schema.communities)
              .where(eq(schema.communities.id, communityId))
          )[0]?.archived,
          true,
        );
        assert.equal(
          (
            await tx
              .select({ cancelled: schema.events.cancelled })
              .from(schema.events)
              .where(eq(schema.events.id, eventId))
          )[0]?.cancelled,
          true,
        );
        assert.equal(
          (
            await tx
              .select({ status: schema.communityMemberships.status })
              .from(schema.communityMemberships)
              .where(eq(schema.communityMemberships.communityId, communityId))
          )[0]?.status,
          'LEFT',
        );

        // Retry keeps the request open while a processor step is still failing.
        const retried = await privacy.retryProviderActions(admin, deletion.id);
        assert.equal(retried.status, 'PENDING_PROVIDER');

        // Export contains only this user's Wasl-owned records.
        const exported = await privacy.exportData(minor);
        assert.equal(exported.account.id, minor);
        assert.equal(exported.profile?.displayName, 'Privacy minor');
        assert.equal(exported.ageEligibility?.status, 'UNDER_18');
        assert.ok(Array.isArray(exported.documentAcceptances));

        // Retention stays blocked and disabled while periods are TBD-LEGAL.
        await tx.insert(schema.retentionPolicies).values({
          dataGroup: `privacy-test-${randomUUID()}`,
          triggerEvent: 'Fixture',
          handling: 'Fixture handling',
          owner: 'Compliance',
        });
        const retention = await privacy.retentionPreview();
        assert.equal(retention.erasureEnabled, false);
        assert.ok(retention.blockedDataGroups.length > 0);

        // Administrator review can restore or restrict eligibility without storing evidence.
        const reviewed = await privacy.reviewAge(admin, minor, {
          status: '18_PLUS',
          note: 'Support review confirmed eligibility.',
        });
        assert.equal(reviewed?.status, '18_PLUS');
        assert.equal(reviewed?.method, 'ADMIN_REVIEW');

        throw rollback;
      }),
      /Rollback privacy fixtures/,
    );
  } finally {
    await pool.end();
  }
}

void main()
  .then(() => console.log('Privacy integration checks passed.'))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
