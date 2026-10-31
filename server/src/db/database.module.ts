import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DATABASE = Symbol('DATABASE');
export const PROVIDER_DATABASE = Symbol('PROVIDER_DATABASE');
export type Database = NodePgDatabase<typeof schema>;

@Injectable()
class DatabaseConnection implements OnApplicationShutdown {
  readonly database: Database | undefined;
  readonly providerDatabase: Database | undefined;
  private readonly pool: Pool | undefined;
  private readonly providerPool: Pool | undefined;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (connectionString) {
      // Provider coordination may hold locks across HTTP calls; reserve API capacity separately.
      this.pool = new Pool({ connectionString, max: 8, connectionTimeoutMillis: 5_000 });
      this.providerPool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5_000 });
      this.database = drizzle(this.pool, { schema });
      this.providerDatabase = drizzle(this.providerPool, { schema });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.pool?.end(), this.providerPool?.end()]);
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
    {
      provide: PROVIDER_DATABASE,
      inject: [DatabaseConnection],
      useFactory: (connection: DatabaseConnection): Database | undefined => connection.providerDatabase,
    },
  ],
  exports: [DATABASE, PROVIDER_DATABASE],
})
export class DatabaseModule {}
