import { createHash, randomBytes } from 'node:crypto';
import type {
  CommunityStatus,
  EventStatus,
} from '../modules/participation/participation-transitions';
import type { communities, events, organizations, profiles } from './schema';

export const sampleOwnerId = '00000000-0000-4000-8000-000000000001';
export const sampleOwnerEmail = 'seed-owner@wasl.invalid';

export function seedId(key: string): string {
  const hash = createHash('sha256').update(`wasl-development-seed:${key}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const places = [
  ['istanbul-language-exchange', 'Istanbul Language Exchange', 'istanbul', 'language', 'culture'],
  ['ankara-book-club', 'Ankara Book Club', 'ankara', 'books', 'education'],
  ['izmir-coastal-walkers', 'Izmir Coastal Walkers', 'izmir', 'travel', 'health'],
  ['antalya-weekend-cyclists', 'Antalya Weekend Cyclists', 'antalya', 'sports', 'travel'],
  ['bursa-board-game-circle', 'Bursa Board Game Circle', 'bursa', 'gaming', 'social'],
  ['konya-art-and-culture', 'Konya Art and Culture', 'konya', 'arts', 'culture'],
  ['gaziantep-food-explorers', 'Gaziantep Food Explorers', 'gaziantep', 'food', 'culture'],
  ['eskisehir-tech-meetup', 'Eskisehir Tech Meetup', 'eskisehir', 'technology', 'business'],
  ['trabzon-outdoor-friends', 'Trabzon Outdoor Friends', 'trabzon', 'travel', 'photography'],
  ['mugla-community-garden', 'Mugla Community Garden', 'mugla', 'environment', 'volunteering'],
  ['archived-creative-circle', 'Archived Creative Circle', 'istanbul', 'arts', 'music'],
  ['new-neighbourhood-circle', 'New Neighbourhood Circle', 'ankara', 'social', 'family'],
] as const;

const capacities = [4, 8, 12, 24, 50, null, 6, 100, 16, 40, 20, 10];

export function buildDevelopmentSeed(ownerId: string, hostName: string, now = new Date()) {
  const base = new Date(now);
  base.setUTCHours(12, 0, 0, 0);
  const at = (days: number, hours = 0) =>
    new Date(base.getTime() + (days * 24 + hours) * 3_600_000);
  const attendees = Array.from(
    { length: 18 },
    (_, index) =>
      ({
        id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        normalizedEmail: `seed-attendee-${String(index + 1).padStart(2, '0')}@wasl.invalid`,
        displayName: `Sample Attendee ${String(index + 1).padStart(2, '0')}`,
        cityId: places[index % 10]![2],
        avatarPath: `dev-seed/20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}.jpg`,
        bio: `Fictional adult sample participant ${index + 1}. Enjoys local gatherings, language practice, and meeting neighbours. Not a real account.`,
        interests: [...new Set([...places[index % 10]!.slice(3), 'social'])],
        createdAt: at(-90 + index),
        updatedAt: at(-2),
      }) satisfies typeof profiles.$inferInsert & { normalizedEmail: string },
  );
  const organizationRows = ['VERIFIED', 'PENDING', 'REJECTED'].map(
    (verificationStatus, index) =>
      ({
        id: seedId(`organization:${index}`),
        ownerUserId: ownerId,
        slug: `dev-seed-organization-${index + 1}`,
        name: `${['Neighbourhood Collective', 'Learning Together', 'Outdoor Connections'][index]} (Sample)`,
        description: `Fictional community organization ${index + 1}. We organize accessible local activities and welcome adults from different backgrounds. Development sample only.`,
        type: ['Community collective', 'Education association', 'Outdoor club'][index]!,
        cityId: places[index]![2],
        locationName: `Sample organization office ${index + 1} — not a real venue`,
        websiteUrl: `https://organization-${index + 1}.example.org`,
        socialUrl: `https://example.org/sample-social/${index + 1}`,
        logoPath: `dev-seed/organization-${index + 1}.jpg`,
        verificationStatus: verificationStatus as 'VERIFIED' | 'PENDING' | 'REJECTED',
        createdAt: at(-80),
        updatedAt: at(-3),
      }) satisfies typeof organizations.$inferInsert,
  );
  const communityRows = places.map(
    ([slug, name, cityId], index) =>
      ({
        id: `dev-seed-community-${String(index + 1).padStart(2, '0')}`,
        slug: `dev-seed-${slug}`,
        name: `${name} (Sample)`,
        description: `${name} brings neighbours together for friendly, adult-only activities in ${cityId}. We meet regularly, welcome beginners, and share practical details in community discussions. This is fictional development data, not a real organizer.`,
        cityId,
        ownerType: index === 7 || index === 8 ? 'organization' : 'user',
        ownerId: index === 7 || index === 8 ? organizationRows[index - 7]!.id : ownerId,
        createdByUserId: ownerId,
        hostName: index === 7 || index === 8 ? organizationRows[index - 7]!.name : hostName,
        admissionMode: ['approval', 'open', 'automatic'][index % 3]!,
        capacity: capacities[index] ?? null,
        archived: index === 10,
        createdAt: at(-60 + index),
      }) satisfies typeof communities.$inferInsert,
  );
  const eventRows: (typeof events.$inferInsert)[] = communityRows
    .slice(0, 10)
    .map((community, index) => ({
      id: `dev-seed-event-${String(index + 1).padStart(2, '0')}`,
      slug: `${community.slug}-event`,
      title: `${community.name.replace(' (Sample)', '')} Meetup (Sample)`,
      description: `Join a friendly two-hour ${places[index]![3]} gathering. Beginners are welcome; bring water, arrive ten minutes early, and introduce yourself to the host. Venue and accessibility questions can be discussed beforehand. Fictional sample event — do not travel to this location.`,
      visibility: 'public',
      hostType: 'community',
      hostId: community.id,
      communityId: community.id,
      createdByUserId: ownerId,
      hostName: community.hostName,
      cityId: community.cityId,
      online: false,
      locationName: `Sample community venue ${index + 1}, ${community.cityId} — not a real address`,
      startsAt: at(7 + index * 3),
      endsAt: at(7 + index * 3, 2),
      admissionMode: community.admissionMode === 'open' ? 'instant' : community.admissionMode,
      capacity: community.capacity,
      cancelled: false,
      createdAt: at(-30 + index),
    }));
  for (const [offset, name, days, online, visibility, cancelled, hostType, capacity] of [
    [11, 'Online Language Workshop', 5, true, 'public', false, 'user', null],
    [12, 'Organization Welcome Evening', 12, false, 'unlisted', false, 'organization', 30],
    [13, 'Past Community Picnic', -14, false, 'public', false, 'community', 20],
    [14, 'Past Creative Workshop', -7, true, 'public', false, 'organization', 12],
    [15, 'Cancelled Garden Gathering', 18, false, 'public', true, 'community', 25],
    [16, 'Full Small-group Conversation', 9, false, 'public', false, 'community', 2],
  ] as const) {
    const community = communityRows[offset === 15 ? 9 : 0]!;
    eventRows.push({
      id: `dev-seed-event-${offset}`,
      slug: `dev-seed-${name.toLowerCase().replaceAll(' ', '-')}`,
      title: `${name} (Sample)`,
      description: `A complete fictional ${online ? 'online' : 'in-person'} activity for testing ${days < 0 ? 'attendance history' : cancelled ? 'cancellations' : 'registration and waitlists'}. Adults only; no real booking, meeting link, or venue is provided.`,
      visibility,
      hostType,
      hostId:
        hostType === 'community'
          ? community.id
          : hostType === 'organization'
            ? organizationRows[0]!.id
            : ownerId,
      communityId: hostType === 'community' ? community.id : null,
      createdByUserId: ownerId,
      hostName: hostType === 'organization' ? organizationRows[0]!.name : hostName,
      cityId: community.cityId,
      online,
      locationName: online
        ? 'Online — fictional meeting details shared in the discussion'
        : 'Sample accessible meeting space — not a real venue',
      startsAt: at(days),
      endsAt: at(days, 2),
      admissionMode: offset === 16 ? 'instant' : 'approval',
      capacity,
      cancelled,
      createdAt: at(-30),
    });
  }
  const membershipRows = communityRows.flatMap((community, index) => {
    if (index === 11) return [];
    return attendees.map((person, offset) => {
      let status: CommunityStatus;
      if (offset >= 15) status = (['REJECTED', 'LEFT', 'REMOVED'] as const)[offset - 15]!;
      else if (community.admissionMode === 'approval')
        status = offset < 4 ? 'ACTIVE' : offset < 11 ? 'PENDING' : 'WAITLISTED';
      else
        status =
          community.capacity !== null && offset >= community.capacity ? 'WAITLISTED' : 'ACTIVE';
      return {
        id: seedId(`membership:${community.id}:${person.id}`),
        communityId: community.id,
        userId: person.id,
        status,
        requestedAt: at(-15, offset / 2),
        updatedAt: at(-5, offset / 2),
      };
    });
  });
  const registrationRows = eventRows.flatMap((event) =>
    attendees.map((person, offset) => {
      let status: EventStatus;
      if (event.cancelled) status = 'CANCELLED_BY_USER';
      else if (offset >= 15)
        status = (['REJECTED', 'CANCELLED_BY_USER', 'REMOVED_BY_ORGANIZER'] as const)[offset - 15]!;
      else if (event.startsAt < base)
        status = offset < 8 ? 'ATTENDED' : offset < 12 ? 'NO_SHOW' : 'REJECTED';
      else if (event.admissionMode === 'approval')
        status = offset < 4 ? 'ACCEPTED' : offset < 11 ? 'PENDING' : 'WAITLISTED';
      else status = event.capacity != null && offset >= event.capacity ? 'WAITLISTED' : 'ACCEPTED';
      return {
        id: seedId(`registration:${event.id}:${person.id}`),
        eventId: event.id,
        userId: person.id,
        status,
        requestedAt: at(-18, offset / 2),
        updatedAt:
          event.startsAt < base
            ? new Date(event.startsAt.getTime() + 3 * 3_600_000)
            : at(-3, offset / 2),
      };
    }),
  );
  const threadRows = [
    ...communityRows
      .filter((row) => row.id !== 'dev-seed-community-12')
      .map((community, index) => ({
        id: seedId(`topic:${community.id}`),
        communityId: community.id,
        eventId: null,
        authorUserId: ownerId,
        title: `Welcome to ${community.name.replace(' (Sample)', '')}`,
        body: 'Introduce yourself, tell us what you would like to learn, and ask the host about accessibility. This discussion contains fictional sample posts.',
        archivedAt: index === 10 ? at(-2) : null,
        archivedByUserId: index === 10 ? ownerId : null,
        createdAt: at(-16),
      })),
    ...eventRows.map((event) => ({
      id: seedId(`thread:${event.id}`),
      communityId: null,
      eventId: event.id,
      authorUserId: null,
      title: null,
      body: null,
      archivedAt: event.cancelled ? at(-2) : null,
      archivedByUserId: event.cancelled ? ownerId : null,
      createdAt: at(-16),
    })),
  ];
  const postRows = threadRows.flatMap((thread, index) => {
    const rootId = seedId(`post:${thread.id}:root`);
    return [
      {
        id: rootId,
        threadId: thread.id,
        authorUserId: attendees[0]!.id,
        body: 'Looking forward to meeting everyone! Is the meeting space accessible for someone using a wheelchair?',
        depth: 0,
        parentId: null,
        parentDepth: null,
        deletedAt: null,
        deletedByUserId: null,
        createdAt: at(-15),
        updatedAt: at(-15),
      },
      {
        id: seedId(`post:${thread.id}:reply`),
        threadId: thread.id,
        authorUserId: ownerId,
        body: 'Thanks for asking. The sample venue has step-free access. Please contact the organizer before attending any real event.',
        depth: 1,
        parentId: rootId,
        parentDepth: 0,
        deletedAt: null,
        deletedByUserId: null,
        createdAt: at(-14),
        updatedAt: at(-13),
      },
      {
        id: seedId(`post:${thread.id}:removed`),
        threadId: thread.id,
        authorUserId: attendees[1]!.id,
        body: 'Fictional removed comment used to test moderation placeholders.',
        depth: 0,
        parentId: null,
        parentDepth: null,
        deletedAt: at(-12),
        deletedByUserId: ownerId,
        createdAt: at(-14),
        updatedAt: at(-12),
      },
      {
        id: seedId(`post:${thread.id}:question`),
        threadId: thread.id,
        authorUserId: attendees[2]!.id,
        body: `Sample question ${index + 1}: what should a first-time participant bring?`,
        depth: 0,
        parentId: null,
        parentDepth: null,
        deletedAt: null,
        deletedByUserId: null,
        createdAt: at(-11),
        updatedAt: at(-11),
      },
    ];
  });
  const invitationRows = organizationRows.flatMap((organization, index) =>
    (['ACCEPTED', 'PENDING', 'REVOKED'] as const).map((status, offset) => ({
      id: seedId(`invitation:${organization.id}:${offset}`),
      organizationId: organization.id,
      targetUserId: attendees[offset]!.id,
      invitedByUserId: ownerId,
      tokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
      expiresAt: status === 'PENDING' ? at(index === 1 ? -1 : 7) : at(-1),
      status,
      createdAt: at(-8),
      respondedAt: status === 'PENDING' ? null : at(-4),
    })),
  );
  return {
    base,
    at,
    attendees,
    organizationRows,
    communityRows,
    eventRows,
    membershipRows,
    registrationRows,
    threadRows,
    postRows,
    invitationRows,
    communityCategories: communityRows.flatMap((community, index) =>
      places[index]!.slice(3).map((categoryId) => ({ communityId: community.id, categoryId })),
    ),
    eventCategories: eventRows.flatMap((event, index) =>
      places[index % 10]!.slice(3).map((categoryId) => ({ eventId: event.id, categoryId })),
    ),
  };
}

export function communityHistory(status: CommunityStatus): CommunityStatus[] {
  if (status === 'REJECTED') return ['PENDING', status];
  if (status === 'LEFT' || status === 'REMOVED') return ['ACTIVE', status];
  return [status];
}

export function eventHistory(status: EventStatus): EventStatus[] {
  if (status === 'REJECTED') return ['PENDING', status];
  if (['ATTENDED', 'NO_SHOW', 'CANCELLED_BY_USER', 'REMOVED_BY_ORGANIZER'].includes(status))
    return ['ACCEPTED', status];
  return [status];
}
