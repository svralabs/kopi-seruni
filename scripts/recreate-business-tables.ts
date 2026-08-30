import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

console.log('🔄 Recreating tables with clean FK referencing "user"...');

try {
  await db.run(sql`DROP VIEW IF EXISTS "users"`);

  // Drop dependent tables in order
  await db.run(sql`DROP TABLE IF EXISTS "profit_sharing_ledger"`);
  await db.run(sql`DROP TABLE IF EXISTS "profit_sharing_rules"`);
  await db.run(sql`DROP TABLE IF EXISTS "stock_movements"`);
  await db.run(sql`DROP TABLE IF EXISTS "stock"`);
  await db.run(sql`DROP TABLE IF EXISTS "purchase_orders"`);
  await db.run(sql`DROP TABLE IF EXISTS "expenses"`);
  await db.run(sql`DROP TABLE IF EXISTS "order_items"`);
  await db.run(sql`DROP TABLE IF EXISTS "orders"`);
  await db.run(sql`DROP TABLE IF EXISTS "shifts"`);

  // 1. Shifts
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "shifts" (
      "id" text PRIMARY KEY NOT NULL,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id"),
      "kasir_id" text NOT NULL REFERENCES "user"("id"),
      "opened_at" integer NOT NULL,
      "closed_at" integer,
      "opening_cash" integer DEFAULT 0 NOT NULL,
      "closing_cash" integer,
      "expected_cash" integer,
      "notes" text
    );
  `);

  // 2. Orders
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "orders" (
      "id" text PRIMARY KEY NOT NULL,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id"),
      "shift_id" text REFERENCES "shifts"("id"),
      "kasir_id" text REFERENCES "user"("id"),
      "customer_name" text,
      "subtotal" integer NOT NULL,
      "discount_id" text REFERENCES "discounts"("id"),
      "discount_amount" integer DEFAULT 0 NOT NULL,
      "tax_rate" integer DEFAULT 0 NOT NULL,
      "tax_amount" integer DEFAULT 0 NOT NULL,
      "total" integer NOT NULL,
      "payment_method" text DEFAULT 'cash' NOT NULL,
      "status" text DEFAULT 'completed' NOT NULL,
      "notes" text,
      "created_at" integer NOT NULL,
      "voided_at" integer,
      "voided_by" text REFERENCES "user"("id")
    );
  `);

  // 3. Order Items
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "order_items" (
      "id" text PRIMARY KEY NOT NULL,
      "order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
      "product_id" text NOT NULL REFERENCES "products"("id"),
      "product_name" text NOT NULL,
      "product_price" integer NOT NULL,
      "cost_price" integer DEFAULT 0 NOT NULL,
      "quantity" integer NOT NULL,
      "subtotal" integer NOT NULL,
      "notes" text
    );
  `);

  // 4. Expenses
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "expenses" (
      "id" text PRIMARY KEY NOT NULL,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id"),
      "category_id" text REFERENCES "expense_categories"("id"),
      "created_by" text NOT NULL REFERENCES "user"("id"),
      "description" text NOT NULL,
      "amount" integer NOT NULL,
      "payment_method" text DEFAULT 'cash' NOT NULL,
      "expense_date" integer NOT NULL,
      "created_at" integer NOT NULL
    );
  `);

  // 5. Stock
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "stock" (
      "id" text PRIMARY KEY NOT NULL,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id"),
      "product_id" text NOT NULL REFERENCES "products"("id"),
      "quantity" integer DEFAULT 0 NOT NULL,
      "unit" text DEFAULT 'pcs' NOT NULL,
      "min_stock" integer DEFAULT 0 NOT NULL,
      "updated_at" integer NOT NULL
    );
  `);

  // 6. Stock Movements
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "stock_movements" (
      "id" text PRIMARY KEY NOT NULL,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id"),
      "product_id" text NOT NULL REFERENCES "products"("id"),
      "type" text NOT NULL,
      "quantity" integer NOT NULL,
      "reference_id" text,
      "notes" text,
      "created_by" text NOT NULL REFERENCES "user"("id"),
      "created_at" integer NOT NULL
    );
  `);

  // 7. Profit Sharing Rules
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "profit_sharing_rules" (
      "id" text PRIMARY KEY NOT NULL,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id"),
      "name" text NOT NULL,
      "percentage" integer NOT NULL,
      "is_active" integer DEFAULT 1 NOT NULL,
      "created_at" integer NOT NULL
    );
  `);

  // 8. Profit Sharing Ledger
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "profit_sharing_ledger" (
      "id" text PRIMARY KEY NOT NULL,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id"),
      "rule_id" text NOT NULL REFERENCES "profit_sharing_rules"("id"),
      "period_start" integer NOT NULL,
      "period_end" integer NOT NULL,
      "net_profit" integer NOT NULL,
      "share_amount" integer NOT NULL,
      "status" text DEFAULT 'pending' NOT NULL,
      "paid_at" integer,
      "notes" text,
      "created_at" integer NOT NULL
    );
  `);

  console.log('✅ Semua tabel bisnis berhasil disinkronkan ke "user" table!');
} catch (e) {
  console.error('Error recreating tables:', e);
}

process.exit(0);
