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
  communities,
  communityCategories,
  communityMemberships,
  profiles,
} from '../../db/schema';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { OrganizationsService } from '../organizations/organizations.service';
import type { CreateCommunityDto, UpdateCommunityDto } from './communities.dto';

@Injectable()
export class CommunitiesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly organizations: OrganizationsService,
  ) {}

  async listMine(user: AuthenticatedUser) {
    const db = this.database();
    const organizations = await this.organizations.listMine(user.id);
    const organizationIds = organizations.map((organization) => organization.id);
    const [owned, organizationOwned] = await Promise.all([
      db
        .select({ id: communities.id, name: communities.name, slug: communities.slug })
        .from(communities)
        .where(
          and(
            eq(communities.ownerType, 'user'),
            eq(communities.ownerId, user.id),
            eq(communities.archived, false),
          ),
        ),
      organizationIds.length
        ? db
            .select({ id: communities.id, name: communities.name, slug: communities.slug })
            .from(communities)
            .where(
              and(
                eq(communities.ownerType, 'organization'),
                inArray(communities.ownerId, organizationIds),
                eq(communities.archived, false),
              ),
            )
        : Promise.resolve([]),
    ]);
    return [...owned, ...organizationOwned].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  async create(user: AuthenticatedUser, input: CreateCommunityDto) {
    const db = this.database();
    const values = await this.validateResource(input);
    const organization = input.organizationId
      ? await this.organizations.assertCanManageOrganization(user.id, input.organizationId)
      : null;
    const [profile] = organization
      ? [null]
      : await db
          .select({ displayName: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.id, user.id))
          .limit(1);
    if (!organization && !profile) throw new NotFoundException('User profile not found.');
    const id = randomUUID();
    const slug = `${slugPart(values.name, 'community')}-${id.slice(0, 8)}`;

    await db.transaction(async (tx) => {
      await tx.insert(communities).values({
        id,
        slug,
        name: values.name,
        description: values.description,
        cityId: input.cityId,
        ownerType: organization ? 'organization' : 'user',
        ownerId: organization?.id ?? user.id,
        createdByUserId: user.id,
        hostName: organization?.name ?? profile!.displayName,
        admissionMode: input.admissionMode,
        capacity: input.capacity ?? null,
      });
      await tx
        .insert(communityCategories)
        .values(values.categoryIds.map((categoryId) => ({ communityId: id, categoryId })));
    });
    return { id, slug };
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateCommunityDto) {
    if (input.organizationId)
      throw new BadRequestException('Resource ownership cannot be changed.');
    const db = this.database();
    const existing = await this.findManaged(user, id);
    if (existing.archived) throw new BadRequestException('Archived communities cannot be edited.');
    const values = await this.validateResource(input);
    await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ id: communities.id })
        .from(communities)
        .where(eq(communities.id, id))
        .for('update')
        .limit(1);
      if (!locked) throw new NotFoundException('Community not found.');
      const [active] = await tx
        .select({ value: count() })
        .from(communityMemberships)
        .where(
          and(eq(communityMemberships.communityId, id), eq(communityMemberships.status, 'ACTIVE')),
        );
      if (
        input.capacity !== undefined &&
        input.capacity !== null &&
        Number(active?.value ?? 0) > input.capacity
      ) {
        throw new BadRequestException(
          'Capacity cannot be lower than the current active membership.',
        );
      }
      await tx
        .update(communities)
        .set({
          name: values.name,
          description: values.description,
          cityId: input.cityId,
          admissionMode: input.admissionMode,
          capacity: input.capacity ?? null,
        })
        .where(eq(communities.id, id));
      await tx.delete(communityCategories).where(eq(communityCategories.communityId, id));
      await tx
        .insert(communityCategories)
        .values(values.categoryIds.map((categoryId) => ({ communityId: id, categoryId })));
    });
    return { id, slug: existing.slug };
  }

  async archive(user: AuthenticatedUser, id: string) {
    const existing = await this.findManaged(user, id);
    await this.database()
      .update(communities)
      .set({ archived: true })
      .where(eq(communities.id, existing.id));
    return { id: existing.id, slug: existing.slug };
  }

  async assertCanManage(
    userId: string,
    communityId: string,
  ): Promise<{ id: string; name: string }> {
    const [community] = await this.database()
      .select({
        id: communities.id,
        name: communities.name,
        ownerType: communities.ownerType,
        ownerId: communities.ownerId,
      })
      .from(communities)
      .where(and(eq(communities.id, communityId), eq(communities.archived, false)))
      .limit(1);
    if (!community) throw new ForbiddenException('You cannot manage this community.');
    if (community.ownerType === 'user') {
      if (community.ownerId !== userId) {
        throw new ForbiddenException('You cannot manage this community.');
      }
      return { id: community.id, name: community.name };
    }
    try {
      await this.organizations.assertCanManageOrganization(userId, community.ownerId);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw new ForbiddenException('You cannot manage this community.');
      }
      throw error;
    }
    return { id: community.id, name: community.name };
  }

  private async findManaged(user: AuthenticatedUser, id: string) {
    const [community] = await this.database()
      .select({
        id: communities.id,
        slug: communities.slug,
        archived: communities.archived,
        ownerType: communities.ownerType,
        ownerId: communities.ownerId,
      })
      .from(communities)
      .where(eq(communities.id, id))
      .limit(1);
    if (!community) throw new NotFoundException('Community not found.');
    if (community.ownerType === 'user') {
      if (community.ownerId !== user.id) throw new NotFoundException('Community not found.');
      return community;
    }
    try {
      await this.organizations.assertCanManageOrganization(user.id, community.ownerId);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw new NotFoundException('Community not found.');
      }
      throw error;
    }
    return community;
  }

  private async validateResource(input: CreateCommunityDto) {
    const name = input.name.trim();
    const description = input.description.trim();
    if (!name || name.length > 100 || !description || description.length > 5000) {
      throw new BadRequestException('Community details are invalid.');
    }
    const categoryIds = [...new Set(input.categoryIds)];
    if (categoryIds.length !== input.categoryIds.length)
      throw new BadRequestException('Choose each category once.');
    const db = this.database();
    const [city] = await db
      .select({ id: cities.id })
      .from(cities)
      .where(eq(cities.id, input.cityId))
      .limit(1);
    if (!city) throw new BadRequestException('Choose a city from the available list.');
    const foundCategories = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.id, categoryIds));
    if (foundCategories.length !== categoryIds.length)
      throw new BadRequestException('Choose categories from the available list.');
    return { name, description, categoryIds };
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
