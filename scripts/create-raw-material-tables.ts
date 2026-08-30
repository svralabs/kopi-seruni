import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../src/lib/schema';
import { sql } from 'drizzle-orm';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

// Create the 4 new raw material tables directly
await db.run(sql`
  CREATE TABLE IF NOT EXISTS raw_materials (
    id TEXT PRIMARY KEY,
    outlet_id TEXT NOT NULL REFERENCES outlets(id),
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'gr' CHECK(unit IN ('gr','ml','pcs','lbr','kg','liter')),
    cost_per_unit INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER
  )
`);

await db.run(sql`
  CREATE INDEX IF NOT EXISTS idx_raw_materials_outlet ON raw_materials(outlet_id)
`);

await db.run(sql`
  CREATE TABLE IF NOT EXISTS product_recipes (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    raw_material_id TEXT NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
    quantity_used INTEGER NOT NULL
  )
`);

await db.run(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS uq_recipe_product_material ON product_recipes(product_id, raw_material_id)
`);

await db.run(sql`
  CREATE INDEX IF NOT EXISTS idx_recipe_product ON product_recipes(product_id)
`);

await db.run(sql`
  CREATE TABLE IF NOT EXISTS raw_material_stock (
    id TEXT PRIMARY KEY,
    outlet_id TEXT NOT NULL REFERENCES outlets(id),
    raw_material_id TEXT NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

await db.run(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS uq_rms_outlet_material ON raw_material_stock(outlet_id, raw_material_id)
`);

await db.run(sql`
  CREATE TABLE IF NOT EXISTS raw_material_movements (
    id TEXT PRIMARY KEY,
    outlet_id TEXT NOT NULL REFERENCES outlets(id),
    raw_material_id TEXT NOT NULL REFERENCES raw_materials(id),
    type TEXT NOT NULL CHECK(type IN ('purchase','usage','adjustment','waste')),
    quantity INTEGER NOT NULL,
    reference_id TEXT,
    notes TEXT,
    created_by TEXT NOT NULL REFERENCES user(id),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

await db.run(sql`
  CREATE INDEX IF NOT EXISTS idx_rmm_outlet_material ON raw_material_movements(outlet_id, raw_material_id, created_at)
`);

console.log('✅ All 4 raw material tables created successfully!');
process.exit(0);
