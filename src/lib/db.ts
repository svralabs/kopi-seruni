import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';


// Singleton — guard hot-reload Next.js dev
const globalForDb = global as unknown as { db: ReturnType<typeof drizzle> };

const dbUrl = process.env.TURSO_DATABASE_URL || 'file::memory:';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

export const db = globalForDb.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;
