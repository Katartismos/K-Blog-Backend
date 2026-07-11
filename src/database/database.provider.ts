import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { getRequiredEnv } from '../arcjet/env';
import * as schema from './schema';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProvider = {
  provide: DATABASE_CONNECTION,
  useFactory: () => {
    const connectionString = getRequiredEnv('DATABASE_URL');
    const pool = new Pool({ connectionString });
    return drizzle({ client: pool, schema });
  },
};
export type Database = ReturnType<typeof drizzle<typeof schema>>;
