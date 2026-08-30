/**
 * Kopi Seruni — Dummy Data Seeder
 * Generate: users, categories, products clone, raw materials, recipes,
 *           shifts + 50 orders/day × 3 outlets × Jun-Aug 2026,
 *           expenses, profit sharing rules + ledger
 *
 * Run: bun scripts/seed-dummy.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql, eq, and, inArray } from 'drizzle-orm';
import * as schema from '../src/lib/schema';
import {
  outlets, categories, products, shifts, orders, orderItems,
  stock, stockMovements, expenses, expenseCategories,
  profitSharingRules, profitSharingLedger, userOutletRoles,
} from '../src/lib/schema';
import { user as userTable, account as accountTable } from '../src/lib/auth-schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

// ── helpers ─────────────────────────────────────────────────────────
const uid = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

function unixDay(year: number, month: number, day: number, hour = 8, min = 0): number {
  return Math.floor(new Date(year, month - 1, day, hour, min, 0).getTime() / 1000);
}

// WIB = UTC+7 → offset 7*3600
function unixDayWIB(year: number, month: number, day: number, hour = 8, min = 0): number {
  return Math.floor(Date.UTC(year, month - 1, day, hour - 7, min, 0) / 1000);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// BetterAuth scrypt password hash — use a pre-computed hash for 'seruni123'
// We'll use better-auth's API via HTTP since server is running
async function createUserViaAPI(name: string, email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.text();
      // User might already exist
      if (err.includes('already') || err.includes('exist') || res.status === 422 || res.status === 409) {
        // Try to find existing user
        const [existing] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, email)).limit(1);
        return existing?.id ?? null;
      }
      console.warn(`  ⚠ Failed to create ${email}: ${res.status} ${err.slice(0,100)}`);
      return null;
    }
    const data = await res.json() as { user?: { id: string } };
    return data.user?.id ?? null;
  } catch (e) {
    console.warn(`  ⚠ HTTP error for ${email}:`, (e as Error).message.slice(0, 80));
    return null;
  }
}

// ── CONSTANTS ──────────────────────────────────────────────────────
const OUTLET_IDS = ['out_default', 'out_dago', 'out_braga'];
const OUTLET_NAMES: Record<string, string> = {
  'out_default': 'Pusat',
  'out_dago': 'Dago',
  'out_braga': 'Braga',
};

// Raw materials master (shared concept, cloned per outlet)
const RAW_MATERIALS_MASTER = [
  { name: 'Espresso Shot', unit: 'ml' as const, costPerUnit: 200 },       // rm_0
  { name: 'Susu Segar', unit: 'ml' as const, costPerUnit: 10 },            // rm_1
  { name: 'Susu Bubuk', unit: 'gr' as const, costPerUnit: 50 },            // rm_2
  { name: 'Creamer Bubuk', unit: 'gr' as const, costPerUnit: 40 },         // rm_3
  { name: 'Gula Aren Cair', unit: 'ml' as const, costPerUnit: 20 },        // rm_4
  { name: 'Simple Syrup', unit: 'ml' as const, costPerUnit: 10 },          // rm_5
  { name: 'Greentea Powder', unit: 'gr' as const, costPerUnit: 80 },       // rm_6
  { name: 'Chocolate Powder', unit: 'gr' as const, costPerUnit: 60 },      // rm_7
  { name: 'Red Velvet Powder', unit: 'gr' as const, costPerUnit: 70 },     // rm_8
  { name: 'Yakult', unit: 'ml' as const, costPerUnit: 18 },                // rm_9
  { name: 'Lemon Segar', unit: 'gr' as const, costPerUnit: 25 },           // rm_10
  { name: 'Lychee Syrup', unit: 'ml' as const, costPerUnit: 30 },          // rm_11
  { name: 'V60 Filter Paper', unit: 'pcs' as const, costPerUnit: 500 },    // rm_12
  { name: 'Kopi Arabica', unit: 'gr' as const, costPerUnit: 300 },         // rm_13
  { name: 'Kopi Robusta', unit: 'gr' as const, costPerUnit: 150 },         // rm_14
  { name: 'Cup Plastik Medium', unit: 'pcs' as const, costPerUnit: 400 },  // rm_15
  { name: 'Sedotan', unit: 'pcs' as const, costPerUnit: 50 },              // rm_16
  { name: 'Kantong Plastik', unit: 'pcs' as const, costPerUnit: 150 },     // rm_17
];

// Recipe per product name → array of [rmIndex, qty]
// HPP = SUM(costPerUnit × qty)
const RECIPES_BY_NAME: Record<string, [number, number][]> = {
  'Cafe Latte':           [[0,30],[1,200],[5,20],[15,1],[16,1]],   // HPP 6000+2000+200+400+50=8650→8650
  'Black':                [[0,30],[5,10],[15,1],[16,1]],            // 6000+100+400+50=6550
  'Tubruk Susu':          [[14,20],[1,150],[4,30],[15,1],[16,1]],   // 3000+1500+600+400+50=5550
  'Kopi Susu KMP':        [[14,15],[1,150],[4,20],[15,1],[16,1]],   // 2250+1500+400+400+50=4600
  'Tubruk Arabica':       [[13,15],[5,10],[15,1],[16,1]],           // 4500+100+400+50=5050
  'Espresso':             [[0,30],[15,1]],                          // 6000+400=6400
  'Chocolate':            [[7,30],[1,200],[5,20],[15,1],[16,1]],    // 1800+2000+200+400+50=4450
  'Greentea Latte':       [[6,25],[1,200],[5,20],[15,1],[16,1]],    // 2000+2000+200+400+50=4650
  'Red Velvet':           [[8,25],[1,200],[5,20],[15,1],[16,1]],    // 1750+2000+200+400+50=4400
  'Lemon Tea':            [[10,30],[5,30],[15,1],[16,1]],            // 750+300+400+50=1500
  'Lychee Tea':           [[11,40],[5,20],[15,1],[16,1]],           // 1200+200+400+50=1850
  'Teh Susu':             [[1,150],[5,20],[15,1],[16,1]],            // 1500+200+400+50=2150
  'Yakult Strawberry':    [[9,60],[11,20],[5,10],[15,1],[16,1]],    // 1080+600+100+400+50=2230
  'Yakult Lychee':        [[9,60],[11,30],[5,10],[15,1],[16,1]],    // 1080+900+100+400+50=2530
  'V-60':                 [[13,20],[12,1],[15,1],[16,1]],            // 6000+500+400+50=6950
  'Japanese Iced Coffe':  [[13,20],[5,10],[15,1],[16,1]],           // 6000+100+400+50=6550
  'Citrus Kick Black':    [[0,30],[10,20],[5,15],[15,1],[16,1]],    // 6000+500+150+400+50=7100
  'Berry Volcano':        [[0,30],[11,30],[5,15],[15,1],[16,1]],    // 6000+900+150+400+50=7500
  'Lychee Breeze':        [[0,30],[11,40],[5,15],[15,1],[16,1]],    // 6000+1200+150+400+50=7800
  'Kopi Susu Aren':       [[0,30],[1,150],[4,30],[15,1],[16,1]],    // 6000+1500+600+400+50=8550
  'Golden Magic':         [[0,30],[4,30],[3,15],[15,1],[16,1]],     // 6000+600+600+400+50=7650
  'Butter Is Better':     [[0,30],[1,150],[3,20],[5,20],[15,1],[16,1]], // 6000+1500+800+200+400+50=8950
  'Es Kopi Pandan Seruni':[[0,30],[1,200],[4,30],[5,20],[15,1],[16,1]], // 6000+2000+600+200+400+50=9250
  // Food items use different materials — keep minimal
  'Sosis':                [[15,1],[17,1]],                          // 400+150=550
  'Nugget':               [[15,1],[17,1]],
  'Kentang':              [[15,1],[17,1]],
  'Mix Platter':          [[15,1],[17,1]],
  'Roti Panggang':        [[15,1],[17,1]],
  'Mie Goreng':           [[15,1],[17,1]],
  'Mie Rebus':            [[15,1],[17,1]],
  'Telur':                [[17,1]],
};

// Categories master
const CATEGORIES_MASTER = [
  'Coffee', 'Tea & Milk Based', 'Yakult Series', 'Filter Coffe',
  'Coffee Mocktail', 'Pasti Seru', 'Small Bites', 'Food Fillers', 'Menu Tambahan',
];

// Products per category (name → category index in CATEGORIES_MASTER, price, costPrice placeholder)
const PRODUCTS_MASTER: { name: string; cat: number; price: number }[] = [
  { name: 'Cafe Latte',        cat: 0, price: 18000 },
  { name: 'Black',             cat: 0, price: 15000 },
  { name: 'Tubruk Susu',       cat: 0, price: 12000 },
  { name: 'Kopi Susu KMP',     cat: 0, price: 12000 },
  { name: 'Tubruk Arabica',    cat: 0, price: 10000 },
  { name: 'Espresso',          cat: 8, price: 5000  },
  { name: 'Chocolate',         cat: 1, price: 18000 },
  { name: 'Greentea Latte',    cat: 1, price: 18000 },
  { name: 'Red Velvet',        cat: 1, price: 18000 },
  { name: 'Lemon Tea',         cat: 1, price: 12000 },
  { name: 'Lychee Tea',        cat: 1, price: 15000 },
  { name: 'Teh Susu',          cat: 1, price: 10000 },
  { name: 'Yakult Strawberry', cat: 2, price: 15000 },
  { name: 'Yakult Lychee',     cat: 2, price: 15000 },
  { name: 'V-60',              cat: 3, price: 20000 },
  { name: 'Japanese Iced Coffe', cat: 3, price: 20000 },
  { name: 'Citrus Kick Black', cat: 4, price: 18000 },
  { name: 'Berry Volcano',     cat: 4, price: 18000 },
  { name: 'Lychee Breeze',     cat: 4, price: 18000 },
  { name: 'Kopi Susu Aren',    cat: 5, price: 15000 },
  { name: 'Golden Magic',      cat: 5, price: 18000 },
  { name: 'Butter Is Better',  cat: 5, price: 18000 },
  { name: 'Es Kopi Pandan Seruni', cat: 5, price: 24000 },
  { name: 'Sosis',             cat: 6, price: 10000 },
  { name: 'Nugget',            cat: 6, price: 10000 },
  { name: 'Kentang',           cat: 6, price: 10000 },
  { name: 'Mix Platter',       cat: 6, price: 15000 },
  { name: 'Roti Panggang',     cat: 7, price: 15000 },
  { name: 'Mie Goreng',        cat: 7, price: 10000 },
  { name: 'Mie Rebus',         cat: 7, price: 10000 },
  { name: 'Telur',             cat: 8, price: 5000  },
];

// Product weights for random order generation (popular items have higher weight)
const PRODUCT_WEIGHTS = [
  10, 8, 6, 6, 4, 2, 7, 7, 7, 5, 5, 4, 6, 6, 3, 3, 5, 5, 5, 6, 5, 5, 8,
  3, 3, 3, 2, 2, 3, 3, 1,
];

// Expense categories
const EXPENSE_CATS = [
  'Bahan Baku', 'Listrik & Air', 'Gaji & Upah', 'Kebersihan & Sanitasi',
  'Perlengkapan Toko', 'Transportasi', 'Lain-lain',
];

// Expense templates per category [catIdx, description, minAmount, maxAmount]
const EXPENSE_TEMPLATES: [number, string, number, number][] = [
  [0, 'Pembelian Susu Segar', 150000, 300000],
  [0, 'Pembelian Kopi Arabica', 200000, 500000],
  [0, 'Pembelian Bahan Minuman', 100000, 250000],
  [0, 'Pembelian Cup & Sedotan', 80000, 150000],
  [1, 'Tagihan Listrik', 200000, 400000],
  [1, 'Tagihan Air', 50000, 100000],
  [2, 'Gaji Kasir Harian', 100000, 150000],
  [3, 'Sabun & Lap Kebersihan', 30000, 80000],
  [4, 'Perlengkapan Kasir', 50000, 150000],
  [5, 'Ongkos Kirim Bahan', 30000, 70000],
  [6, 'Biaya Tak Terduga', 20000, 100000],
];

// ── SEEDER FUNCTIONS ─────────────────────────────────────────────────

async function seedUsersAndRoles(): Promise<{
  ownerIds: string[];
  managerIds: Record<string, string>;
  kasirIds: Record<string, string>;
}> {
  console.log('\n📦 Seeding users...');

  const users = [
    { name: 'Andri Setiawan', email: 'owner1@kopi-seruni.com', role: 'owner', outlets: OUTLET_IDS },
    { name: 'Budi Santoso', email: 'owner2@kopi-seruni.com', role: 'owner', outlets: OUTLET_IDS },
    { name: 'Citra Dewi', email: 'owner3@kopi-seruni.com', role: 'owner', outlets: OUTLET_IDS },
    { name: 'Dani Manajer Pusat', email: 'manager.pusat@kopi-seruni.com', role: 'manager', outlets: ['out_default'] },
    { name: 'Eko Manajer Dago', email: 'manager.dago@kopi-seruni.com', role: 'manager', outlets: ['out_dago'] },
    { name: 'Fani Manajer Braga', email: 'manager.braga@kopi-seruni.com', role: 'manager', outlets: ['out_braga'] },
    { name: 'Gita Kasir Pusat', email: 'kasir.pusat@kopi-seruni.com', role: 'kasir', outlets: ['out_default'] },
    { name: 'Hendra Kasir Dago', email: 'kasir.dago@kopi-seruni.com', role: 'kasir', outlets: ['out_dago'] },
    { name: 'Indah Kasir Braga', email: 'kasir.braga@kopi-seruni.com', role: 'kasir', outlets: ['out_braga'] },
  ];

  const ownerIds: string[] = [];
  const managerIds: Record<string, string> = {};
  const kasirIds: Record<string, string> = {};

  for (const u of users) {
    console.log(`  Creating ${u.email}...`);
    let userId = await createUserViaAPI(u.name, u.email, 'seruni123');
    if (!userId) {
      // Fallback: check if user already exists
      const [existing] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, u.email)).limit(1);
      userId = existing?.id ?? null;
    }
    if (!userId) {
      console.warn(`  ⚠ Skipping ${u.email} — could not create or find user`);
      continue;
    }

    console.log(`  ✓ ${u.name} (${userId})`);

    // Assign roles
    for (const outletId of u.outlets) {
      try {
        await db.insert(userOutletRoles).values({
          id: uid('uor'),
          userId,
          outletId,
          role: u.role as 'owner' | 'manager' | 'kasir',
        }).onConflictDoNothing();
      } catch { /* ignore duplicate */ }
    }

    if (u.role === 'owner') ownerIds.push(userId);
    if (u.role === 'manager') {
      for (const o of u.outlets) managerIds[o] = userId;
    }
    if (u.role === 'kasir') {
      for (const o of u.outlets) kasirIds[o] = userId;
    }
  }

  return { ownerIds, managerIds, kasirIds };
}

