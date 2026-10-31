import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { asc, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import { categories, cities } from '../../db/schema';

/** Readable id for user-created categories; Arabic-only names fall back to a random id. */
export function categorySlug(name: string): string {
  return name
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

@Injectable()
export class ReferenceDataRepository {
  constructor(@Inject(DATABASE) private readonly database: Database | undefined) {}

  async listCities(): Promise<(typeof cities.$inferSelect)[]> {
    if (!this.database) throw new ServiceUnavailableException('Database is not configured.');
    return this.database.select().from(cities).orderBy(asc(cities.nameTr));
  }

  async listCategories(): Promise<(typeof categories.$inferSelect)[]> {
    if (!this.database) throw new ServiceUnavailableException('Database is not configured.');
    return this.database.select().from(categories).orderBy(asc(categories.nameTr));
  }

  async createCategory(rawName: string): Promise<typeof categories.$inferSelect> {
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 40)
      throw new BadRequestException('Category name must be 2 to 40 characters.');
    if (!this.database) throw new ServiceUnavailableException('Database is not configured.');

    const findByName = () =>
      this.database!
        .select()
        .from(categories)
        .where(sql`lower(${categories.nameTr}) = ${name.toLowerCase()}`)
        .limit(1);

    const [existing] = await findByName();
    if (existing) return existing;

    const id = `${categorySlug(name) || 'category'}-${randomUUID().slice(0, 8)}`;
    await this.database
      .insert(categories)
      .values({ id, nameEn: name, nameAr: name, nameTr: name })
      .onConflictDoNothing({ target: categories.nameTr });
    // A concurrent request may have inserted the same name; return that row too.
    const [created] = await findByName();
    return created!;
  }
}

