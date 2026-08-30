import { config } from 'dotenv';
config({ path: '.env.local' });

import { describe, it, expect, beforeAll } from 'bun:test';

import { db } from '../../src/lib/db';
import {
  outlets,
  user,
  products,
  stock,
  stockMovements,
  orders,
  orderItems,
  shifts,
  expenses,
  profitSharingRules,
  profitSharingLedger,
} from '../../src/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { calcDiscount, calcTax, calcTotal, calcShare } from '../../src/lib/utils';

describe('E2E Integration Test: Complete POS & Business Lifecycle Workflow', () => {
  const TEST_OUTLET_ID = `out_test_${Date.now().toString().slice(-6)}`;
  const TEST_USER_ID = `usr_test_${Date.now().toString().slice(-6)}`;
  const TEST_PRODUCT_ID = `prd_test_${Date.now().toString().slice(-6)}`;
  let shiftId = '';
  let orderId = '';

  beforeAll(async () => {
    // 1. Setup Test Outlet & Test User
    await db.insert(outlets).values({
      id: TEST_OUTLET_ID,
      name: 'Kopi Seruni - Test Outlet E2E',
      address: 'Jl. Testing No. 1',
    }).onConflictDoNothing();

    await db.insert(user).values({
      id: TEST_USER_ID,
      name: 'Tester Kasir',
      email: `tester_${Date.now()}@seruni.test`,
      emailVerified: true,
    }).onConflictDoNothing();

  });

  it('Step 1: Open cashier shift with initial cash in drawer', async () => {
    shiftId = `shf_test_${Date.now().toString().slice(-6)}`;
    const openingCash = 150000; // Rp 150.000

    await db.insert(shifts).values({
      id: shiftId,
      outletId: TEST_OUTLET_ID,
      kasirId: TEST_USER_ID,
      openedAt: Math.floor(Date.now() / 1000),
      openingCash,
    });

    const [savedShift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId));

    expect(savedShift).toBeDefined();
    expect(savedShift.openingCash).toBe(150000);
    expect(savedShift.closedAt).toBeNull();
  });

  it('Step 2: Create product and initialize stock inventory', async () => {
    const now = Math.floor(Date.now() / 1000);

    // Create product
    await db.insert(products).values({
      id: TEST_PRODUCT_ID,
      outletId: TEST_OUTLET_ID,
      name: 'Es Kopi Susu Test E2E',
      price: 25000,
      costPrice: 8000,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Initialize stock with 50 pcs
    await db.insert(stock).values({
      id: `stk_test_${Date.now().toString().slice(-6)}`,
      outletId: TEST_OUTLET_ID,
      productId: TEST_PRODUCT_ID,
      quantity: 50,
      unit: 'pcs',
      updatedAt: now,
    });

    const [initialStock] = await db
      .select()
      .from(stock)
      .where(and(eq(stock.outletId, TEST_OUTLET_ID), eq(stock.productId, TEST_PRODUCT_ID)));

    expect(initialStock).toBeDefined();
    expect(initialStock.quantity).toBe(50);
  });

  it('Step 3: Execute Atomic POS Checkout (Order + Items + Stock Decrement)', async () => {
    orderId = `ord_test_${Date.now().toString().slice(-6)}`;
    const now = Math.floor(Date.now() / 1000);
    const purchaseQty = 2; // Buy 2 pcs

    const subtotal = 25000 * purchaseQty; // 50.000
    const discountAmount = 5000; // Rp 5.000 discount
    const afterDiscount = subtotal - discountAmount; // 45.000
    const taxRate = 11;
    const taxAmount = calcTax(afterDiscount, taxRate); // 4.950
    const total = calcTotal(subtotal, discountAmount, taxAmount); // 49.950

    // Atomic DB Transaction
    await db.transaction(async (tx) => {
      // 1. Insert order
      await tx.insert(orders).values({
        id: orderId,
        outletId: TEST_OUTLET_ID,
        shiftId,
        kasirId: TEST_USER_ID,
        customerName: 'Kak Budi E2E',
        subtotal,
        discountAmount,
        taxRate,
        taxAmount,
        total,
        paymentMethod: 'cash',
        status: 'completed',
        createdAt: now,
      });

      // 2. Insert item snapshot
      await tx.insert(orderItems).values({
        id: `oit_test_${Date.now().toString().slice(-6)}`,
        orderId,
        productId: TEST_PRODUCT_ID,
        productName: 'Es Kopi Susu Test E2E',
        productPrice: 25000,
        costPrice: 8000,
        quantity: purchaseQty,
        subtotal: 50000,
      });

      // 3. Decrement stock
      await tx
        .update(stock)
        .set({
          quantity: sql`quantity - ${purchaseQty}`,
          updatedAt: now,
        })
        .where(and(eq(stock.outletId, TEST_OUTLET_ID), eq(stock.productId, TEST_PRODUCT_ID)));

      // 4. Movement log
      await tx.insert(stockMovements).values({
        id: `smv_test_${Date.now().toString().slice(-6)}`,
        outletId: TEST_OUTLET_ID,
        productId: TEST_PRODUCT_ID,
        type: 'out',
        quantity: -purchaseQty,
        referenceId: orderId,
        createdBy: TEST_USER_ID,
        createdAt: now,
      });
    });

    // Verification
    const [savedOrder] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(savedOrder).toBeDefined();
    expect(savedOrder.total).toBe(49950);
    expect(savedOrder.status).toBe('completed');

    const [updatedStock] = await db
      .select()
      .from(stock)
      .where(and(eq(stock.outletId, TEST_OUTLET_ID), eq(stock.productId, TEST_PRODUCT_ID)));
    expect(updatedStock.quantity).toBe(48); // 50 - 2 = 48 pcs
  });

  it('Step 4: Record operational expense', async () => {
    const expenseId = `exp_test_${Date.now().toString().slice(-6)}`;
    const now = Math.floor(Date.now() / 1000);

    await db.insert(expenses).values({
      id: expenseId,
      outletId: TEST_OUTLET_ID,
      createdBy: TEST_USER_ID,
      description: 'Beli Es Batu Kristal 1 Pack',
      amount: 15000,
      paymentMethod: 'cash',
      expenseDate: now,
      createdAt: now,
    });

    const [savedExpense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
    expect(savedExpense).toBeDefined();
    expect(savedExpense.amount).toBe(15000);
  });

  it('Step 5: Setup and generate Profit Sharing ledger', async () => {
    const ruleId = `psr_test_${Date.now().toString().slice(-6)}`;
    const now = Math.floor(Date.now() / 1000);

    // Rule: Owner A gets 40%
    await db.insert(profitSharingRules).values({
      id: ruleId,
      outletId: TEST_OUTLET_ID,
      name: 'Owner A Test',
      percentage: 40,
      isActive: 1,
      createdAt: now,
    });

    const netProfit = 10000000; // Rp 10.000.000
    const shareAmount = calcShare(netProfit, 40); // 4.000.000

    const ledgerId = `psl_test_${Date.now().toString().slice(-6)}`;
    await db.insert(profitSharingLedger).values({
      id: ledgerId,
      outletId: TEST_OUTLET_ID,
      ruleId,
      periodStart: now - 86400,
      periodEnd: now,
      netProfit,
      shareAmount,
      status: 'pending',
      createdAt: now,
    });

    const [ledgerEntry] = await db.select().from(profitSharingLedger).where(eq(profitSharingLedger.id, ledgerId));
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry.shareAmount).toBe(4000000);
    expect(ledgerEntry.status).toBe('pending');
  });

  it('Step 6: Close shift & verify expected cash reconciliation', async () => {
    const now = Math.floor(Date.now() / 1000);
    const openingCash = 150000;
    const cashOrderTotal = 49950;
    const expectedCash = openingCash + cashOrderTotal; // 199.950

    const closingCashCounted = 199950;

    await db
      .update(shifts)
      .set({
        closedAt: now,
        closingCash: closingCashCounted,
        expectedCash,
        notes: 'Rekonsiliasi cash cocok 100%',
      })
      .where(eq(shifts.id, shiftId));

    const [closedShift] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
    expect(closedShift.closedAt).not.toBeNull();
    expect(closedShift.expectedCash).toBe(199950);
    expect(closedShift.closingCash! - closedShift.expectedCash!).toBe(0);
  });

  it('Step 7: Void order & restore stock', async () => {
    const now = Math.floor(Date.now() / 1000);

    // Void the order
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ status: 'voided', voidedAt: now, voidedBy: TEST_USER_ID })
        .where(eq(orders.id, orderId));

      // Restore 2 pcs
      await tx
        .update(stock)
        .set({
          quantity: sql`quantity + 2`,
          updatedAt: now,
        })
        .where(and(eq(stock.outletId, TEST_OUTLET_ID), eq(stock.productId, TEST_PRODUCT_ID)));
    });

    const [voidedOrder] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(voidedOrder.status).toBe('voided');

    const [restoredStock] = await db
      .select()
      .from(stock)
      .where(and(eq(stock.outletId, TEST_OUTLET_ID), eq(stock.productId, TEST_PRODUCT_ID)));
    expect(restoredStock.quantity).toBe(50); // Restored back to 50 pcs!

    // Cleanup test data
    await db.delete(profitSharingLedger).where(eq(profitSharingLedger.outletId, TEST_OUTLET_ID));
    await db.delete(profitSharingRules).where(eq(profitSharingRules.outletId, TEST_OUTLET_ID));
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
    await db.delete(expenses).where(eq(expenses.outletId, TEST_OUTLET_ID));
    await db.delete(shifts).where(eq(shifts.outletId, TEST_OUTLET_ID));
    await db.delete(stockMovements).where(eq(stockMovements.outletId, TEST_OUTLET_ID));
    await db.delete(stock).where(eq(stock.outletId, TEST_OUTLET_ID));
    await db.delete(products).where(eq(products.id, TEST_PRODUCT_ID));
    await db.delete(user).where(eq(user.id, TEST_USER_ID));
    await db.delete(outlets).where(eq(outlets.id, TEST_OUTLET_ID));
  });
});

