import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DATABASE = Symbol('DATABASE');
export type Database = NodePgDatabase<typeof schema>;

@Injectable()
class DatabaseConnection implements OnApplicationShutdown {
  readonly database: Database | undefined;
  private readonly pool: Pool | undefined;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (connectionString) {
      this.pool = new Pool({ connectionString, max: 10, connectionTimeoutMillis: 5_000 });
      this.database = drizzle(this.pool, { schema });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool?.end();
  }
}

@Global()
@Module({
  providers: [
    DatabaseConnection,
    {
      provide: DATABASE,
      inject: [DatabaseConnection],
      useFactory: (connection: DatabaseConnection): Database | undefined => connection.database,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
