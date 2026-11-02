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
import { and, asc, desc, eq, ilike, inArray, or, gt, gte, lt, sql, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import { Inject } from '@nestjs/common';
import {
  categories,
  cities,
  communities,
  communityCategories,
  events,
  eventCategories,
  eventRegistrations,
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

const acceptedRegistrationCount = sql<number>`(
  select count(*)::int from ${eventRegistrations}
  where ${eventRegistrations.eventId} = ${events.id}
    and ${eventRegistrations.status} = 'ACCEPTED'
)`;

const memberCount = sql<number>`(select count(*)::int from community_memberships m where m.community_id = ${communities.id} and m.status = 'ACTIVE') + case when ${communities.ownerType} = 'user' and not exists (select 1 from community_memberships m where m.community_id = ${communities.id} and m.status = 'ACTIVE' and m.user_id::text = ${communities.ownerId}) then 1 else 0 end`;

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
  @ApiQuery({ name: 'order', required: false, enum: ['newest', 'member-count'] })
  @ApiOkResponse({ type: CommunityPageDto })
  async listCommunities(@Query() query: Record<string, string | undefined>) {
    const { page, pageSize, filters } = this.parse(query, 'community');
    if (query.order && !['newest', 'member-count'].includes(query.order))
      throw new BadRequestException('Invalid community ordering.');
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
    const where = and(eq(communities.archived, false), ...filters.conditions);
    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: communities.id,
          slug: communities.slug,
          name: communities.name,
          description: communities.description,
          categories: this.categorySelection('community'),
          admissionMode: communities.admissionMode,
          capacity: communities.capacity,
          hostName: sql<string>`COALESCE(${organizations.name}, ${communities.hostName})`,
          ownerType: communities.ownerType,
          ownerId: communities.ownerId,
          memberCount,
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
        .where(where)
        .orderBy(
          ...(query.order === 'member-count' ? [desc(memberCount)] : []),
          desc(communities.createdAt),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(communities)
        .where(where),
    ]);
    const total = Number(countRows[0]?.total ?? 0);
    return {
      items: rows,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  @Get('events')
  @listingQuery()
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'communityId', required: false, type: String })
  @ApiQuery({ name: 'modality', required: false, enum: ['online', 'in-person'] })
  @ApiQuery({ name: 'cityScope', required: false, enum: ['strict', 'include-online'] })
  @ApiQuery({ name: 'upcoming', required: false, type: Boolean })
  @ApiQuery({ name: 'nonCancelled', required: false, type: Boolean })
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
    if (query.communityId) filters.conditions.push(eq(events.communityId, query.communityId));
    if (query.modality && !['online', 'in-person'].includes(query.modality))
      throw new BadRequestException('Invalid event modality.');
    if (query.cityScope && !['strict', 'include-online'].includes(query.cityScope))
      throw new BadRequestException('Invalid event city scope.');
    for (const key of ['upcoming', 'nonCancelled']) {
      if (query[key] !== undefined && !['true', 'false'].includes(query[key]))
        throw new BadRequestException('Invalid event eligibility filter.');
    }
    if (query.modality) filters.conditions.push(eq(events.online, query.modality === 'online'));
    if (query.upcoming === 'true') filters.conditions.push(gt(events.startsAt, new Date()));
    if (query.nonCancelled === 'true') filters.conditions.push(eq(events.cancelled, false));
    const where = and(eq(events.visibility, 'public'), ...filters.conditions);
    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: events.id,
          slug: events.slug,
          title: events.title,
          description: events.description,
          categories: this.categorySelection('event'),
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
          acceptedRegistrationCount,
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
        .where(where)
        .orderBy(asc(events.startsAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(events)
        .where(where),
    ]);
    const total = Number(countRows[0]?.total ?? 0);
    return {
      items: rows,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
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
        categories: this.categorySelection('community'),
        admissionMode: communities.admissionMode,
        capacity: communities.capacity,
        hostName: sql<string>`COALESCE(${organizations.name}, ${communities.hostName})`,
        ownerType: communities.ownerType,
        ownerId: communities.ownerId,
        memberCount,
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
    return row;
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
        categories: this.categorySelection('event'),
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
        acceptedRegistrationCount,
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
    return row;
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
    if (query.city) {
      if (resource === 'community') conditions.push(eq(communities.cityId, query.city));
      else if (query.cityScope === 'include-online')
        conditions.push(or(eq(events.cityId, query.city), eq(events.online, true))!);
      else conditions.push(eq(events.cityId, query.city));
    }
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
  private categorySelection(kind: 'community' | 'event') {
    const link = kind === 'community' ? communityCategories : eventCategories;
    const resourceId = kind === 'community' ? communityCategories.communityId : eventCategories.eventId;
    const id = kind === 'community' ? communities.id : events.id;
    return sql<Pick<typeof categories.$inferSelect, 'id' | 'nameEn' | 'nameAr' | 'nameTr'>[]>`(
      select coalesce(json_agg(json_build_object(
        'id', ${categories.id}, 'nameEn', ${categories.nameEn},
        'nameAr', ${categories.nameAr}, 'nameTr', ${categories.nameTr}
      )), '[]'::json)
      from ${link} inner join ${categories} on ${link.categoryId} = ${categories.id}
      where ${resourceId} = ${id}
    )`;
  }
}