async function seedCategoriesAndProducts(): Promise<{
  productsByOutlet: Record<string, { id: string; name: string; price: number; costPrice: number }[]>;
}> {
  console.log('\n📦 Seeding categories & products per outlet...');
  const productsByOutlet: Record<string, { id: string; name: string; price: number; costPrice: number }[]> = {};

  for (const outletId of OUTLET_IDS) {
    console.log(`  Outlet: ${OUTLET_NAMES[outletId]}`);

    // Check if outlet already has categories
    const existingCats = await db.select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories)
      .where(and(eq(schema.categories.outletId, outletId), sql`deleted_at IS NULL`));

    // Deduplicate existing categories by name
    const catMap: Record<string, string> = {};
    for (const c of existingCats) {
      if (!catMap[c.name]) catMap[c.name] = c.id;
    }

    // Create missing categories
    for (let i = 0; i < CATEGORIES_MASTER.length; i++) {
      const catName = CATEGORIES_MASTER[i];
      if (!catMap[catName]) {
        const catId = uid('cat');
        await db.insert(categories).values({
          id: catId,
          outletId,
          name: catName,
          sortOrder: i,
        }).onConflictDoNothing();
        catMap[catName] = catId;
      }
    }

    // Check existing products for this outlet
    const existingProds = await db.select({ id: products.id, name: products.name, price: products.price, costPrice: products.costPrice })
      .from(products)
      .where(and(eq(products.outletId, outletId), sql`deleted_at IS NULL`));

    const prodMap: Record<string, { id: string; price: number; costPrice: number }> = {};
    for (const p of existingProds) {
      if (!prodMap[p.name]) prodMap[p.name] = { id: p.id, price: p.price, costPrice: p.costPrice };
    }

    // Create missing products
    for (const pm of PRODUCTS_MASTER) {
      const catId = catMap[CATEGORIES_MASTER[pm.cat]];
      if (!catId) continue;

      // Compute HPP from recipes
      const recipe = RECIPES_BY_NAME[pm.name] ?? [];
      const hpp = recipe.reduce((sum, [rmIdx, qty]) => {
        return sum + (RAW_MATERIALS_MASTER[rmIdx].costPerUnit * qty);
      }, 0);

      if (!prodMap[pm.name]) {
        const pId = uid('prd');
        await db.insert(products).values({
          id: pId,
          outletId,
          categoryId: catId,
          name: pm.name,
          price: pm.price,
          costPrice: hpp,
          isActive: 1,
        }).onConflictDoNothing();
        prodMap[pm.name] = { id: pId, price: pm.price, costPrice: hpp };
      } else if (existingProds.find(p => p.name === pm.name)?.costPrice === 0 && hpp > 0) {
        // Update HPP if it was 0
        await db.update(products).set({ costPrice: hpp }).where(eq(products.id, prodMap[pm.name].id));
        prodMap[pm.name].costPrice = hpp;
      }
    }

    // Re-fetch all products for this outlet
    const allProds = await db.select({ id: products.id, name: products.name, price: products.price, costPrice: products.costPrice })
      .from(products)
      .where(and(eq(products.outletId, outletId), sql`deleted_at IS NULL`));

    // Deduplicate by name (keep first)
    const seen = new Set<string>();
    productsByOutlet[outletId] = [];
    for (const p of allProds) {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        productsByOutlet[outletId].push(p);
      }
    }

    console.log(`  ✓ ${productsByOutlet[outletId].length} produk untuk ${OUTLET_NAMES[outletId]}`);
  }

  return { productsByOutlet };
}

