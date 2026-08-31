import { config } from 'dotenv';
config({ path: '.env.local' });

import { describe, it, expect, afterAll, beforeAll } from 'bun:test';
import { db } from '../../src/lib/db';
import {
  discounts,
  settings,
  rawMaterials,
  rawMaterialStock,
  rawMaterialMovements,
  outlets,
} from '../../src/lib/schema';

import { eq, and } from 'drizzle-orm';

describe('E2E Integration Test: Phase 1-5 Extended POS Modules', () => {
  const TEST_OUTLET = `out_ext_test_${Date.now().toString().slice(-4)}`;
  const now = Math.floor(Date.now() / 1000);
  const dscId = `dsc_test_${Date.now().toString().slice(-4)}`;
  const rawId = `rm_test_${Date.now().toString().slice(-4)}`;
  const rmsId = `rms_test_${Date.now().toString().slice(-4)}`;

  beforeAll(async () => {
    await db.insert(outlets).values({
      id: TEST_OUTLET,
      name: 'Kopi Seruni - Extended Test Outlet',
      createdAt: now,
    }).onConflictDoNothing();

    await db.insert(rawMaterials).values({
      id: rawId,
      outletId: TEST_OUTLET,
      name: 'Biji Kopi Test Arabika',
      unit: 'gr',
      costPerUnit: 250,
      createdAt: now,
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    // Cleanup all test records
    await db.delete(rawMaterialMovements).where(eq(rawMaterialMovements.outletId, TEST_OUTLET));
    await db.delete(rawMaterialStock).where(eq(rawMaterialStock.outletId, TEST_OUTLET));
    await db.delete(rawMaterials).where(eq(rawMaterials.id, rawId));
    await db.delete(settings).where(eq(settings.outletId, TEST_OUTLET));
    await db.delete(discounts).where(eq(discounts.id, dscId));
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

  it('Module 3: Direct Raw Material Restock Mutation & Movement Log', async () => {
    const restockQty = 5000; // 5000 gr (5 kg)

    // Simulate atomic restock mutation
    await db.transaction(async (tx) => {
      await tx.insert(rawMaterialStock).values({
        id: rmsId,
        outletId: TEST_OUTLET,
        rawMaterialId: rawId,
        quantityOnHand: restockQty,
        updatedAt: now,
      });

      await tx.insert(rawMaterialMovements).values({
        id: `rmm_test_${Date.now().toString().slice(-4)}`,
        outletId: TEST_OUTLET,
        rawMaterialId: rawId,
        type: 'purchase',
        quantity: restockQty,
        notes: 'Restock bahan baku biji kopi 5kg',
        createdBy: 'thnUQLaR2qQnLPhbx5ZrpErIZgkvaZ2x',
        createdAt: now,
      });
    });

    const [stockRes] = await db
      .select()
      .from(rawMaterialStock)
      .where(and(eq(rawMaterialStock.outletId, TEST_OUTLET), eq(rawMaterialStock.rawMaterialId, rawId)));

    expect(stockRes).toBeDefined();
    expect(stockRes.quantityOnHand).toBe(5000);
  });
});
