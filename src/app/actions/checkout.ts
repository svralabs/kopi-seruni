'use server';
import { db } from '@/lib/db';
import {
  orders, orderItems, stock, stockMovements, shifts, discounts,
  rawMaterials, productRecipes, rawMaterialStock, rawMaterialMovements,
} from '@/lib/schema';
import { getSession, getCurrentUserRole } from '@/lib/auth-helpers';
import { calcDiscount, calcTax, calcTotal } from '@/lib/utils';
import { eq, and, isNull, sql } from 'drizzle-orm';
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
  shiftId?: string;
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

  // Validasi hak akses user di outlet terkait
  const { role, allRoles } = await getCurrentUserRole(session.user.id);
  const hasAccess = role === 'owner' || allRoles.some((r) => r.outletId === payload.outletId);
  if (!hasAccess) {
    throw new Error('Akses Ditolak: Anda tidak memiliki izin untuk memproses transaksi di cabang ini.');
  }

  const subtotal = payload.items.reduce(
    (sum, i) => sum + i.productPrice * i.quantity,
    0,
  );

  // Sanitize discountId (convert empty string to null)
  const sanitizedDiscountId =
    payload.discountId && payload.discountId.trim() !== ''
      ? payload.discountId.trim()
      : null;

  const discountAmount = sanitizedDiscountId && payload.discountType && payload.discountValue != null
    ? calcDiscount(subtotal, payload.discountType, payload.discountValue)
    : 0;

  const afterDiscount = subtotal - discountAmount;
  const taxAmount = calcTax(afterDiscount, payload.taxRate);
  const total = calcTotal(subtotal, discountAmount, taxAmount);

  // Sanitize shiftId (verify against DB or find active open shift)
  let sanitizedShiftId: string | null = null;
  if (payload.shiftId && payload.shiftId.trim() !== '' && payload.shiftId !== 'shf_default') {
    const [existingShift] = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(eq(shifts.id, payload.shiftId.trim()))
      .limit(1);
    if (existingShift) {
      sanitizedShiftId = existingShift.id;
    }
  }

  // If no valid shift provided, check if an open shift exists in this outlet
  if (!sanitizedShiftId) {
    const [activeShift] = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.outletId, payload.outletId), isNull(shifts.closedAt)))
      .limit(1);
    if (activeShift) {
      sanitizedShiftId = activeShift.id;
    }
  }

  const orderId = `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = Math.floor(Date.now() / 1000);

  await db.transaction(async (tx) => {
    // 1. Insert order
    await tx.insert(orders).values({
      id: orderId,
      outletId: payload.outletId,
      shiftId: sanitizedShiftId,
      kasirId: session.user.id,
      customerName: payload.customerName && payload.customerName.trim() !== '' ? payload.customerName.trim() : 'Pelanggan Walk-in',
      subtotal,
      discountId: sanitizedDiscountId,
      discountAmount,
      taxRate: payload.taxRate,
      taxAmount,
      total,
      paymentMethod: payload.paymentMethod,
      status: 'completed',
      notes: payload.notes && payload.notes.trim() !== '' ? payload.notes.trim() : null,
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
        notes: item.notes && item.notes.trim() !== '' ? item.notes.trim() : null,
      })),
    );

    // 3. Decrement product stock + insert movement per item
    for (const item of payload.items) {
      const existingStock = await tx
        .select()
        .from(stock)
        .where(and(
          eq(stock.outletId, payload.outletId),
          eq(stock.productId, item.productId),
        ))
        .limit(1);

      if (existingStock.length > 0) {
        await tx
          .update(stock)
          .set({
            quantity: sql`MAX(0, quantity - ${item.quantity})`,
            updatedAt: now,
          })
          .where(and(
            eq(stock.outletId, payload.outletId),
            eq(stock.productId, item.productId),
          ));
      } else {
        await tx.insert(stock).values({
          id: `stk_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
          outletId: payload.outletId,
          productId: item.productId,
          quantity: 0,
          unit: 'pcs',
          updatedAt: now,
        });
      }

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

    // 4. Deduct raw material stock based on product recipes (ingredient-based tracking)
    for (const item of payload.items) {
      const recipes = await tx
        .select({
          rawMaterialId: productRecipes.rawMaterialId,
          quantityUsed: productRecipes.quantityUsed,
        })
        .from(productRecipes)
        .where(eq(productRecipes.productId, item.productId));

      for (const recipe of recipes) {
        const totalDeduct = recipe.quantityUsed * item.quantity;
        // Deduct from raw material stock (floor at 0)
        await tx.run(sql`
          UPDATE raw_material_stock
          SET quantity_on_hand = MAX(0, quantity_on_hand - ${totalDeduct}),
              updated_at = ${now}
          WHERE outlet_id = ${payload.outletId}
            AND raw_material_id = ${recipe.rawMaterialId}
        `);
        // Insert usage movement log
        await tx.insert(rawMaterialMovements).values({
          id: `rmm_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
          outletId: payload.outletId,
          rawMaterialId: recipe.rawMaterialId,
          type: 'usage',
          quantity: -totalDeduct,
          referenceId: orderId,
          createdBy: session.user.id,
          createdAt: now,
        });
      }
    }
  });

  return { success: true, orderId, total };
}

export async function voidOrder(orderId: string, outletId: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { role } = await getCurrentUserRole(session.user.id, outletId);
  if (role === 'kasir') {
    throw new Error('Akses Ditolak: Kasir dilarang membatalkan (void) transaksi. Hubungi Manajer atau Owner.');
  }

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

export async function getOrderItems(orderId: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}
