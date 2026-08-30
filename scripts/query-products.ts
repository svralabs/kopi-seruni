import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../src/lib/schema';
import { isNull, eq } from 'drizzle-orm';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

const prds = await db.select({ id: schema.products.id, name: schema.products.name, price: schema.products.price, costPrice: schema.products.costPrice }).from(schema.products).where(isNull(schema.products.deletedAt));
console.log('PRODUCTS:', JSON.stringify(prds, null, 2));

const cats = await db.select().from(schema.categories).where(isNull(schema.categories.deletedAt));
console.log('CATEGORIES:', JSON.stringify(cats, null, 2));

const outlets = await db.select().from(schema.outlets);
console.log('OUTLETS:', JSON.stringify(outlets, null, 2));

process.exit(0);
