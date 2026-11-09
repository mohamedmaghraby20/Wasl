import { describe, expect, it } from 'vitest';
import {
  assertCommunityTransition,
  assertEventTransition,
} from '../modules/participation/participation-transitions';
import {
  buildDevelopmentSeed,
  communityHistory,
  eventHistory,
  sampleOwnerId,
  seedId,
} from './development-seed-data';

const data = buildDevelopmentSeed(sampleOwnerId, 'Sample Host', new Date('2026-10-31T10:00:00Z'));

describe('development seed coverage', () => {
  it('covers every membership and registration status with valid transition paths', () => {
    expect(new Set(data.membershipRows.map((row) => row.status))).toEqual(
      new Set(['ACTIVE', 'PENDING', 'WAITLISTED', 'REJECTED', 'LEFT', 'REMOVED']),
    );
    expect(new Set(data.registrationRows.map((row) => row.status))).toEqual(
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
    for (const row of data.membershipRows) {
      const path = communityHistory(row.status);
      path.forEach((status, index) => assertCommunityTransition(path[index - 1] ?? null, status));
      expect(path.at(-1)).toBe(row.status);
      expect(row.updatedAt.getTime()).toBeGreaterThanOrEqual(row.requestedAt.getTime());
    }
    for (const row of data.registrationRows) {
      const path = eventHistory(row.status);
      path.forEach((status, index) => assertEventTransition(path[index - 1] ?? null, status));
      expect(path.at(-1)).toBe(row.status);
      expect(row.updatedAt.getTime()).toBeGreaterThanOrEqual(row.requestedAt.getTime());
    }
  });

  it('has full, limited, unlimited, empty, and archived community scenarios without exceeding capacity', () => {
    const capacities = new Set(data.communityRows.map((row) => row.capacity));
    expect(capacities.has(null)).toBe(true);
    expect(capacities.size).toBeGreaterThan(5);
    expect(data.communityRows.some((row) => row.archived)).toBe(true);
    for (const community of data.communityRows) {
      const active = data.membershipRows.filter(
        (row) => row.communityId === community.id && row.status === 'ACTIVE',
      ).length;
      if (community.capacity !== null) expect(active).toBeLessThanOrEqual(community.capacity);
    }
    const full = data.communityRows[0]!;
    expect(
      data.membershipRows.filter((row) => row.communityId === full.id && row.status === 'ACTIVE'),
    ).toHaveLength(full.capacity!);
    expect(
      data.membershipRows.filter((row) => row.communityId === data.communityRows[11]!.id),
    ).toHaveLength(0);
    expect(
      data.membershipRows.filter((row) => row.communityId === full.id && row.status === 'PENDING')
        .length,
    ).toBeGreaterThan(5);
    expect(new Set(data.communityRows.map((row) => row.admissionMode))).toEqual(
      new Set(['open', 'approval', 'automatic']),
    );
    expect(new Set(data.communityRows.map((row) => row.ownerType))).toEqual(
      new Set(['user', 'organization']),
    );
  });

  it('has all event host/mode/visibility/time/location scenarios with coherent occupancy and dates', () => {
    expect(new Set(data.eventRows.map((row) => row.hostType))).toEqual(
      new Set(['user', 'community', 'organization']),
    );
    expect(new Set(data.eventRows.map((row) => row.admissionMode))).toEqual(
      new Set(['instant', 'approval', 'automatic']),
    );
    expect(new Set(data.eventRows.map((row) => row.visibility))).toEqual(
      new Set(['public', 'unlisted']),
    );
    expect(data.eventRows.some((row) => row.online)).toBe(true);
    expect(data.eventRows.some((row) => row.cancelled)).toBe(true);
    expect(data.eventRows.some((row) => row.capacity === null)).toBe(true);
    expect(data.eventRows.some((row) => row.startsAt < data.base)).toBe(true);
    for (const event of data.eventRows) {
      const rows = data.registrationRows.filter((row) => row.eventId === event.id);
      const occupied = rows.filter((row) =>
        ['ACCEPTED', 'ATTENDED', 'NO_SHOW'].includes(row.status),
      ).length;
      if (event.capacity != null) expect(occupied).toBeLessThanOrEqual(event.capacity);
      expect(event.endsAt!.getTime()).toBeGreaterThan(event.startsAt.getTime());
      for (const row of rows) {
        expect(row.requestedAt.getTime()).toBeGreaterThan(event.createdAt!.getTime());
        if (row.status === 'ATTENDED' || row.status === 'NO_SHOW')
          expect(event.startsAt < data.base).toBe(true);
      }
      expect(event.communityId !== null).toBe(event.hostType === 'community');
      expect(event.locationName).toBeTruthy();
      expect(event.createdByUserId).toBeTruthy();
    }
  });

  it('provides Istanbul in-person events each weekend for a month from a Monday seed', () => {
    const seeded = buildDevelopmentSeed(
      sampleOwnerId,
      'Sample Host',
      new Date('2026-11-09T10:00:00Z'),
    );
    const calendar = seeded.eventRows.filter((event) =>
      event.id.startsWith('dev-seed-event-calendar-'),
    );
    expect(calendar).toHaveLength(20);
    for (const saturday of ['11-14', '11-21', '11-28', '12-05', '12-12']) {
      const start = new Date('2026-' + saturday + 'T00:00:00+03:00').getTime();
      const weekend = calendar.filter(
        (event) =>
          event.cityId === 'istanbul' &&
          !event.online &&
          !event.cancelled &&
          event.visibility === 'public' &&
          event.startsAt.getTime() >= start &&
          event.startsAt.getTime() < start + 48 * 3_600_000,
      );
      expect(weekend).toHaveLength(2);
    }
  });

  it('fills profile and organization fields with clearly fictional data and safe storage paths', () => {
    expect(data.attendees).toHaveLength(18);
    for (const person of data.attendees) {
      expect(person.normalizedEmail).toMatch(/@wasl\.invalid$/);
      expect(person.avatarPath).toMatch(/^dev-seed\/.+\.jpg$/);
      expect(person.bio.length).toBeGreaterThan(30);
      expect(person.cityId).toBeTruthy();
      expect(person.interests.length).toBeGreaterThanOrEqual(2);
      expect(new Set(person.interests).size).toBe(person.interests.length);
    }
    expect(new Set(data.organizationRows.map((row) => row.verificationStatus))).toEqual(
      new Set(['VERIFIED', 'PENDING', 'REJECTED']),
    );
    for (const organization of data.organizationRows) {
      expect(
        Object.values(organization).every(
          (value) => value !== null && value !== undefined && value !== '',
        ),
      ).toBe(true);
      expect(new URL(organization.websiteUrl).hostname).toMatch(/\.example\.org$/);
    }
  });

  it('provides valid one-level replies, removed posts, and invitation response states', () => {
    const posts = new Map(data.postRows.map((row) => [row.id, row]));
    expect(data.postRows.some((row) => row.deletedAt && row.deletedByUserId)).toBe(true);
    for (const post of data.postRows) {
      if (!post.parentId) continue;
      expect(posts.get(post.parentId)?.depth).toBe(0);
      expect(posts.get(post.parentId)?.threadId).toBe(post.threadId);
      expect(post.depth).toBe(1);
    }
    expect(new Set(data.invitationRows.map((row) => row.status))).toEqual(
      new Set(['ACCEPTED', 'PENDING', 'REVOKED']),
    );
    for (const invitation of data.invitationRows) {
      expect(invitation.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(invitation.respondedAt === null).toBe(invitation.status === 'PENDING');
      expect(invitation.expiresAt.getTime()).toBeGreaterThan(invitation.createdAt.getTime());
    }
  });

  it('uses stable collision-free IDs for repeatable upserts', () => {
    expect(seedId('sample')).toBe(seedId('sample'));
    expect(seedId('sample')).not.toBe(seedId('another'));
    expect(seedId('sample')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    const ids = [
      ...data.organizationRows,
      ...data.communityRows,
      ...data.eventRows,
      ...data.membershipRows,
      ...data.registrationRows,
      ...data.threadRows,
      ...data.postRows,
      ...data.invitationRows,
    ].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    const rerun = buildDevelopmentSeed(
      sampleOwnerId,
      'Sample Host',
      new Date('2026-10-31T20:00:00Z'),
    );
    expect(rerun.membershipRows).toEqual(data.membershipRows);
    expect(rerun.eventRows).toEqual(data.eventRows);
  });
});
