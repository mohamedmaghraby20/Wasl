import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import { categories, cities } from '../../db/schema';

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
}
