import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { Pool } from 'pg';
import { ForbiddenException } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import type { Database } from '../src/db/database.module';
import { CommunitiesService } from '../src/modules/communities/communities.service';
import { EventsService } from '../src/modules/events/events.service';
import { ModerationService } from '../src/modules/moderation/moderation.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { ParticipationService } from '../src/modules/participation/participation.service';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const result = await pool.query<{
      report: {
        communities: number;
        events: number;
        profiles: number;
        organizations: number;
        membershipStatuses: string[];
        registrationStatuses: string[];
        communityModes: string[];
        eventModes: string[];
        overCapacity: number;
        missingHistory: number;
        missingFields: number;
        syntheticAuth: number;
        fullCommunities: number;
        fullEvents: number;
        unlimitedCommunities: number;
        unlimitedEvents: number;
        invalidTimeline: number;
        attendanceOnFutureEvents: number;
        pending: number;
        waitlisted: number;
        archived: number;
        cancelled: number;
      };
    }>(`
      with seed_communities as (select * from public.communities where id like 'dev-seed-community-%'),
      seed_events as (select * from public.events where id like 'dev-seed-event-%'),
      seed_users as (select * from identity.users where normalized_email like 'seed-attendee-%@wasl.invalid'),
      memberships as (select m.* from public.community_memberships m join seed_communities c on c.id=m.community_id join seed_users u on u.id=m.user_id),
      registrations as (select r.* from public.event_registrations r join seed_events e on e.id=r.event_id join seed_users u on u.id=r.user_id),
      community_occupancy as (select c.id,c.capacity,count(m.id) filter(where m.status='ACTIVE') n from seed_communities c left join public.community_memberships m on m.community_id=c.id group by c.id,c.capacity),
      event_occupancy as (select e.id,e.capacity,count(r.id) filter(where r.status in ('ACCEPTED','ATTENDED','NO_SHOW')) n from seed_events e left join public.event_registrations r on r.event_id=e.id group by e.id,e.capacity)
      select jsonb_build_object(
        'communities',(select count(*) from seed_communities),'events',(select count(*) from seed_events),
        'profiles',(select count(*) from identity.profiles p join seed_users u on p.id=u.id),
        'organizations',(select count(*) from public.organizations where slug like 'dev-seed-organization-%'),
        'membershipStatuses',(select jsonb_agg(distinct status) from memberships),
        'registrationStatuses',(select jsonb_agg(distinct status) from registrations),
        'communityModes',(select jsonb_agg(distinct admission_mode) from seed_communities),
        'eventModes',(select jsonb_agg(distinct admission_mode) from seed_events),
        'overCapacity',(select count(*) from (select * from community_occupancy union all select * from event_occupancy) o where n>capacity),
        'missingHistory',(select count(*) from memberships m where not exists(select 1 from public.community_membership_transitions t where t.membership_id=m.id and t.to_status=m.status and t.created_at=m.updated_at)) + (select count(*) from registrations r where not exists(select 1 from public.event_registration_transitions t where t.registration_id=r.id and t.to_status=r.status and t.created_at=r.updated_at)),
        'missingFields',(select count(*) from identity.profiles p join seed_users u on p.id=u.id where avatar_path is null or bio='' or city_id is null or cardinality(interests)=0) + (select count(*) from public.organizations where slug like 'dev-seed-organization-%' and (logo_path is null or city_id is null or location_name is null or website_url is null or social_url is null or description='')) + (select count(*) from seed_events where created_by_user_id is null or location_name is null or ends_at is null or description=''),
        'syntheticAuth',(select count(*) from identity.auth_identities a join seed_users u on a.user_id=u.id),
        'fullCommunities',(select count(*) from community_occupancy where n=capacity),
        'fullEvents',(select count(*) from event_occupancy where n=capacity),
        'unlimitedCommunities',(select count(*) from seed_communities where capacity is null),
        'unlimitedEvents',(select count(*) from seed_events where capacity is null),
        'invalidTimeline',(select count(*) from registrations r join seed_events e on r.event_id=e.id where r.requested_at<e.created_at or r.updated_at<r.requested_at) + (select count(*) from memberships m join seed_communities c on m.community_id=c.id where m.requested_at<c.created_at or m.updated_at<m.requested_at),
        'attendanceOnFutureEvents',(select count(*) from registrations r join seed_events e on r.event_id=e.id where r.status in ('ATTENDED','NO_SHOW') and e.starts_at>now()),
        'pending',(select count(*) from memberships where status='PENDING')+(select count(*) from registrations where status='PENDING'),
        'waitlisted',(select count(*) from memberships where status='WAITLISTED')+(select count(*) from registrations where status='WAITLISTED'),
        'archived',(select count(*) from seed_communities where archived),'cancelled',(select count(*) from seed_events where cancelled)
      ) report;
    `);
    const report = result.rows[0]!.report;
    assert.equal(report.communities, 12);
    assert.equal(report.events, 16);
    assert.equal(report.profiles, 18);
    assert.equal(report.organizations, 3);
    assert.deepEqual(
      new Set(report.membershipStatuses),
      new Set(['ACTIVE', 'PENDING', 'WAITLISTED', 'REJECTED', 'LEFT', 'REMOVED']),
    );
    assert.deepEqual(
      new Set(report.registrationStatuses),
      new Set([
        'ACCEPTED',
        'PENDING',
        'WAITLISTED',
        'REJECTED',
        'CANCELLED_BY_USER',
        'REMOVED_BY_ORGANIZER',
        'ATTENDED',
        'NO_SHOW',
      ]),
    );
    assert.equal(report.communityModes.length, 3);
    assert.equal(report.eventModes.length, 3);
    for (const key of [
      'overCapacity',
      'missingHistory',
      'missingFields',
      'syntheticAuth',
      'invalidTimeline',
      'attendanceOnFutureEvents',
    ] as const)
      assert.equal(report[key], 0, key);
    for (const key of [
      'fullCommunities',
      'fullEvents',
      'unlimitedCommunities',
      'unlimitedEvents',
      'pending',
      'waitlisted',
      'archived',
      'cancelled',
    ] as const)
      assert.ok(report[key] > 0, key);
    console.log('Development seed database coverage verified:', report);
    const rollback = new Error('Rollback sample action checks');
    await assert.rejects(
      drizzle(pool, { schema }).transaction(async (tx) => {
        const db = tx as unknown as Database;
        const organizations = new OrganizationsService(db, undefined, undefined);
        const communities = new CommunitiesService(db, organizations);
        const events = new EventsService(db, communities, organizations);
        const moderation = new ModerationService(
          db,
          communities,
          events,
          new NotificationsService(db),
        );
        const participation = new ParticipationService(db, communities, events);
        const communityId = 'dev-seed-community-07';
        const [community] = await tx
          .select()
          .from(schema.communities)
          .where(eq(schema.communities.id, communityId));
        assert.ok(community);
        const owner = { id: community.ownerId, authUserId: '' };
        assert.equal(
          (await moderation.permissions(owner.id, 'community', communityId)).manager,
          true,
        );
        const rows = await participation.communityParticipants(owner, communityId);
        const pending = rows.find((row) => row.status === 'PENDING')!;
        const waitlisted = rows.find((row) => row.status === 'WAITLISTED')!;
        const active = rows.find((row) => row.status === 'ACTIVE')!;
        assert.ok(pending && waitlisted && active);
        await assert.rejects(
          participation.decideCommunity(
            { id: pending.userId, authUserId: '' },
            communityId,
            pending.id,
            'approve',
          ),
          ForbiddenException,
        );
        assert.equal(
          (await participation.decideCommunity(owner, communityId, pending.id, 'approve')).status,
          'ACTIVE',
        );
        assert.equal(
          (await participation.decideCommunity(owner, communityId, waitlisted.id, 'promote'))
            .status,
          'ACTIVE',
        );
        assert.equal(
          (await participation.decideCommunity(owner, communityId, active.id, 'remove')).status,
          'REMOVED',
        );
        await moderation.assignModerator(owner.id, 'community', communityId, pending.userId);
        assert.equal(await moderation.isModerator(pending.userId, 'community', communityId), true);
        assert.ok(
          (await moderation.listModerators(owner.id, 'community', communityId)).some(
            (row) => row.userId === pending.userId,
          ),
        );
        await moderation.removeModerator(owner.id, 'community', communityId, pending.userId);
        assert.equal(await moderation.isModerator(pending.userId, 'community', communityId), false);
        await moderation.report(pending.userId, {
          targetType: 'community',
          targetId: communityId,
          reason: 'Rollback-only sample report',
        });
        await moderation.report(pending.userId, {
          targetType: 'event',
          targetId: 'dev-seed-event-07',
          reason: 'Rollback-only sample report',
        });
        await communities.archive(owner, communityId);
        throw rollback;
      }),
      (error: unknown) => error === rollback,
    );
    console.log(
      'Seeded community approval, promotion, removal, moderator assignment/removal, reporting, archive, and authorization verified; all action changes rolled back.',
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
