import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

console.log('🔄 Syncing missing tables (purchase_orders, purchase_order_items, suppliers, settings, user_outlet_roles)...');

try {
  // 1. Suppliers
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "suppliers" (
      "id" text PRIMARY KEY NOT NULL,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id"),
      "name" text NOT NULL,
      "phone" text,
      "address" text,
      "created_at" integer NOT NULL,
      "deleted_at" integer
    );
  `);

  // 2. Purchase Orders
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "purchase_orders" (
      "id" text PRIMARY KEY NOT NULL,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id"),
      "supplier_id" text REFERENCES "suppliers"("id"),
      "status" text DEFAULT 'draft' NOT NULL,
      "total" integer DEFAULT 0 NOT NULL,
      "notes" text,
      "ordered_at" integer,
      "received_at" integer,
      "created_by" text NOT NULL REFERENCES "user"("id"),
      "created_at" integer NOT NULL
    );
  `);

  // 3. Purchase Order Items
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "purchase_order_items" (
      "id" text PRIMARY KEY NOT NULL,
      "po_id" text NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
      "product_id" text NOT NULL REFERENCES "products"("id"),
      "quantity" integer NOT NULL,
      "unit_cost" integer NOT NULL
    );
  `);

  // 4. Settings
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "settings" (
      "outlet_id" text NOT NULL REFERENCES "outlets"("id"),
      "key" text NOT NULL,
      "value" text NOT NULL
    );
  `);

  // 5. User Outlet Roles
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "user_outlet_roles" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id") ON DELETE CASCADE,
      "role" text NOT NULL,
      "created_at" integer NOT NULL,
      UNIQUE ("user_id", "outlet_id")
    );
  `);

  console.log('✅ Missing tables synced successfully to Turso DB!');
} catch (err) {
  console.error('❌ Error syncing missing tables:', err);
}

process.exit(0);