async function seedRawMaterialsAndRecipes(): Promise<{
  rmIdsByOutlet: Record<string, string[]>;
}> {
  console.log('\n📦 Seeding bahan baku & resep...');
  const rmIdsByOutlet: Record<string, string[]> = {};

  for (const outletId of OUTLET_IDS) {
    const rmIds: string[] = [];

    // Get existing raw materials for this outlet
    const existingRMs = await db.select({ id: sql<string>`id`, name: sql<string>`name` })
      .from(sql`raw_materials`)
      .where(sql`outlet_id = ${outletId} AND deleted_at IS NULL`);

    const existingRMMap: Record<string, string> = {};
    for (const r of existingRMs) existingRMMap[r.name] = r.id;

    // Create raw materials for this outlet
    const now = Math.floor(Date.now() / 1000);
    for (const rm of RAW_MATERIALS_MASTER) {
      if (existingRMMap[rm.name]) {
        rmIds.push(existingRMMap[rm.name]);
      } else {
        const rmId = uid('rm');
        await db.run(sql`
          INSERT INTO raw_materials (id, outlet_id, name, unit, cost_per_unit, created_at)
          VALUES (${rmId}, ${outletId}, ${rm.name}, ${rm.unit}, ${rm.costPerUnit}, ${now})
        `);
        rmIds.push(rmId);
      }
    }

    rmIdsByOutlet[outletId] = rmIds;

    // Initialize stock quantities for this outlet
    for (let i = 0; i < rmIds.length; i++) {
      const rm = RAW_MATERIALS_MASTER[i];
      const initialStock = rm.unit === 'pcs' ? randInt(500, 2000) :
                           (['ml', 'liter'] as string[]).includes(rm.unit) ? randInt(20000, 80000) :
                           randInt(5000, 20000);


      await db.run(sql`
        INSERT INTO raw_material_stock (id, outlet_id, raw_material_id, quantity_on_hand, updated_at)
        VALUES (${uid('rms')}, ${outletId}, ${rmIds[i]}, ${initialStock}, ${now})
        ON CONFLICT(outlet_id, raw_material_id) DO UPDATE SET quantity_on_hand = ${initialStock}, updated_at = ${now}
      `);
    }

    console.log(`  ✓ ${RAW_MATERIALS_MASTER.length} bahan baku untuk ${OUTLET_NAMES[outletId]}`);
  }

  // Create recipes per outlet
  console.log('  Membuat resep menu...');
  for (const outletId of OUTLET_IDS) {
    const rmIds = rmIdsByOutlet[outletId];

    // Get products for this outlet
    const prods = await db.select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.outletId, outletId), sql`deleted_at IS NULL`));

    // Deduplicate products by name
    const seen = new Set<string>();
    for (const prod of prods) {
      if (seen.has(prod.name)) continue;
      seen.add(prod.name);

      const recipe = RECIPES_BY_NAME[prod.name];
      if (!recipe) continue;

      for (const [rmIdx, qty] of recipe) {
        const rmId = rmIds[rmIdx];
        if (!rmId) continue;
        const prId = uid('pr');
        await db.run(sql`
          INSERT OR IGNORE INTO product_recipes (id, product_id, raw_material_id, quantity_used)
          VALUES (${prId}, ${prod.id}, ${rmId}, ${qty})
        `);
      }
    }
  }

  console.log('  ✓ Resep dibuat');
  return { rmIdsByOutlet };
}

