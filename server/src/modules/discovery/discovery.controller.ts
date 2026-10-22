import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
  applyDecorators,
} from '@nestjs/common';
import { ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { and, asc, desc, eq, ilike, inArray, or, gte, lt, sql, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import { Inject } from '@nestjs/common';
import {
  categories,
  cities,
  communities,
  communityCategories,
  events,
  eventCategories,
  organizations,
} from '../../db/schema';
import { ReferenceDataRepository } from './reference-data.repository';
import {
  CategoryPublicDto,
  CityPublicDto,
  CommunityPageDto,
  CommunityPublicDto,
  EventPageDto,
  EventPublicDto,
} from './discovery.dto';

const listingQuery = () =>
  applyDecorators(
    ApiQuery({ name: 'q', required: false, type: String }),
    ApiQuery({ name: 'city', required: false, type: String }),
    ApiQuery({ name: 'category', required: false, type: String }),
    ApiQuery({ name: 'lang', required: false, enum: ['en', 'ar', 'tr'] }),
    ApiQuery({ name: 'page', required: false, type: Number }),
    ApiQuery({ name: 'pageSize', required: false, type: Number }),
  );

@Controller()
export class DiscoveryController {
  constructor(
    @Inject(DATABASE) private readonly db: Database | undefined,
    private readonly reference: ReferenceDataRepository,
  ) {}

  @Get('reference/cities') @ApiOkResponse({ type: CityPublicDto, isArray: true }) cities() {
    return this.reference.listCities();
  }
  @Get('reference/categories')
  @ApiOkResponse({ type: CategoryPublicDto, isArray: true })
  categories() {
    return this.reference.listCategories();
  }

  @Get('communities')
  @listingQuery()
  @ApiOkResponse({ type: CommunityPageDto })
  async listCommunities(@Query() query: Record<string, string | undefined>) {
    const { page, pageSize, filters } = this.parse(query, 'community');
    const db = this.database();
    if (filters.category)
      filters.conditions.push(
        inArray(
          communities.id,
          db
            .select({ id: communityCategories.communityId })
            .from(communityCategories)
            .where(eq(communityCategories.categoryId, filters.category)),
        ),
      );
    const rows = await db
      .select({
        id: communities.id,
        slug: communities.slug,
        name: communities.name,
        description: communities.description,
        admissionMode: communities.admissionMode,
        capacity: communities.capacity,
        hostName: sql<string>`COALESCE(${organizations.name}, ${communities.hostName})`,
        ownerType: communities.ownerType,
        ownerId: communities.ownerId,
        organizationSlug: organizations.slug,
        cityId: cities.id,
        cityName: this.cityName(query.lang),
      })
      .from(communities)
      .innerJoin(cities, eq(communities.cityId, cities.id))
      .leftJoin(
        organizations,
        sql`${organizations.id}::text = ${communities.ownerId} and ${communities.ownerType} = 'organization'`,
      )
      .where(and(eq(communities.archived, false), ...filters.conditions))
      .orderBy(desc(communities.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { items: await this.addCommunityCategories(rows), page, pageSize };
  }

  @Get('events')
  @listingQuery()
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiOkResponse({ type: EventPageDto })
  async listEvents(@Query() query: Record<string, string | undefined>) {
    const { page, pageSize, filters } = this.parse(query, 'event');
    const db = this.database();
    if (filters.category)
      filters.conditions.push(
        inArray(
          events.id,
          db
            .select({ id: eventCategories.eventId })
            .from(eventCategories)
            .where(eq(eventCategories.categoryId, filters.category)),
        ),
      );
    if (query.from) filters.conditions.push(gte(events.startsAt, this.date(query.from)));
    if (query.to) filters.conditions.push(lt(events.startsAt, this.date(query.to, true)));
    const rows = await db
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        description: events.description,
        visibility: events.visibility,
        hostName: sql<string>`COALESCE(${organizations.name}, ${events.hostName})`,
        hostType: events.hostType,
        hostId: events.hostId,
        organizationSlug: organizations.slug,
        online: events.online,
        locationName: events.locationName,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        cancelled: events.cancelled,
        capacity: events.capacity,
        admissionMode: events.admissionMode,
        cityId: cities.id,
        cityName: this.cityName(query.lang),
      })
      .from(events)
      .leftJoin(cities, eq(cities.id, events.cityId))
      .leftJoin(
        organizations,
        sql`${organizations.id}::text = ${events.hostId} and ${events.hostType} = 'organization'`,
      )
      .where(and(eq(events.visibility, 'public'), ...filters.conditions))
      .orderBy(asc(events.startsAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    return { items: await this.addEventCategories(rows), page, pageSize };
  }

  @Get('communities/:id')
  @ApiOkResponse({ type: CommunityPublicDto })
  @ApiQuery({ name: 'lang', required: false, enum: ['en', 'ar', 'tr'] })
  async community(@Param('id') id: string, @Query() query: Record<string, string | undefined>) {
    const db = this.database();
    const [row] = await db
      .select({
        id: communities.id,
        slug: communities.slug,
        name: communities.name,
        description: communities.description,
        admissionMode: communities.admissionMode,
        capacity: communities.capacity,
        hostName: sql<string>`COALESCE(${organizations.name}, ${communities.hostName})`,
        ownerType: communities.ownerType,
        ownerId: communities.ownerId,
        organizationSlug: organizations.slug,
        cityId: cities.id,
        cityName: this.cityName(query.lang),
      })
      .from(communities)
      .innerJoin(cities, eq(communities.cityId, cities.id))
      .leftJoin(
        organizations,
        sql`${organizations.id}::text = ${communities.ownerId} and ${communities.ownerType} = 'organization'`,
      )
      .where(
        and(or(eq(communities.id, id), eq(communities.slug, id)), eq(communities.archived, false)),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Community not found.');
    return (await this.addCommunityCategories([row]))[0];
  }

  @Get('events/:id')
  @ApiOkResponse({ type: EventPublicDto })
  @ApiQuery({ name: 'lang', required: false, enum: ['en', 'ar', 'tr'] })
  async event(@Param('id') id: string, @Query() query: Record<string, string | undefined>) {
    const db = this.database();
    const [row] = await db
      .select({
        id: events.id,
        slug: events.slug,
        title: events.title,
        description: events.description,
        visibility: events.visibility,
        hostName: sql<string>`COALESCE(${organizations.name}, ${events.hostName})`,
        hostType: events.hostType,
        hostId: events.hostId,
        organizationSlug: organizations.slug,
        online: events.online,
        locationName: events.locationName,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        cancelled: events.cancelled,
        capacity: events.capacity,
        admissionMode: events.admissionMode,
        cityId: cities.id,
        cityName: this.cityName(query.lang),
      })
      .from(events)
      .leftJoin(cities, eq(cities.id, events.cityId))
      .leftJoin(
        organizations,
        sql`${organizations.id}::text = ${events.hostId} and ${events.hostType} = 'organization'`,
      )
      .where(or(eq(events.id, id), eq(events.slug, id)))
      .limit(1);
    if (!row) throw new NotFoundException('Event not found.');
    return (await this.addEventCategories([row]))[0];
  }

  private parse(query: Record<string, string | undefined>, resource: 'community' | 'event') {
    const page = Number(query.page ?? 1),
      pageSize = Number(query.pageSize ?? 20);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    )
      throw new BadRequestException('Invalid pagination.');
    const conditions: SQL[] = [];
    if (query.q?.trim()) {
      const keyword = query.q.trim();
      const condition =
        resource === 'community'
          ? or(
              ilike(communities.name, `%${keyword}%`),
              ilike(communities.description, `%${keyword}%`),
            )
          : or(ilike(events.title, `%${keyword}%`), ilike(events.description, `%${keyword}%`));
      if (condition) conditions.push(condition);
    }
    if (query.city)
      conditions.push(
        resource === 'community'
          ? eq(communities.cityId, query.city)
          : eq(events.cityId, query.city),
      );
    return { page, pageSize, filters: { conditions, category: query.category } };
  }
  private date(value: string, endOfSelectedDate = false) {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]);
      const day = Number(dateOnly[3]);
      const check = new Date(Date.UTC(year, month - 1, day));
      if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day
      ) {
        throw new BadRequestException('Invalid date filter.');
      }
    }
    const date = dateOnly
      ? new Date(
          `${this.adjustTurkeyDate(dateOnly[1]!, dateOnly[2]!, dateOnly[3]!, endOfSelectedDate)}T00:00:00+03:00`,
        )
      : new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date filter.');
    return date;
  }
  private adjustTurkeyDate(year: string, month: string, day: string, nextDay: boolean) {
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + Number(nextDay)));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }
  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }
  private cityName(language?: string) {
    return language === 'ar' ? cities.nameAr : language === 'tr' ? cities.nameTr : cities.nameEn;
  }
  private async addCommunityCategories<T extends { id: string }>(rows: T[]) {
    if (!rows.length) return [];
    const db = this.database();
    const ids = rows.map((row) => row.id);
    const links = await db
      .select({
        resourceId: communityCategories.communityId,
        id: categories.id,
        nameEn: categories.nameEn,
        nameAr: categories.nameAr,
        nameTr: categories.nameTr,
      })
      .from(communityCategories)
      .innerJoin(categories, eq(communityCategories.categoryId, categories.id))
      .where(inArray(communityCategories.communityId, ids));
    return this.attachCategories(rows, links);
  }
  private async addEventCategories<T extends { id: string }>(rows: T[]) {
    if (!rows.length) return [];
    const db = this.database();
    const ids = rows.map((row) => row.id);
    const links = await db
      .select({
        resourceId: eventCategories.eventId,
        id: categories.id,
        nameEn: categories.nameEn,
        nameAr: categories.nameAr,
        nameTr: categories.nameTr,
      })
      .from(eventCategories)
      .innerJoin(categories, eq(eventCategories.categoryId, categories.id))
      .where(inArray(eventCategories.eventId, ids));
    return this.attachCategories(rows, links);
  }
  private attachCategories<T extends { id: string }>(
    rows: T[],
    links: { resourceId: string; id: string; nameEn: string; nameAr: string; nameTr: string }[],
  ) {
    return rows.map((row) => ({
      ...row,
      categories: links
        .filter((link) => link.resourceId === row.id)
        .map((link) => ({
          id: link.id,
          nameEn: link.nameEn,
          nameAr: link.nameAr,
          nameTr: link.nameTr,
        })),
    }));
  }
}
