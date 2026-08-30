#!/usr/bin/env bun
// Jalankan sekali: bun scripts/migrate-products.ts
// Pastikan .env.local sudah di-set: GAS_API_URL, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, MIGRATION_OUTLET_ID

import { db } from '../src/lib/db';
import { products, categories } from '../src/lib/schema';

const GAS_URL = process.env.GAS_API_URL;
const OUTLET_ID = process.env.MIGRATION_OUTLET_ID;

if (!GAS_URL || !OUTLET_ID) {
  console.error('❌ Set GAS_API_URL dan MIGRATION_OUTLET_ID di .env.local');
  process.exit(1);
}

console.log('📦 Fetching products dari GAS...');
const res = await fetch(`${GAS_URL}?action=getProducts`);
const { data, status } = await res.json();

if (status !== 'success' || !Array.isArray(data)) {
  console.error('❌ Gagal fetch dari GAS:', { status, data });
  process.exit(1);
}

// Deduplikasi category names
const uniqueCatNames = [...new Set<string>(
  data.map((p: any) => p.category).filter(Boolean)
)];

const catMap = new Map<string, string>();
for (const catName of uniqueCatNames) {
  const catId = `cat_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  await db.insert(categories).values({
    id: catId,
    outletId: OUTLET_ID,
    name: catName,
  }).onConflictDoNothing();
  catMap.set(catName, catId);
  console.log(`  ✓ Category: ${catName}`);
}

let imported = 0;
for (const p of data) {
  await db.insert(products).values({
    id: `prd_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    outletId: OUTLET_ID,
    categoryId: p.category ? catMap.get(p.category) ?? null : null,
    name: p.name,
    description: p.desc ?? null,
    price: Math.round(Number(p.price) || 0),
    costPrice: 0, // ⚠️ Isi manual di UI setelah import
    isActive: 1,
  }).onConflictDoNothing();
  imported++;
}

console.log(`\n✅ Selesai: ${imported} produk, ${uniqueCatNames.length} kategori diimport`);
console.log('⚠️  Ingat: Isi cost_price semua produk di UI sebelum pakai laporan L/R');
