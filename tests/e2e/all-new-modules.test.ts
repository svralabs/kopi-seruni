import { config } from 'dotenv';
config({ path: '.env.local' });

import { describe, it, expect, afterAll, beforeAll } from 'bun:test';
import { db } from '../../src/lib/db';
import {
  discounts,
  settings,
  purchaseOrders,
  purchaseOrderItems,
  stock,
  stockMovements,
  outlets,
  products,
} from '../../src/lib/schema';

import { eq, and } from 'drizzle-orm';

describe('E2E Integration Test: Phase 1-5 Extended POS Modules', () => {
  const TEST_OUTLET = `out_ext_test_${Date.now().toString().slice(-4)}`;
  const now = Math.floor(Date.now() / 1000);
  const dscId = `dsc_test_${Date.now().toString().slice(-4)}`;
  const poId = `po_test_${Date.now().toString().slice(-4)}`;
  const poiId = `poi_test_${Date.now().toString().slice(-4)}`;
  const prodId = `prd_ext_test_${Date.now().toString().slice(-4)}`;

  beforeAll(async () => {
    await db.insert(outlets).values({
      id: TEST_OUTLET,
      name: 'Kopi Seruni - Extended Test Outlet',
      createdAt: now,
    }).onConflictDoNothing();

    await db.insert(products).values({
      id: prodId,
      outletId: TEST_OUTLET,
      name: 'Produk Uji Coba PO',
      price: 20000,
      costPrice: 10000,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    // Cleanup all test records
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, poId));
    await db.delete(stockMovements).where(eq(stockMovements.outletId, TEST_OUTLET));
    await db.delete(stock).where(eq(stock.outletId, TEST_OUTLET));
    await db.delete(settings).where(eq(settings.outletId, TEST_OUTLET));
    await db.delete(discounts).where(eq(discounts.id, dscId));
    await db.delete(products).where(eq(products.id, prodId));
    await db.delete(outlets).where(eq(outlets.id, TEST_OUTLET));
  });

  it('Module 1: Create & Toggle Discount/Promo Voucher', async () => {
    await db.insert(discounts).values({
      id: dscId,
      outletId: TEST_OUTLET,
      name: 'Test Promo 25%',
      type: 'percentage',
      value: 25,
      minPurchase: 50000,
      isActive: 1,
      createdAt: now,
    });

    const [saved] = await db.select().from(discounts).where(eq(discounts.id, dscId));
    expect(saved).toBeDefined();
    expect(saved.value).toBe(25);
    expect(saved.isActive).toBe(1);

    // Toggle to inactive
    await db.update(discounts).set({ isActive: 0 }).where(eq(discounts.id, dscId));
    const [toggled] = await db.select().from(discounts).where(eq(discounts.id, dscId));
    expect(toggled.isActive).toBe(0);
  });

  it('Module 2: Settings Upsert for PPN & Receipt Footer', async () => {
    // Upsert tax_rate setting
    await db
      .insert(settings)
      .values({
        outletId: TEST_OUTLET,
        key: 'tax_rate_test',
        value: '11',
      })
      .onConflictDoNothing();

    const [saved] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.outletId, TEST_OUTLET), eq(settings.key, 'tax_rate_test')));

    expect(saved).toBeDefined();
    expect(saved.value).toBe('11');
  });

  it('Module 3: Create Purchase Order & Atomic Receive (Restock)', async () => {
    const qty = 50;
    const unitCost = 12000;
    const total = qty * unitCost;

    // 1. Insert PO
    await db.insert(purchaseOrders).values({
      id: poId,
      outletId: TEST_OUTLET,
      status: 'ordered',
      total,
      notes: 'Beli V60 beans 50 pcs',
      orderedAt: now,
      createdBy: 'thnUQLaR2qQnLPhbx5ZrpErIZgkvaZ2x',
      createdAt: now,
    });

    await db.insert(purchaseOrderItems).values({
      id: poiId,
      poId,
      productId: prodId,
      quantity: qty,
      unitCost,
    });

    // 2. Simulate receive PO atomic transaction
    const initialStock = await db
      .select()
      .from(stock)
      .where(and(eq(stock.outletId, TEST_OUTLET), eq(stock.productId, prodId)));

    const prevQty = initialStock[0]?.quantity || 0;

    await db.transaction(async (tx) => {
      await tx
        .update(purchaseOrders)
        .set({ status: 'received', receivedAt: now })
        .where(eq(purchaseOrders.id, poId));

      await tx.insert(stockMovements).values({
        id: `smv_test_${Date.now().toString().slice(-4)}`,
        outletId: TEST_OUTLET,
        productId: prodId,
        type: 'po_receive',
        quantity: qty,
        referenceId: poId,
        createdBy: 'thnUQLaR2qQnLPhbx5ZrpErIZgkvaZ2x',
        createdAt: now,
      });

      if (initialStock.length > 0) {
        await tx
          .update(stock)
          .set({ quantity: prevQty + qty })
          .where(and(eq(stock.outletId, TEST_OUTLET), eq(stock.productId, prodId)));
      } else {
        await tx.insert(stock).values({
          id: `stk_test_${Date.now().toString().slice(-4)}`,
          outletId: TEST_OUTLET,
          productId: prodId,
          quantity: qty,
          unit: 'pcs',
        });
      }
    });

    const [updatedStock] = await db
      .select()
      .from(stock)
      .where(and(eq(stock.outletId, TEST_OUTLET), eq(stock.productId, prodId)));

    expect(updatedStock.quantity).toBe(prevQty + qty);
  });
});
