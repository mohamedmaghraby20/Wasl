import type { SupabaseClient } from '@supabase/supabase-js';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from './database.module';
import {
  buildDevelopmentSeed,
  communityHistory,
  eventHistory,
  sampleOwnerEmail,
  sampleOwnerId,
  seedId,
} from './development-seed-data';
import {
  ageEligibilities,
  authIdentities,
  communities,
  communityCategories,
  communityMemberships,
  communityMembershipTransitions,
  discussionPosts,
  discussionThreads,
  eventCategories,
  eventRegistrations,
  eventRegistrationTransitions,
  events,
  moderationReports,
  notifications,
  organizationAdminInvitations,
  organizationAdmins,
  organizations,
  organizationVerificationRequests,
  profiles,
  resourceModerators,
  users,
} from './schema';

export async function seedDevelopmentData(
  database: Database,
  storage: SupabaseClient,
  ownerId: string,
  hostName: string,
) {
  const data = buildDevelopmentSeed(ownerId, hostName);
  const syntheticAccounts = [
    { id: sampleOwnerId, normalizedEmail: sampleOwnerEmail },
    ...data.attendees.map(({ id, normalizedEmail }) => ({ id, normalizedEmail })),
  ];
  const ids = syntheticAccounts.map((row) => row.id);
  const existingUsers = await database.select().from(users).where(inArray(users.id, ids));
  const identities = await database
    .select()
    .from(authIdentities)
    .where(inArray(authIdentities.userId, ids));
  if (
    identities.length ||
    existingUsers.some(
      (row) =>
        !syntheticAccounts.some(
          (sample) => sample.id === row.id && sample.normalizedEmail === row.normalizedEmail,
        ),
    )
  ) {
    throw new Error('Seed IDs overlap a real account; no sample data was changed.');
  }
  for (const [table, rows] of [
    [communities, data.communityRows],
    [events, data.eventRows],
    [organizations, data.organizationRows],
  ] as const) {
    const existing = await database
      .select({ id: table.id, slug: table.slug })
      .from(table)
      .where(
        inArray(
          table.id,
          rows.map((row) => row.id),
        ),
      );
    if (existing.some((row) => !row.slug.startsWith('dev-seed-')))
      throw new Error('Seed resource IDs overlap real content.');
  }

  const bucket = storage.storage.from('profile-photos');
  const listed = await bucket.list('dev-seed', { limit: 1000 });
  if (listed.error) throw listed.error;
  const existingFiles = new Set(listed.data.map((file) => file.name));
  const pictures = [
    ...data.attendees.map((person, index) => ({
      path: person.avatarPath,
      source: `https://i.pravatar.cc/160?img=${index + 11}`,
    })),
    { path: `dev-seed/${sampleOwnerId}.jpg`, source: 'https://i.pravatar.cc/160?img=39' },
    ...data.organizationRows.map((organization, index) => ({
      path: organization.logoPath,
      source: `https://picsum.photos/seed/wasl-organization-${index + 1}/240/240`,
    })),
  ];
  for (const picture of pictures) {
    if (existingFiles.has(picture.path.split('/').at(-1)!)) continue;
    const response = await fetch(picture.source, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
      throw new Error(`Sample image download failed (${response.status}).`);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 5 * 1024 * 1024)
      throw new Error('Sample image exceeds the upload limit.');
    const { error } = await bucket.upload(picture.path, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) throw error;
  }

  await database.transaction(async (tx) => {
    await tx
      .insert(users)
      .values(
        syntheticAccounts.map((row) => ({
          ...row,
          createdAt: data.at(-90),
          updatedAt: data.at(-2),
        })),
      )
      .onConflictDoUpdate({
        target: users.id,
        set: { createdAt: sql`excluded.created_at`, updatedAt: sql`excluded.updated_at` },
      });
    const profileRows = [
      ...data.attendees.map((person) => ({
        id: person.id,
        displayName: person.displayName,
        avatarPath: person.avatarPath,
        cityId: person.cityId,
        bio: person.bio,
        interests: person.interests,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt,
      })),
      {
        id: sampleOwnerId,
        displayName: 'Wasl Sample Host',
        avatarPath: `dev-seed/${sampleOwnerId}.jpg`,
        cityId: 'istanbul',
        bio: 'Fictional adult host for Wasl development samples. Not a sign-in account.',
        interests: ['social', 'culture', 'education'],
        createdAt: data.at(-90),
        updatedAt: data.at(-2),
      },
    ];
    await tx
      .insert(profiles)
      .values(profileRows)
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          displayName: sql`excluded.display_name`,
          avatarPath: sql`excluded.avatar_path`,
          bio: sql`excluded.bio`,
          cityId: sql`excluded.city_id`,
          interests: sql`excluded.interests`,
          createdAt: sql`excluded.created_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
    if (ownerId !== sampleOwnerId) {
      await tx
        .update(profiles)
        .set({
          avatarPath: sql`coalesce(${profiles.avatarPath}, ${'dev-seed/' + sampleOwnerId + '.jpg'})`,
          cityId: sql`coalesce(${profiles.cityId}, 'istanbul')`,
          bio: sql`case when btrim(${profiles.bio}) = ''
            then 'Wasl demo organizer exploring language exchanges, cultural events, and local volunteering.'
            else ${profiles.bio} end`,
          interests: sql`case when cardinality(${profiles.interests}) = 0
            then array['language', 'culture', 'education', 'volunteering']::text[]
            else ${profiles.interests} end`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(profiles.id, ownerId),
            sql`(${profiles.avatarPath} is null or ${profiles.cityId} is null
              or btrim(${profiles.bio}) = '' or cardinality(${profiles.interests}) = 0)`,
          ),
        );
    }
    await tx
      .insert(ageEligibilities)
      .values(
        ids.map((userId) => ({
          userId,
          status: '18_PLUS' as const,
          method: 'development-seed-fictional-adult',
          decidedAt: data.at(-90),
          reviewedByUserId: sampleOwnerId,
          note: 'Synthetic adult test profile; not age-verification evidence for a real person.',
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(organizations)
      .values(data.organizationRows)
      .onConflictDoUpdate({
        target: organizations.id,
        set: {
          ownerUserId: ownerId,
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          type: sql`excluded.type`,
          cityId: sql`excluded.city_id`,
          locationName: sql`excluded.location_name`,
          websiteUrl: sql`excluded.website_url`,
          socialUrl: sql`excluded.social_url`,
          logoPath: sql`excluded.logo_path`,
          verificationStatus: sql`excluded.verification_status`,
          createdAt: sql`excluded.created_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
    await tx
      .insert(organizationAdmins)
      .values(
        data.organizationRows.map((organization) => ({
          organizationId: organization.id,
          userId: data.attendees[0]!.id,
          createdAt: data.at(-4),
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(organizationAdminInvitations)
      .values(data.invitationRows)
      .onConflictDoUpdate({
        target: organizationAdminInvitations.id,
        set: {
          status: sql`excluded.status`,
          expiresAt: sql`excluded.expires_at`,
          respondedAt: sql`excluded.responded_at`,
        },
      });
    await tx
      .insert(organizationVerificationRequests)
      .values(
        data.organizationRows.map((organization, index) => ({
          id: seedId(`verification:${organization.id}`),
          organizationId: organization.id,
          requestedByUserId: ownerId,
          status: (['APPROVED', 'PENDING', 'REJECTED'] as const)[index]!,
          requestNote:
            'Fictional organization verification request for development. No real documents were submitted.',
          decisionNote:
            index === 1
              ? null
              : index === 0
                ? 'Sample approved case; not verification of a real organization.'
                : 'Sample rejected case: more information would be required.',
          decidedByUserId: index === 1 ? null : sampleOwnerId,
          createdAt: data.at(-10),
          decidedAt: index === 1 ? null : data.at(-3),
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(communities)
      .values(data.communityRows)
      .onConflictDoUpdate({
        target: communities.id,
        set: {
          createdAt: sql`excluded.created_at`,
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          cityId: sql`excluded.city_id`,
          ownerType: sql`excluded.owner_type`,
          ownerId: sql`excluded.owner_id`,
          createdByUserId: sql`excluded.created_by_user_id`,
          hostName: sql`excluded.host_name`,
          admissionMode: sql`excluded.admission_mode`,
          capacity: sql`excluded.capacity`,
          archived: sql`excluded.archived`,
        },
      });
    await tx
      .insert(events)
      .values(data.eventRows)
      .onConflictDoUpdate({
        target: events.id,
        set: {
          createdAt: sql`excluded.created_at`,
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          visibility: sql`excluded.visibility`,
          hostType: sql`excluded.host_type`,
          hostId: sql`excluded.host_id`,
          communityId: sql`excluded.community_id`,
          createdByUserId: sql`excluded.created_by_user_id`,
          hostName: sql`excluded.host_name`,
          cityId: sql`excluded.city_id`,
          online: sql`excluded.online`,
          locationName: sql`excluded.location_name`,
          startsAt: sql`excluded.starts_at`,
          endsAt: sql`excluded.ends_at`,
          admissionMode: sql`excluded.admission_mode`,
          capacity: sql`excluded.capacity`,
          cancelled: sql`excluded.cancelled`,
        },
      });
    await tx.delete(communityCategories).where(
      inArray(
        communityCategories.communityId,
        data.communityRows.map((row) => row.id),
      ),
    );
    await tx.insert(communityCategories).values(data.communityCategories);
    await tx.delete(eventCategories).where(
      inArray(
        eventCategories.eventId,
        data.eventRows.map((row) => row.id),
      ),
    );
    await tx.insert(eventCategories).values(data.eventCategories);
    const syntheticMemberships = await tx
      .insert(communityMemberships)
      .values(data.membershipRows)
      .onConflictDoUpdate({
        target: [communityMemberships.communityId, communityMemberships.userId],
        set: {
          status: sql`excluded.status`,
          requestedAt: sql`excluded.requested_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      })
      .returning();
    const syntheticRegistrations = await tx
      .insert(eventRegistrations)
      .values(data.registrationRows)
      .onConflictDoUpdate({
        target: [eventRegistrations.eventId, eventRegistrations.userId],
        set: {
          status: sql`excluded.status`,
          requestedAt: sql`excluded.requested_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      })
      .returning();
    // Keep any participation actions already taken by the signed-in account.
    const ownerMemberships = data.ownerMembershipRows.length
      ? await tx
          .insert(communityMemberships)
          .values(data.ownerMembershipRows)
          .onConflictDoNothing()
          .returning()
      : [];
    const ownerRegistrations = data.ownerRegistrationRows.length
      ? await tx
          .insert(eventRegistrations)
          .values(data.ownerRegistrationRows)
          .onConflictDoNothing()
          .returning()
      : [];
    const memberships = [...syntheticMemberships, ...ownerMemberships];
    const registrations = [...syntheticRegistrations, ...ownerRegistrations];
    await tx.execute(sql`update ${communities} c set capacity = occupied.n from (
      select community_id, count(*)::integer n from ${communityMemberships} where status = 'ACTIVE' group by community_id
    ) occupied where c.id = occupied.community_id and c.id in ${data.communityRows.map((row) => row.id)} and c.capacity < occupied.n`);
    await tx.execute(sql`update ${events} e set capacity = occupied.n from (
      select event_id, count(*)::integer n from ${eventRegistrations} where status in ('ACCEPTED', 'ATTENDED', 'NO_SHOW') group by event_id
    ) occupied where e.id = occupied.event_id and e.id in ${data.eventRows.map((row) => row.id)} and e.capacity < occupied.n`);
    // Refresh synthetic histories and add histories for newly inserted owner participation.
    await tx.delete(communityMembershipTransitions).where(
      inArray(
        communityMembershipTransitions.membershipId,
        memberships.map((row) => row.id),
      ),
    );
    await tx.insert(communityMembershipTransitions).values(
      memberships.flatMap((row) =>
        communityHistory(row.status).map((toStatus, index, path) => ({
          id: seedId(`membership-history:${row.id}:${index}`),
          membershipId: row.id,
          fromStatus: path[index - 1] ?? null,
          toStatus,
          actorUserId:
            toStatus === 'LEFT' || index === 0
              ? row.userId
              : data.communityRows.find((community) => community.id === row.communityId)!
                  .createdByUserId,
          reason: `Development sample: ${toStatus.toLowerCase().replaceAll('_', ' ')} membership.`,
          createdAt: index === path.length - 1 ? row.updatedAt : row.requestedAt,
        })),
      ),
    );
    await tx.delete(eventRegistrationTransitions).where(
      inArray(
        eventRegistrationTransitions.registrationId,
        registrations.map((row) => row.id),
      ),
    );
    await tx.insert(eventRegistrationTransitions).values(
      registrations.flatMap((row) =>
        eventHistory(row.status).map((toStatus, index, path) => ({
          id: seedId(`registration-history:${row.id}:${index}`),
          registrationId: row.id,
          fromStatus: path[index - 1] ?? null,
          toStatus,
          actorUserId:
            toStatus === 'CANCELLED_BY_USER' || index === 0
              ? row.userId
              : data.eventRows.find((event) => event.id === row.eventId)!.createdByUserId,
          reason: `Development sample: ${toStatus.toLowerCase().replaceAll('_', ' ')} registration.`,
          createdAt: index === path.length - 1 ? row.updatedAt : row.requestedAt,
        })),
      ),
    );

    await tx
      .insert(discussionThreads)
      .values(data.threadRows)
      .onConflictDoUpdate({
        target: discussionThreads.id,
        set: {
          title: sql`excluded.title`,
          body: sql`excluded.body`,
          archivedAt: sql`excluded.archived_at`,
          archivedByUserId: sql`excluded.archived_by_user_id`,
        },
      });
    const upsertPosts = (rows: typeof data.postRows) =>
      tx
        .insert(discussionPosts)
        .values(rows)
        .onConflictDoUpdate({
          target: discussionPosts.id,
          set: {
            body: sql`excluded.body`,
            deletedAt: sql`excluded.deleted_at`,
            deletedByUserId: sql`excluded.deleted_by_user_id`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    await upsertPosts(data.postRows.filter((row) => row.depth === 0));
    await upsertPosts(data.postRows.filter((row) => row.depth === 1));
    await tx
      .insert(resourceModerators)
      .values([
        ...data.communityRows
          .filter((row) => row.id !== 'dev-seed-community-12')
          .map((row) => ({
            id: seedId(`moderator:${row.id}`),
            communityId: row.id,
            eventId: null,
            userId: data.attendees[0]!.id,
            assignedByUserId: ownerId,
            createdAt: data.at(-10),
          })),
        ...data.eventRows
          .filter((row) => !row.cancelled)
          .map((row) => ({
            id: seedId(`moderator:${row.id}`),
            communityId: null,
            eventId: row.id,
            userId: data.attendees[0]!.id,
            assignedByUserId: ownerId,
            createdAt: data.at(-10),
          })),
      ])
      .onConflictDoNothing();
    await tx
      .insert(moderationReports)
      .values(
        (['OPEN', 'ACTIONED', 'DISMISSED'] as const).map((status, index) => ({
          id: seedId(`report:${index}`),
          reporterUserId: data.attendees[2]!.id,
          targetType: (['community', 'event', 'post'] as const)[index]!,
          targetId: [data.communityRows[0]!.id, data.eventRows[0]!.id, data.postRows[2]!.id][
            index
          ]!,
          reason: 'Fictional development report to exercise moderation review; no real allegation.',
          status,
          decidedByUserId: index ? sampleOwnerId : null,
          decisionNote: index ? 'Sample moderation outcome for testing only.' : null,
          decidedAt: index ? data.at(-2) : null,
          createdAt: data.at(-4),
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(notifications)
      .values([
        ...data.organizationRows
          .filter((row) => row.verificationStatus !== 'PENDING')
          .map((row, index) => ({
            id: seedId(`notice:${row.id}`),
            recipientUserId: ownerId,
            eventKey: `dev-seed:organization:${row.id}`,
            type: `organization_verification_${row.verificationStatus.toLowerCase()}`,
            contextType: 'organization',
            contextId: row.id,
            readAt: index ? data.at(-1) : null,
            createdAt: data.at(-2),
          })),
        ...registrations
          .filter((row) => ['ACCEPTED', 'REJECTED', 'REMOVED_BY_ORGANIZER'].includes(row.status))
          .map((row, index) => ({
            id: seedId(`notice:${row.id}`),
            recipientUserId: row.userId,
            eventKey: `dev-seed:registration:${row.id}`,
            type: `event_${row.status.toLowerCase()}`,
            contextType: 'event',
            contextId: row.eventId,
            readAt: index % 2 ? data.at(-1) : null,
            createdAt: data.at(-2),
          })),
      ])
      .onConflictDoNothing();
  });
  return {
    profiles: ids.length,
    organizations: data.organizationRows.length,
    communities: data.communityRows.length,
    events: data.eventRows.length,
    memberships: data.membershipRows.length + data.ownerMembershipRows.length,
    registrations: data.registrationRows.length + data.ownerRegistrationRows.length,
    threads: data.threadRows.length,
    posts: data.postRows.length,
  };
}
