import { config } from 'dotenv';

config({ path: '.env.local' });

/** @type {import('drizzle-kit').Config} */
export default {
  schema: './src/lib/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
};

