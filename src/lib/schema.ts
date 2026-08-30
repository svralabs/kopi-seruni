import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/sqlite-core';


// ================================================================
// HELPERS
// ================================================================
const now = sql`(unixepoch())`;
const id = (prefix: string) => text('id').primaryKey().$defaultFn(() => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`);

// ================================================================
// OUTLETS
// ================================================================
export const outlets = sqliteTable('outlets', {
  id: id('out'),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  createdAt: integer('created_at').notNull().default(now),
});

import { user, session, account, verification } from './auth-schema';
export * from './auth-schema';
export { user as users, session as sessions, account as accounts, verification as verifications };



// Role per user per outlet
export const userOutletRoles = sqliteTable('user_outlet_roles', {
  id: id('uor'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  outletId: text('outlet_id').notNull().references(() => outlets.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'manager', 'kasir'] }).notNull(),
  createdAt: integer('created_at').notNull().default(now),
}, (t) => [uniqueIndex('uq_user_outlet').on(t.userId, t.outletId)]);

// ================================================================
// SETTINGS (per outlet, key-value)
// ================================================================
export const settings = sqliteTable('settings', {
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  key: text('key').notNull(),
  value: text('value').notNull(),
}, (t) => [primaryKey({ columns: [t.outletId, t.key] })]);
// Keys: 'tax_rate' ('11'), 'tax_enabled' ('1'), 'store_name'


// ================================================================
// MASTER DATA
// ================================================================
export const categories = sqliteTable('categories', {
  id: id('cat'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull().default(now),
  deletedAt: integer('deleted_at'),
});

export const products = sqliteTable('products', {
  id: id('prd'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  categoryId: text('category_id').references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),           // rupiah integer
  costPrice: integer('cost_price').notNull().default(0), // HPP integer
  imageUrl: text('image_url'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').notNull().default(now),
  updatedAt: integer('updated_at').notNull().default(now),
  deletedAt: integer('deleted_at'),
}, (t) => [index('idx_products_outlet').on(t.outletId)]);

export const suppliers = sqliteTable('suppliers', {
  id: id('sup'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  name: text('name').notNull(),
  phone: text('phone'),
  address: text('address'),
  createdAt: integer('created_at').notNull().default(now),
  deletedAt: integer('deleted_at'),
});

// ================================================================
// DISKON
// ================================================================
export const discounts = sqliteTable('discounts', {
  id: id('dsc'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  name: text('name').notNull(),
  type: text('type', { enum: ['percentage', 'fixed'] }).notNull(),
  value: integer('value').notNull(), // percentage: 10=10% | fixed: nominal rupiah
  minPurchase: integer('min_purchase').default(0),
  isActive: integer('is_active').notNull().default(1),
  validFrom: integer('valid_from'),
  validUntil: integer('valid_until'),
  createdAt: integer('created_at').notNull().default(now),
  deletedAt: integer('deleted_at'),
});

// ================================================================
// SHIFT
// ================================================================
export const shifts = sqliteTable('shifts', {
  id: id('shf'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  kasirId: text('kasir_id').notNull().references(() => user.id),
  openedAt: integer('opened_at').notNull().default(now),
  closedAt: integer('closed_at'),
  openingCash: integer('opening_cash').notNull().default(0), // modal awal
  closingCash: integer('closing_cash'),   // kas fisik saat tutup (input manual)
  expectedCash: integer('expected_cash'), // dihitung sistem
  notes: text('notes'),
}, (t) => [index('idx_shifts_outlet').on(t.outletId)]);

// ================================================================
// TRANSAKSI POS
// ================================================================
export const orders = sqliteTable('orders', {
  id: id('ord'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  shiftId: text('shift_id').references(() => shifts.id),
  kasirId: text('kasir_id').references(() => user.id),
  customerName: text('customer_name'),
  subtotal: integer('subtotal').notNull(),           // sebelum diskon+pajak
  discountId: text('discount_id').references(() => discounts.id),
  discountAmount: integer('discount_amount').notNull().default(0),
  taxRate: integer('tax_rate').notNull().default(0), // snapshot dari settings
  taxAmount: integer('tax_amount').notNull().default(0),
  total: integer('total').notNull(),                 // subtotal - discount + tax
  paymentMethod: text('payment_method', {
    enum: ['cash', 'qris', 'transfer', 'debit'],
  }).notNull().default('cash'),
  status: text('status', {
    enum: ['pending', 'completed', 'voided'],
  }).notNull().default('completed'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull().default(now),
  voidedAt: integer('voided_at'),
  voidedBy: text('voided_by').references(() => user.id),
}, (t) => [
  index('idx_orders_outlet_created').on(t.outletId, t.createdAt),
  index('idx_orders_shift').on(t.shiftId),
]);

export const orderItems = sqliteTable('order_items', {
  id: id('oit'),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),   // SNAPSHOT nama saat checkout
  productPrice: integer('product_price').notNull(), // SNAPSHOT harga
  costPrice: integer('cost_price').notNull().default(0), // SNAPSHOT HPP
  quantity: integer('quantity').notNull(),
  subtotal: integer('subtotal').notNull(),       // productPrice * quantity
  notes: text('notes'),
}, (t) => [index('idx_order_items_order').on(t.orderId)]);

// ================================================================
// EXPENSES
// ================================================================
export const expenseCategories = sqliteTable('expense_categories', {
  id: id('ecat'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  name: text('name').notNull(),
});

export const expenses = sqliteTable('expenses', {
  id: id('exp'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  categoryId: text('category_id').references(() => expenseCategories.id),
  createdBy: text('created_by').notNull().references(() => user.id),
  description: text('description').notNull(),
  amount: integer('amount').notNull(), // rupiah integer
  paymentMethod: text('payment_method').notNull().default('cash'),
  expenseDate: integer('expense_date').notNull(), // unixepoch tanggal pengeluaran
  createdAt: integer('created_at').notNull().default(now),
}, (t) => [index('idx_expenses_outlet_date').on(t.outletId, t.expenseDate)]);

// ================================================================
// STOK
// ================================================================
export const stock = sqliteTable('stock', {
  id: id('stk'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull().default(0),
  unit: text('unit').notNull().default('pcs'),
  updatedAt: integer('updated_at').notNull().default(now),
}, (t) => [uniqueIndex('uq_stock_outlet_product').on(t.outletId, t.productId)]);

export const stockMovements = sqliteTable('stock_movements', {
  id: id('smv'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  productId: text('product_id').notNull().references(() => products.id),
  type: text('type', {
    enum: ['in', 'out', 'adjustment', 'void_return', 'po_receive'],
  }).notNull(),
  quantity: integer('quantity').notNull(), // positif = masuk, negatif = keluar
  referenceId: text('reference_id'),       // order_id atau po_id
  notes: text('notes'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: integer('created_at').notNull().default(now),
}, (t) => [index('idx_stock_movements').on(t.outletId, t.productId, t.createdAt)]);

// ================================================================
// BAHAN BAKU (Raw Materials) — Ingredient-based inventory
// ================================================================
export const rawMaterials = sqliteTable('raw_materials', {
  id: id('rm'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  name: text('name').notNull(),
  unit: text('unit', { enum: ['gr', 'ml', 'pcs', 'lbr', 'kg', 'liter'] }).notNull().default('gr'),
  costPerUnit: integer('cost_per_unit').notNull().default(0), // rupiah per unit
  createdAt: integer('created_at').notNull().default(now),
  deletedAt: integer('deleted_at'),
}, (t) => [index('idx_raw_materials_outlet').on(t.outletId)]);

// Resep per produk — N bahan baku per 1 porsi menu
export const productRecipes = sqliteTable('product_recipes', {
  id: id('pr'),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  rawMaterialId: text('raw_material_id').notNull().references(() => rawMaterials.id, { onDelete: 'cascade' }),
  quantityUsed: integer('quantity_used').notNull(), // qty per 1 porsi, e.g. 30 = 30gr
}, (t) => [
  uniqueIndex('uq_recipe_product_material').on(t.productId, t.rawMaterialId),
  index('idx_recipe_product').on(t.productId),
]);

// Stok bahan baku per outlet
export const rawMaterialStock = sqliteTable('raw_material_stock', {
  id: id('rms'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  rawMaterialId: text('raw_material_id').notNull().references(() => rawMaterials.id, { onDelete: 'cascade' }),
  quantityOnHand: integer('quantity_on_hand').notNull().default(0),
  updatedAt: integer('updated_at').notNull().default(now),
}, (t) => [uniqueIndex('uq_rms_outlet_material').on(t.outletId, t.rawMaterialId)]);

// Log mutasi bahan baku
export const rawMaterialMovements = sqliteTable('raw_material_movements', {
  id: id('rmm'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  rawMaterialId: text('raw_material_id').notNull().references(() => rawMaterials.id),
  type: text('type', { enum: ['purchase', 'usage', 'adjustment', 'waste'] }).notNull(),
  quantity: integer('quantity').notNull(), // positif = masuk, negatif = keluar
  referenceId: text('reference_id'),       // order_id atau expense_id
  notes: text('notes'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: integer('created_at').notNull().default(now),
}, (t) => [index('idx_rmm_outlet_material').on(t.outletId, t.rawMaterialId, t.createdAt)]);

// ================================================================
// PURCHASE ORDER
// ================================================================
export const purchaseOrders = sqliteTable('purchase_orders', {
  id: id('po'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  supplierId: text('supplier_id').references(() => suppliers.id),
  status: text('status', {
    enum: ['draft', 'ordered', 'received', 'cancelled'],
  }).notNull().default('draft'),
  total: integer('total').notNull().default(0),
  notes: text('notes'),
  orderedAt: integer('ordered_at'),
  receivedAt: integer('received_at'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: integer('created_at').notNull().default(now),
});

export const purchaseOrderItems = sqliteTable('purchase_order_items', {
  id: id('poi'),
  poId: text('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitCost: integer('unit_cost').notNull(), // rupiah integer
});

// ================================================================
// BAGI HASIL
// 1 rule = 1 penerima. Total pct boleh < 100% (sisa = kas bisnis).
// ================================================================
export const profitSharingRules = sqliteTable('profit_sharing_rules', {
  id: id('psr'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  name: text('name').notNull(),        // nama penerima: "Owner A", "Investor B"
  percentage: integer('percentage').notNull(), // 30 = 30% dari net profit
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').notNull().default(now),
});

export const profitSharingLedger = sqliteTable('profit_sharing_ledger', {
  id: id('psl'),
  outletId: text('outlet_id').notNull().references(() => outlets.id),
  ruleId: text('rule_id').notNull().references(() => profitSharingRules.id),
  periodStart: integer('period_start').notNull(), // unixepoch awal periode
  periodEnd: integer('period_end').notNull(),
  netProfit: integer('net_profit').notNull(),     // snapshot laba bersih, integer rupiah
  shareAmount: integer('share_amount').notNull(), // Math.floor(net_profit * pct / 100)
  status: text('status', { enum: ['pending', 'paid'] }).notNull().default('pending'),
  paidAt: integer('paid_at'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull().default(now),
});

// ================================================================
// TYPES (infer dari schema)
// ================================================================
export type Outlet = typeof outlets.$inferSelect;
export type User = typeof user.$inferSelect;

export type UserOutletRole = typeof userOutletRoles.$inferSelect;
export type AppRole = 'owner' | 'manager' | 'kasir';
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Stock = typeof stock.$inferSelect;
export type Discount = typeof discounts.$inferSelect;
export type ProfitSharingRule = typeof profitSharingRules.$inferSelect;
export type ProfitSharingLedger = typeof profitSharingLedger.$inferSelect;
export type RawMaterial = typeof rawMaterials.$inferSelect;
export type ProductRecipe = typeof productRecipes.$inferSelect;
export type RawMaterialStock = typeof rawMaterialStock.$inferSelect;
export type RawMaterialMovement = typeof rawMaterialMovements.$inferSelect;
