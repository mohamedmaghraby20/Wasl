import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, count, eq, inArray } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import {
  categories,
  cities,
  events,
  eventCategories,
  eventRegistrations,
  profiles,
} from '../../db/schema';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CommunitiesService } from '../communities/communities.service';
import { OrganizationsService } from '../organizations/organizations.service';
import type { CreateEventDto, UpdateEventDto } from './events.dto';

@Injectable()
export class EventsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly communities: CommunitiesService,
    private readonly organizations: OrganizationsService,
  ) {}

  async create(user: AuthenticatedUser, input: CreateEventDto) {
    const db = this.database();
    const values = await this.validateResource(input);
    let hostType: 'user' | 'organization' | 'community' = 'user';
    let hostId = user.id;
    let hostName: string;
    let communityId: string | null = null;

    if (input.communityId && input.organizationId) {
      throw new BadRequestException('Choose one event host.');
    }
    if (input.organizationId) {
      const organization = await this.organizations.assertCanManageOrganization(
        user.id,
        input.organizationId,
      );
      hostType = 'organization';
      hostId = organization.id;
      hostName = organization.name;
    } else if (input.communityId) {
      const community = await this.communities.assertCanManage(user.id, input.communityId);
      hostType = 'community';
      hostId = community.id;
      hostName = community.name;
      communityId = community.id;
    } else {
      const [profile] = await db
        .select({ displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);
      if (!profile) throw new NotFoundException('User profile not found.');
      hostName = profile.displayName;
    }

    const id = randomUUID();
    const slug = `${slugPart(values.title, 'event')}-${id.slice(0, 8)}`;
    await db.transaction(async (tx) => {
      await tx.insert(events).values({
        id,
        slug,
        title: values.title,
        description: values.description,
        visibility: input.visibility ?? 'public',
        hostType,
        hostId,
        createdByUserId: user.id,
        hostName,
        communityId,
        cityId: input.online ? null : input.cityId!,
        online: input.online,
        locationName: input.online ? null : values.locationName,
        startsAt: values.startsAt,
        endsAt: values.endsAt,
        admissionMode: input.admissionMode,
        capacity: input.capacity ?? null,
      });
      await tx
        .insert(eventCategories)
        .values(values.categoryIds.map((categoryId) => ({ eventId: id, categoryId })));
    });
    return { id, slug };
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateEventDto) {
    if (input.organizationId) throw new BadRequestException('Event host cannot be changed.');
    const db = this.database();
    const existing = await this.find(id);
    await this.assertCanManage(user, existing);
    if (existing.cancelled) throw new BadRequestException('Cancelled events cannot be edited.');
    const values = await this.validateResource(input);
    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, id))
        .for('update')
        .limit(1);
      if (!locked) throw new NotFoundException('Event not found.');
      const [accepted] = await tx
        .select({ value: count() })
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.eventId, id),
            inArray(eventRegistrations.status, ['ACCEPTED', 'ATTENDED', 'NO_SHOW']),
          ),
        );
      if (
        input.capacity !== undefined &&
        input.capacity !== null &&
        Number(accepted?.value ?? 0) > input.capacity
      ) {
        throw new BadRequestException(
          'Capacity cannot be lower than the current accepted registrations.',
        );
      }
      await tx
        .update(events)
        .set({
          title: values.title,
          description: values.description,
          visibility: input.visibility ?? 'public',
          cityId: input.online ? null : input.cityId!,
          online: input.online,
          locationName: input.online ? null : values.locationName,
          startsAt: values.startsAt,
          endsAt: values.endsAt,
          admissionMode: input.admissionMode,
          capacity: input.capacity ?? null,
        })
        .where(eq(events.id, id));
      await tx.delete(eventCategories).where(eq(eventCategories.eventId, id));
      await tx
        .insert(eventCategories)
        .values(values.categoryIds.map((categoryId) => ({ eventId: id, categoryId })));
    });
    return { id: existing.id, slug: existing.slug };
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const existing = await this.find(id);
    await this.assertCanManage(user, existing);
    if (!existing.cancelled)
      await this.database().update(events).set({ cancelled: true }).where(eq(events.id, id));
    return { id: existing.id, slug: existing.slug };
  }

  async assertCanManageById(user: AuthenticatedUser, id: string) {
    const existing = await this.find(id);
    await this.assertCanManage(user, existing);
    return existing;
  }

  private async find(id: string) {
    const [event] = await this.database()
      .select({
        id: events.id,
        slug: events.slug,
        hostType: events.hostType,
        hostId: events.hostId,
        communityId: events.communityId,
        cancelled: events.cancelled,
      })
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }

  private async assertCanManage(
    user: AuthenticatedUser,
    event: Awaited<ReturnType<EventsService['find']>>,
  ) {
    if (event.hostType === 'user' && event.hostId === user.id) return;
    if (event.hostType === 'community' && event.communityId) {
      await this.communities.assertCanManage(user.id, event.communityId);
      return;
    }
    if (event.hostType === 'organization') {
      await this.organizations.assertCanManageOrganization(user.id, event.hostId);
      return;
    }
    throw new ForbiddenException('You cannot manage this event.');
  }

  private async validateResource(input: CreateEventDto) {
    const title = input.title.trim();
    const description = input.description.trim();
    if (!title || title.length > 160 || !description || description.length > 5000) {
      throw new BadRequestException('Event details are invalid.');
    }
    const startsAt = new Date(input.startsAt);
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) {
      throw new BadRequestException('Choose valid event dates.');
    }
    if (endsAt && endsAt < startsAt)
      throw new BadRequestException('The end time must follow the start time.');
    const locationName = input.locationName?.trim() || null;
    if (!input.online && (!input.cityId || !locationName)) {
      throw new BadRequestException('Choose a city and location, or mark the event online.');
    }

    const categoryIds = [...new Set(input.categoryIds)];
    if (categoryIds.length !== input.categoryIds.length)
      throw new BadRequestException('Choose each category once.');
    const db = this.database();
    if (!input.online) {
      const [city] = await db
        .select({ id: cities.id })
        .from(cities)
        .where(eq(cities.id, input.cityId!))
        .limit(1);
      if (!city) throw new BadRequestException('Choose a city from the available list.');
    }
    const foundCategories = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.id, categoryIds));
    if (foundCategories.length !== categoryIds.length)
      throw new BadRequestException('Choose categories from the available list.');
    return { title, description, startsAt, endsAt, locationName, categoryIds };
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }
}

function slugPart(value: string, fallback: string): string {
  const part = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return part || fallback;
}
