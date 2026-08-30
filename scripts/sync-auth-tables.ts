import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

console.log('🔄 Menyesuaikan tabel auth...');

try {
  await db.run(sql`DROP TABLE IF EXISTS "account"`);
  await db.run(sql`DROP TABLE IF EXISTS "session"`);
  await db.run(sql`DROP TABLE IF EXISTS "verification"`);
  await db.run(sql`DROP TABLE IF EXISTS "user_outlet_roles"`);
  await db.run(sql`DROP TABLE IF EXISTS "user"`);



  // Create BetterAuth standard tables
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "user" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "email_verified" integer DEFAULT 0 NOT NULL,
      "image" text,
      "created_at" integer NOT NULL,
      "updated_at" integer NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "session" (
      "id" text PRIMARY KEY NOT NULL,
      "expires_at" integer NOT NULL,
      "token" text NOT NULL UNIQUE,
      "created_at" integer NOT NULL,
      "updated_at" integer NOT NULL,
      "ip_address" text,
      "user_agent" text,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "account" (
      "id" text PRIMARY KEY NOT NULL,
      "account_id" text NOT NULL,
      "provider_id" text NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "access_token" text,
      "refresh_token" text,
      "id_token" text,
      "access_token_expires_at" integer,
      "refresh_token_expires_at" integer,
      "scope" text,
      "password" text,
      "issuer" text,
      "created_at" integer NOT NULL,

      "updated_at" integer NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "verification" (
      "id" text PRIMARY KEY NOT NULL,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expires_at" integer NOT NULL,
      "created_at" integer NOT NULL,
      "updated_at" integer NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS "user_outlet_roles" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "outlet_id" text NOT NULL REFERENCES "outlets"("id") ON DELETE CASCADE,
      "role" text NOT NULL,
      "created_at" integer NOT NULL
    );
  `);


  console.log('✅ Tabel auth BetterAuth siap!');
} catch (err) {
  console.error('Error:', err);
}

process.exit(0);
