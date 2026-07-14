import { Injectable, OnApplicationShutdown, Logger } from '@nestjs/common';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { getRequiredEnv } from '../arcjet/env';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);
  public readonly db: Database;

  constructor() {
    const connectionString = getRequiredEnv('DATABASE_URL');
    this.pool = new Pool({ connectionString });
    this.db = drizzle({ client: this.pool, schema });
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}

export const databaseProvider = {
  provide: DATABASE_CONNECTION,
  useFactory: (databaseService: DatabaseService) => databaseService.db,
  inject: [DatabaseService],
};

// Remember to add loggers later on.