async function seedExpenseCategories(): Promise<Record<string, Record<string, string>>> {
  console.log('\n📦 Seeding expense categories...');
  const catIdsByOutlet: Record<string, Record<string, string>> = {};

  for (const outletId of OUTLET_IDS) {
    catIdsByOutlet[outletId] = {};
    for (const catName of EXPENSE_CATS) {
      const [existing] = await db.select({ id: expenseCategories.id })
        .from(expenseCategories)
        .where(and(eq(expenseCategories.outletId, outletId), eq(expenseCategories.name, catName)))
        .limit(1);

      if (existing) {
        catIdsByOutlet[outletId][catName] = existing.id;
      } else {
        const ecId = uid('ecat');
        await db.insert(expenseCategories).values({ id: ecId, outletId, name: catName });
        catIdsByOutlet[outletId][catName] = ecId;
      }
    }
  }

  console.log('  ✓ Expense categories ready');
  return catIdsByOutlet;
}

async function seedShiftsAndOrders(
  kasirIds: Record<string, string>,
  productsByOutlet: Record<string, { id: string; name: string; price: number; costPrice: number }[]>,
  managerIds: Record<string, string>,
): Promise<void> {
  console.log('\n📦 Seeding shifts + orders (Jun–Aug 2026)...');

  const PAYMENT_METHODS: ('cash' | 'qris' | 'debit')[] = ['cash', 'qris', 'debit'];
  const PAYMENT_WEIGHTS = [50, 30, 20];

  // June 1 to August 31
  const startDate = new Date(2026, 5, 1); // month is 0-indexed
  const endDate = new Date(2026, 7, 31);

  let totalOrders = 0;

  for (const outletId of OUTLET_IDS) {
    const kasirId = kasirIds[outletId] ?? managerIds[outletId];
    if (!kasirId) {
      console.warn(`  ⚠ No kasir for outlet ${outletId}, skipping`);
      continue;
    }

    const outletProducts = productsByOutlet[outletId] ?? [];
    if (outletProducts.length === 0) {
      console.warn(`  ⚠ No products for outlet ${outletId}`);
      continue;
    }

    console.log(`  Outlet: ${OUTLET_NAMES[outletId]} (${outletProducts.length} produk)`);

    const currentDate = new Date(startDate);
    let dayCount = 0;

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();

      // Create shift
      const shiftOpenAt = unixDayWIB(year, month, day, 8, 0);
      const shiftCloseAt = unixDayWIB(year, month, day, 22, 0);
      const openingCash = 500000; // modal awal Rp 500.000

      const shiftId = uid('shf');
      await db.insert(shifts).values({
        id: shiftId,
        outletId,
        kasirId,
        openedAt: shiftOpenAt,
        closedAt: shiftCloseAt,
        openingCash,
        notes: null,
      });

      // Generate 50 orders for this shift
      const ordersToInsert: typeof orders.$inferInsert[] = [];
      const itemsToInsert: typeof orderItems.$inferInsert[] = [];
      const stockMovsToInsert: typeof stockMovements.$inferInsert[] = [];

      let shiftCashRevenue = openingCash;
      const ORDERS_PER_DAY = 50;

      // Distribute orders across 8:00-22:00 (14 hour window = 50400 seconds)
      const orderTimes: number[] = Array.from({ length: ORDERS_PER_DAY }, (_, i) => {
        return shiftOpenAt + Math.floor((i / ORDERS_PER_DAY) * 50400) + randInt(0, 600);
      }).sort((a, b) => a - b);

      for (let oi = 0; oi < ORDERS_PER_DAY; oi++) {
        const orderTime = orderTimes[oi];
        const numItems = randInt(1, 4);
        const payMethod = weightedRandom(PAYMENT_METHODS, PAYMENT_WEIGHTS);

        // Pick random products (weighted)
        const selectedItems: { prod: typeof outletProducts[0]; qty: number }[] = [];
        for (let ii = 0; ii < numItems; ii++) {
          const prod = weightedRandom(outletProducts, PRODUCT_WEIGHTS.slice(0, outletProducts.length));
          const qty = randInt(1, 2);
          // Merge if same product
          const existing = selectedItems.find(x => x.prod.id === prod.id);
          if (existing) existing.qty += qty;
          else selectedItems.push({ prod, qty });
        }

        const subtotal = selectedItems.reduce((s, i) => s + i.prod.price * i.qty, 0);
        // Occasional 10% tax (30% of orders have tax for realism)
        const hasTax = Math.random() < 0.3;
        const taxRate = hasTax ? 11 : 0;
        const taxAmount = hasTax ? Math.floor(subtotal * 11 / 100) : 0;
        const total = subtotal + taxAmount;

        const orderId = uid('ord');
        ordersToInsert.push({
          id: orderId,
          outletId,
          shiftId,
          kasirId,
          customerName: null,
          subtotal,
          discountId: null,
          discountAmount: 0,
          taxRate,
          taxAmount,
          total,
          paymentMethod: payMethod,
          status: 'completed',
          notes: null,
          createdAt: orderTime,
        });

        if (payMethod === 'cash') shiftCashRevenue += total;

        for (const { prod, qty } of selectedItems) {
          itemsToInsert.push({
            id: uid('oit'),
            orderId,
            productId: prod.id,
            productName: prod.name,
            productPrice: prod.price,
            costPrice: prod.costPrice,
            quantity: qty,
            subtotal: prod.price * qty,
            notes: null,
          });

          stockMovsToInsert.push({
            id: uid('smv'),
            outletId,
            productId: prod.id,
            type: 'out',
            quantity: -qty,
            referenceId: orderId,
            notes: null,
            createdBy: kasirId,
            createdAt: orderTime,
          });
        }
      }

      // Close shift with expected cash
      await db.update(shifts).set({
        closingCash: shiftCashRevenue + randInt(-50000, 50000), // small variance
        expectedCash: shiftCashRevenue,
      }).where(eq(shifts.id, shiftId));

      // Batch insert orders
      for (let b = 0; b < ordersToInsert.length; b += 25) {
        await db.insert(orders).values(ordersToInsert.slice(b, b + 25));
      }
      for (let b = 0; b < itemsToInsert.length; b += 50) {
        await db.insert(orderItems).values(itemsToInsert.slice(b, b + 50));
      }
      for (let b = 0; b < stockMovsToInsert.length; b += 50) {
        await db.insert(stockMovements).values(stockMovsToInsert.slice(b, b + 50));
      }

      totalOrders += ORDERS_PER_DAY;
      dayCount++;
      currentDate.setDate(currentDate.getDate() + 1);

      if (dayCount % 15 === 0) {
        console.log(`    ${OUTLET_NAMES[outletId]}: ${dayCount} hari done (${totalOrders} total orders)`);
      }
    }

    console.log(`  ✓ ${OUTLET_NAMES[outletId]}: selesai`);
  }

  console.log(`  ✓ Total orders: ${totalOrders}`);
}

