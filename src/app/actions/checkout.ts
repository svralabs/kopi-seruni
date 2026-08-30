'use server';
import { db } from '@/lib/db';
import { orders, orderItems, stock, stockMovements } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import { calcDiscount, calcTax, calcTotal } from '@/lib/utils';
import { eq, and, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export interface CheckoutItem {
  productId: string;
  productName: string;
  productPrice: number;
  costPrice: number;
  quantity: number;
  notes?: string;
}

export interface CheckoutPayload {
  outletId: string;
  shiftId: string;
  customerName?: string;
  items: CheckoutItem[];
  discountId?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  taxRate: number; // dari settings outlet
  paymentMethod: 'cash' | 'qris' | 'transfer' | 'debit';
  notes?: string;
}

export async function checkout(payload: CheckoutPayload) {
  const session = await getSession();
  if (!session) redirect('/login');

  const subtotal = payload.items.reduce(
    (sum, i) => sum + i.productPrice * i.quantity,
    0,
  );

  const discountAmount = payload.discountId && payload.discountType && payload.discountValue != null
    ? calcDiscount(subtotal, payload.discountType, payload.discountValue)
    : 0;

  const afterDiscount = subtotal - discountAmount;
  const taxAmount = calcTax(afterDiscount, payload.taxRate);
  const total = calcTotal(subtotal, discountAmount, taxAmount);

  const orderId = `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = Math.floor(Date.now() / 1000);

  await db.transaction(async (tx) => {
    // 1. Insert order
    await tx.insert(orders).values({
      id: orderId,
      outletId: payload.outletId,
      shiftId: payload.shiftId,
      kasirId: session.user.id,
      customerName: payload.customerName ?? null,
      subtotal,
      discountId: payload.discountId ?? null,
      discountAmount,
      taxRate: payload.taxRate,
      taxAmount,
      total,
      paymentMethod: payload.paymentMethod,
      status: 'completed',
      notes: payload.notes ?? null,
      createdAt: now,
    });

    // 2. Insert order items
    await tx.insert(orderItems).values(
      payload.items.map((item) => ({
        id: `oit_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
        orderId,
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        costPrice: item.costPrice,
        quantity: item.quantity,
        subtotal: item.productPrice * item.quantity,
        notes: item.notes ?? null,
      })),
    );

    // 3. Decrement stock + insert movement per item
    for (const item of payload.items) {
      await tx
        .update(stock)
        .set({
          quantity: sql`quantity - ${item.quantity}`,
          updatedAt: now,
        })
        .where(and(
          eq(stock.outletId, payload.outletId),
          eq(stock.productId, item.productId),
        ));

      await tx.insert(stockMovements).values({
        id: `smv_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
        outletId: payload.outletId,
        productId: item.productId,
        type: 'out',
        quantity: -item.quantity,
        referenceId: orderId,
        createdBy: session.user.id,
        createdAt: now,
      });
    }
  });

  return { success: true, orderId, total };
}

export async function voidOrder(orderId: string, outletId: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const now = Math.floor(Date.now() / 1000);

  await db.transaction(async (tx) => {
    // 1. Get items untuk rollback stok
    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // 2. Void order
    await tx
      .update(orders)
      .set({ status: 'voided', voidedAt: now, voidedBy: session.user.id })
      .where(eq(orders.id, orderId));

    // 3. Rollback stok + insert movement void_return
    for (const item of items) {
      await tx
        .update(stock)
        .set({
          quantity: sql`quantity + ${item.quantity}`,
          updatedAt: now,
        })
        .where(and(
          eq(stock.outletId, outletId),
          eq(stock.productId, item.productId),
        ));

      await tx.insert(stockMovements).values({
        id: `smv_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
        outletId,
        productId: item.productId,
        type: 'void_return',
        quantity: item.quantity,
        referenceId: orderId,
        createdBy: session.user.id,
        createdAt: now,
      });
    }
  });

  return { success: true };
}
