'use server';

import { db } from '@/lib/db';
import { stock, stockMovements, rawMaterials, rawMaterialStock, rawMaterialMovements } from '@/lib/schema';
import { getSession, getCurrentUserRole } from '@/lib/auth-helpers';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function adjustRawMaterialStock(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const rawMaterialId = formData.get('rawMaterialId') as string;
  const quantity = Math.round(Number(formData.get('quantity')) || 0);
  const type = (formData.get('type') as 'purchase' | 'usage' | 'adjustment' | 'waste') || 'adjustment';
  const notes = (formData.get('notes') as string) || null;
  const outletId = (formData.get('outletId') as string) || 'out_default';

  const { role, allRoles } = await getCurrentUserRole(session.user.id);
  if (role === 'kasir') {
    throw new Error('Akses Ditolak: Kasir tidak memiliki izin untuk mengubah stok.');
  }

  const hasAccess = role === 'owner' || allRoles.some((r) => r.outletId === outletId);
  if (!hasAccess) {
    throw new Error('Akses Ditolak: Anda tidak memiliki izin untuk mengelola stok di cabang ini.');
  }

  if (!rawMaterialId || quantity === 0) {
    throw new Error('Bahan baku dan jumlah penyesuaian wajib diisi');
  }

  const now = Math.floor(Date.now() / 1000);
  const moveQty = (type === 'usage' || type === 'waste') ? -Math.abs(quantity) : Math.abs(quantity);

  await db.transaction(async (tx) => {
    // Upsert raw material stock
    const existing = await tx
      .select()
      .from(rawMaterialStock)
      .where(and(eq(rawMaterialStock.outletId, outletId), eq(rawMaterialStock.rawMaterialId, rawMaterialId)))
      .limit(1);

    if (existing.length === 0) {
      await tx.insert(rawMaterialStock).values({
        id: `rms_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
        outletId,
        rawMaterialId,
        quantityOnHand: Math.max(0, moveQty),
        updatedAt: now,
      });
    } else {
      await tx
        .update(rawMaterialStock)
        .set({
          quantityOnHand: sql`MAX(0, quantity_on_hand + ${moveQty})`,
          updatedAt: now,
        })
        .where(and(eq(rawMaterialStock.outletId, outletId), eq(rawMaterialStock.rawMaterialId, rawMaterialId)));
    }

    // Insert movement log
    await tx.insert(rawMaterialMovements).values({
      id: `rmm_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
      outletId,
      rawMaterialId,
      type,
      quantity: moveQty,
      notes,
      createdBy: session.user.id,
      createdAt: now,
    });
  });

  revalidatePath('/stok');
  revalidatePath('/pos');
}

export async function adjustStock(formData: FormData) {
  const rawMaterialId = formData.get('rawMaterialId') as string;
  if (rawMaterialId) {
    return adjustRawMaterialStock(formData);
  }

  const session = await getSession();
  if (!session) redirect('/login');

  const productId = formData.get('productId') as string;
  const quantity = Math.round(Number(formData.get('quantity')) || 0);
  const type = (formData.get('type') as 'in' | 'out' | 'adjustment') || 'adjustment';
  const notes = (formData.get('notes') as string) || null;
  const outletId = (formData.get('outletId') as string) || 'out_default';

  if (!productId || quantity === 0) {
    throw new Error('Produk dan jumlah penyesuaian wajib diisi');
  }

  const now = Math.floor(Date.now() / 1000);
  const moveQty = type === 'out' ? -Math.abs(quantity) : Math.abs(quantity);

  await db.transaction(async (tx) => {
    // Upsert stock
    const existing = await tx
      .select()
      .from(stock)
      .where(and(eq(stock.outletId, outletId), eq(stock.productId, productId)))
      .limit(1);

    if (existing.length === 0) {
      await tx.insert(stock).values({
        id: `stk_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
        outletId,
        productId,
        quantity: Math.max(0, moveQty),
        unit: 'pcs',
        updatedAt: now,
      });
    } else {
      await tx
        .update(stock)
        .set({
          quantity: sql`MAX(0, quantity + ${moveQty})`,
          updatedAt: now,
        })
        .where(and(eq(stock.outletId, outletId), eq(stock.productId, productId)));
    }

    // Insert movement
    await tx.insert(stockMovements).values({
      id: `smv_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
      outletId,
      productId,
      type,
      quantity: moveQty,
      notes,
      createdBy: session.user.id,
      createdAt: now,
    });
  });

  revalidatePath('/stok');
}