async function seedExpenses(
  managerIds: Record<string, string>,
  expenseCatIds: Record<string, Record<string, string>>,
): Promise<void> {
  console.log('\n📦 Seeding pengeluaran...');

  const startDate = new Date(2026, 5, 1);
  const endDate = new Date(2026, 7, 31);

  for (const outletId of OUTLET_IDS) {
    const createdBy = managerIds[outletId];
    if (!createdBy) continue;

    const catIds = expenseCatIds[outletId];
    const catNames = Object.keys(catIds);

    const currentDate = new Date(startDate);
    const expensesToInsert: typeof expenses.$inferInsert[] = [];

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const day = currentDate.getDate();
      const dayTs = unixDayWIB(year, month, day, 10, 0);

      // 3-5 expenses per day
      const numExpenses = randInt(3, 5);
      for (let i = 0; i < numExpenses; i++) {
        const [catIdx, desc, minAmt, maxAmt] = EXPENSE_TEMPLATES[randInt(0, EXPENSE_TEMPLATES.length - 1)];
        const catName = EXPENSE_CATS[catIdx];
        const catId = catIds[catName];
        if (!catId) continue;

        const payMethods = ['cash', 'transfer', 'debit'];
        expensesToInsert.push({
          id: uid('exp'),
          outletId,
          categoryId: catId,
          createdBy,
          description: desc,
          amount: randInt(minAmt / 1000, maxAmt / 1000) * 1000,
          paymentMethod: payMethods[randInt(0, 2)],
          expenseDate: dayTs,
          createdAt: dayTs + randInt(0, 3600),
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Batch insert
    for (let b = 0; b < expensesToInsert.length; b += 50) {
      await db.insert(expenses).values(expensesToInsert.slice(b, b + 50));
    }

    console.log(`  ✓ ${expensesToInsert.length} pengeluaran untuk ${OUTLET_NAMES[outletId]}`);
  }
}

async function seedProfitSharing(ownerIds: string[]): Promise<void> {
  console.log('\n📦 Seeding bagi hasil...');

  for (const outletId of OUTLET_IDS) {
    // Create 2-3 profit sharing rules per outlet
    const rules = [
      { name: 'Andri Setiawan (Owner 1)', pct: 30 },
      { name: 'Budi Santoso (Owner 2)', pct: 25 },
      { name: 'Citra Dewi (Owner 3)', pct: 15 },
    ];

    const ruleIds: string[] = [];
    for (const r of rules) {
      const [existing] = await db.select({ id: profitSharingRules.id })
        .from(profitSharingRules)
        .where(and(eq(profitSharingRules.outletId, outletId), eq(profitSharingRules.name, r.name)))
        .limit(1);

      if (existing) {
        ruleIds.push(existing.id);
      } else {
        const rId = uid('psr');
        await db.insert(profitSharingRules).values({
          id: rId,
          outletId,
          name: r.name,
          percentage: r.pct,
          isActive: 1,
        });
        ruleIds.push(rId);
      }
    }

    // Create ledger for June, July, August 2026
    const periods = [
      { start: unixDayWIB(2026, 6, 1, 0, 0), end: unixDayWIB(2026, 6, 30, 23, 59) },
      { start: unixDayWIB(2026, 7, 1, 0, 0), end: unixDayWIB(2026, 7, 31, 23, 59) },
      { start: unixDayWIB(2026, 8, 1, 0, 0), end: unixDayWIB(2026, 8, 31, 23, 59) },
    ];

    for (const period of periods) {
      // Estimate net profit: ~50 orders/day × 30 days × avg Rp 35.000 = ~52.5jt revenue
      // minus COGS 40% = 21jt, minus expenses 10% = 5.25jt → net ~26jt
      const netProfit = randInt(20000000, 35000000); // 20-35 juta per bulan

      for (let ri = 0; ri < rules.length; ri++) {
        const shareAmount = Math.floor(netProfit * rules[ri].pct / 100);
        const isPaid = period.end < Math.floor(Date.now() / 1000) - 86400; // paid if period ended

        const [existing] = await db.select({ id: profitSharingLedger.id })
          .from(profitSharingLedger)
          .where(and(
            eq(profitSharingLedger.outletId, outletId),
            eq(profitSharingLedger.ruleId, ruleIds[ri]),
            eq(profitSharingLedger.periodStart, period.start),
          ))
          .limit(1);

        if (!existing) {
          await db.insert(profitSharingLedger).values({
            id: uid('psl'),
            outletId,
            ruleId: ruleIds[ri],
            periodStart: period.start,
            periodEnd: period.end,
            netProfit,
            shareAmount,
            status: isPaid ? 'paid' : 'pending',
            paidAt: isPaid ? period.end + randInt(86400, 604800) : null,
            notes: null,
          });
        }
      }
    }

    console.log(`  ✓ Profit sharing untuk ${OUTLET_NAMES[outletId]}`);
  }
}

async function seedInitialProductStock(
  productsByOutlet: Record<string, { id: string; name: string; price: number; costPrice: number }[]>,
  kasirIds: Record<string, string>,
): Promise<void> {
  console.log('\n📦 Seeding stok produk (sisa stok saat ini)...');

  for (const outletId of OUTLET_IDS) {
    const prods = productsByOutlet[outletId] ?? [];
    const now = Math.floor(Date.now() / 1000);

    for (const prod of prods) {
      const currentQty = randInt(50, 300);
      // Check if stock record exists
      const existing = await db.select({ id: schema.stock.id })
        .from(schema.stock)
        .where(and(eq(schema.stock.outletId, outletId), eq(schema.stock.productId, prod.id)))
        .limit(1);

      if (existing.length > 0) {
        await db.update(schema.stock)
          .set({ quantity: currentQty, updatedAt: now })
          .where(and(eq(schema.stock.outletId, outletId), eq(schema.stock.productId, prod.id)));
      } else {
        await db.insert(schema.stock).values({
          id: uid('stk'),
          outletId,
          productId: prod.id,
          quantity: currentQty,
          unit: 'pcs',
          updatedAt: now,
        }).onConflictDoNothing();
      }
    }

    console.log(`  ✓ Stok produk untuk ${OUTLET_NAMES[outletId]}`);
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────
console.log('🚀 Kopi Seruni — Dummy Data Seeder');
console.log('   Password semua user: seruni123');
console.log('   Periode: 1 Juni – 31 Agustus 2026');
console.log('   Target: ~13.800 transaksi\n');

try {
  const { ownerIds, managerIds, kasirIds } = await seedUsersAndRoles();
  const { productsByOutlet } = await seedCategoriesAndProducts();
  await seedRawMaterialsAndRecipes();
  const expenseCatIds = await seedExpenseCategories();
  await seedInitialProductStock(productsByOutlet, kasirIds);

  console.log('\n⏳ Seeding shifts & orders (ini yang paling lama ~3-5 menit)...');
  await seedShiftsAndOrders(kasirIds, productsByOutlet, managerIds);
  await seedExpenses(managerIds, expenseCatIds);
  await seedProfitSharing(ownerIds);

  console.log('\n✅ Seeder selesai!');
  console.log('   Login owner: owner1@kopi-seruni.com / seruni123');
  console.log('   Login kasir pusat: kasir.pusat@kopi-seruni.com / seruni123');
} catch (e) {
  console.error('\n❌ Error:', e);
  process.exit(1);
}

process.exit(0);
