'use server';

import { db } from '@/lib/db';
import { purchaseOrders, purchaseOrderItems, stock, stockMovements } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPurchaseOrder(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const outletId = (formData.get('outletId') as string) || 'out_default';
  const productId = formData.get('productId') as string;
  const quantity = Number(formData.get('quantity'));
  const unitCost = Number(formData.get('unitCost'));
  const notes = (formData.get('notes') as string) || null;

  if (!productId) {
    throw new Error('Pilih produk yang ingin dibeli');
  }

  if (!quantity || quantity <= 0) {
    throw new Error('Jumlah quantity harus lebih dari 0');
  }

  if (!unitCost || unitCost <= 0) {
    throw new Error('Biaya modal per unit harus lebih dari 0');
  }

  const poId = `po_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const poiId = `poi_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const now = Math.floor(Date.now() / 1000);
  const total = quantity * unitCost;

  await db.transaction(async (tx) => {
    // 1. Create Purchase Order header
    await tx.insert(purchaseOrders).values({
      id: poId,
      outletId,
      status: 'ordered',
      total,
      notes,
      orderedAt: now,
      createdBy: session.user.id,
      createdAt: now,
    });

    // 2. Insert item
    await tx.insert(purchaseOrderItems).values({
      id: poiId,
      poId,
      productId,
      quantity,
      unitCost,
    });
  });

  revalidatePath('/purchases');
  revalidatePath('/stok');
}

export async function receivePurchaseOrder(poId: string, outletId: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const now = Math.floor(Date.now() / 1000);

  await db.transaction(async (tx) => {
    // 1. Get PO items
    const items = await tx
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.poId, poId));

    // 2. Update PO status to received
    await tx
      .update(purchaseOrders)
      .set({
        status: 'received',
        receivedAt: now,
      })
      .where(eq(purchaseOrders.id, poId));

    // 3. Increment stock & create stock movements
    for (const item of items) {
      const existingStock = await tx
        .select()
        .from(stock)
        .where(and(eq(stock.outletId, outletId), eq(stock.productId, item.productId)))
        .limit(1);

      if (existingStock.length > 0) {
        await tx
          .update(stock)
          .set({
            quantity: sql`quantity + ${item.quantity}`,
            updatedAt: now,
          })
          .where(and(eq(stock.outletId, outletId), eq(stock.productId, item.productId)));
      } else {
        await tx.insert(stock).values({
          id: `stk_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
          outletId,
          productId: item.productId,
          quantity: item.quantity,
          unit: 'pcs',
          updatedAt: now,
        });
      }

      await tx.insert(stockMovements).values({
        id: `smv_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
        outletId,
        productId: item.productId,
        type: 'po_receive',
        quantity: item.quantity,
        referenceId: poId,
        createdBy: session.user.id,
        createdAt: now,
      });
    }
  });

  revalidatePath('/purchases');
  revalidatePath('/stok');
}

export async function cancelPurchaseOrder(poId: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  await db
    .update(purchaseOrders)
    .set({ status: 'cancelled' })
    .where(eq(purchaseOrders.id, poId));

  revalidatePath('/purchases');
}
