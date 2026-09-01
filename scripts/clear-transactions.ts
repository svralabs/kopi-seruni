/**
 * Clear All Dummy Transaction Data
 * 
 * Clears:
 * - order_items
 * - orders
 * - expenses
 * - shifts
 * - stock_movements
 * - raw_material_movements
 * - profit_sharing_ledger
 * 
 * Preserves:
 * - outlets (Pusat, Dago, Braga, etc.)
 * - users, accounts, sessions, verifications
 * - user_outlet_roles (RBAC)
 * - settings (PPN, store name, receipt footer, etc.)
 * - categories (Master Kategori Menu)
 * - products (Master Produk & Menu)
 * - discounts (Master Voucher Diskon)
 * - raw_materials (Master Bahan Baku)
 * - product_recipes (Master Resep Menu)
 * - profit_sharing_rules (Master Aturan Bagi Hasil)
 * - resets stock & raw_material_stock to clean ready-to-sell levels
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';
import * as schema from '../src/lib/schema';
import {
  orders,
  orderItems,
  expenses,
  shifts,
  stockMovements,
  rawMaterialMovements,
  profitSharingLedger,
  stock,
  rawMaterialStock,
  products,
  rawMaterials,
  outlets,
} from '../src/lib/schema';

async function main() {
  console.log('🧹 [Cleanup] Menghubungkan ke Turso Database...');

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  const db = drizzle(client, { schema });

  console.log('🗑️ [Cleanup] Menghapus data transaksi dummy...');

  // 1. Delete order_items
  const delOrderItems = await db.delete(orderItems);
  console.log('  ✓ order_items berhasil dihapus');

  // 2. Delete orders
  const delOrders = await db.delete(orders);
  console.log('  ✓ orders berhasil dihapus');

  // 3. Delete expenses
  const delExpenses = await db.delete(expenses);
  console.log('  ✓ expenses berhasil dihapus');

  // 4. Delete shifts
  const delShifts = await db.delete(shifts);
  console.log('  ✓ shifts berhasil dihapus');

  // 5. Delete stock movements
  const delStockMovements = await db.delete(stockMovements);
  console.log('  ✓ stock_movements berhasil dihapus');

  // 6. Delete raw material movements
  const delRmMovements = await db.delete(rawMaterialMovements);
  console.log('  ✓ raw_material_movements berhasil dihapus');

  // 7. Delete profit sharing ledger
  const delPsl = await db.delete(profitSharingLedger);
  console.log('  ✓ profit_sharing_ledger berhasil dihapus');

  console.log('\n📦 [Inventory] Memastikan stok produk & bahan baku siap pakai untuk POS real...');

  // Reset / ensure stock quantity = 100 for all existing products across outlets
  const allOutlets = await db.select().from(outlets);
  const allProducts = await db.select().from(products);
  const allRms = await db.select().from(rawMaterials);

  // Update existing stock to 100
  await db.update(stock).set({ quantity: 100, updatedAt: sql`(unixepoch())` });
  console.log(`  ✓ Master stok ${allProducts.length} produk di ${allOutlets.length} cabang diset siap pakai (100 pcs).`);

  // Update existing raw material stock to 5000 (5kg / 5L)
  await db.update(rawMaterialStock).set({ quantityOnHand: 5000, updatedAt: sql`(unixepoch())` });
  console.log(`  ✓ Master stok ${allRms.length} bahan baku diset siap pakai.`);

  console.log('\n✨ [Selesai] Semua data transaksi dummy telah bersih total!');
  console.log('🔒 Master Produk, Pengaturan, User & RBAC, dan Outlet tetap aman terjaga.');
}

main().catch((err) => {
  console.error('❌ Error saat menghapus data transaksi:', err);
  process.exit(1);
});
