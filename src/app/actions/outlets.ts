'use server';

import { db } from '@/lib/db';
import {
  outlets,
  userOutletRoles,
  settings,
  categories,
  products,
  expenses,
  expenseCategories,
  discounts,
  shifts,
  stock,
  stockMovements,
  rawMaterials,
  productRecipes,
  rawMaterialStock,
  rawMaterialMovements,
  orders,
  orderItems,
  profitSharingRules,
  profitSharingLedger,
} from '@/lib/schema';
import { getSession, getUserAccessibleOutlets } from '@/lib/auth-helpers';
import { getOutlets } from '@/lib/queries';
import { eq, inArray } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createOutlet(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const name = formData.get('name') as string;
  const address = (formData.get('address') as string) || null;
  const phone = (formData.get('phone') as string) || null;

  if (!name || name.trim() === '') {
    throw new Error('Nama outlet wajib diisi');
  }

  const id = `out_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const now = Math.floor(Date.now() / 1000);

  await db.transaction(async (tx) => {
    await tx.insert(outlets).values({
      id,
      name: name.trim(),
      address: address ? address.trim() : null,
      phone: phone ? phone.trim() : null,
      createdAt: now,
    });

    // Otomatis assign user pembuat sebagai owner pada outlet baru ini
    await tx.insert(userOutletRoles).values({
      id: `uor_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
      userId: session.user.id,
      outletId: id,
      role: 'owner',
      createdAt: now,
    });
  });

  revalidateTag('outlets', 'max');
  revalidatePath('/outlets');
  revalidatePath('/pos');
}

export async function updateOutlet(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { isOwner, accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
  if (!isOwner || !accessibleOutletIds.includes(id)) {
    throw new Error('Akses ditolak: Anda tidak memiliki wewenang Owner pada cabang ini.');
  }

  const name = formData.get('name') as string;
  const address = (formData.get('address') as string) || null;
  const phone = (formData.get('phone') as string) || null;

  if (!name || name.trim() === '') {
    throw new Error('Nama outlet wajib diisi');
  }

  await db
    .update(outlets)
    .set({
      name: name.trim(),
      address: address ? address.trim() : null,
      phone: phone ? phone.trim() : null,
    })
    .where(eq(outlets.id, id));

  revalidateTag('outlets', 'max');
  revalidatePath('/outlets');
  revalidatePath('/pos');
}

export async function deleteOutlet(outletId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Sesi anda telah berakhir. Silakan login kembali.' };
    }

    // Validasi scope kepemilikan: Hanya owner cabang terkait yang boleh menghapus
    const { isOwner, accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
    if (!isOwner || !accessibleOutletIds.includes(outletId)) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang Owner pada cabang ini.' };
    }

    // Validasi batas minimum outlet sistem
    const allOutlets = await getOutlets();
    if (allOutlets.length <= 1) {
      return {
        success: false,
        error: 'Tidak dapat menghapus cabang terakhir. Sistem memerlukan minimal satu cabang outlet aktif.',
      };
    }

    await db.transaction(async (tx) => {
      // 1. Ambil order terkait outlet ini untuk hapus orderItems
      const outletOrders = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.outletId, outletId));
      const outletOrderIds = outletOrders.map((o) => o.id);

      // Ambil seluruh produk milik outlet ini
      const outletProducts = await tx
        .select({ id: products.id })
        .from(products)
        .where(eq(products.outletId, outletId));
      const outletProductIds = outletProducts.map((p) => p.id);

      // Ambil seluruh bahan baku milik outlet ini
      const outletRawMaterials = await tx
        .select({ id: rawMaterials.id })
        .from(rawMaterials)
        .where(eq(rawMaterials.outletId, outletId));
      const outletRawMaterialIds = outletRawMaterials.map((r) => r.id);

      // A. Hapus order items yang merujuk pada pesanan outlet atau produk outlet
      if (outletOrderIds.length > 0) {
        await tx.delete(orderItems).where(inArray(orderItems.orderId, outletOrderIds));
      }
      if (outletProductIds.length > 0) {
        await tx.delete(orderItems).where(inArray(orderItems.productId, outletProductIds));
      }

      // B. Hapus resep produk (product_recipes) yang merujuk pada produk atau bahan baku outlet ini
      if (outletProductIds.length > 0) {
        await tx.delete(productRecipes).where(inArray(productRecipes.productId, outletProductIds));
      }
      if (outletRawMaterialIds.length > 0) {
        await tx.delete(productRecipes).where(inArray(productRecipes.rawMaterialId, outletRawMaterialIds));
      }

      // C. Hapus stok produk & log mutasi stok produk
      await tx.delete(stockMovements).where(eq(stockMovements.outletId, outletId));
      if (outletProductIds.length > 0) {
        await tx.delete(stockMovements).where(inArray(stockMovements.productId, outletProductIds));
      }
      await tx.delete(stock).where(eq(stock.outletId, outletId));
      if (outletProductIds.length > 0) {
        await tx.delete(stock).where(inArray(stock.productId, outletProductIds));
      }

      // D. Hapus produk
      await tx.delete(products).where(eq(products.outletId, outletId));

      // E. Hapus kategori produk
      await tx.delete(categories).where(eq(categories.outletId, outletId));

      // F. Hapus pesanan (orders)
      await tx.delete(orders).where(eq(orders.outletId, outletId));

      // G. Hapus mutasi & stok bahan baku (raw materials)
      await tx.delete(rawMaterialMovements).where(eq(rawMaterialMovements.outletId, outletId));
      if (outletRawMaterialIds.length > 0) {
        await tx.delete(rawMaterialMovements).where(inArray(rawMaterialMovements.rawMaterialId, outletRawMaterialIds));
      }
      await tx.delete(rawMaterialStock).where(eq(rawMaterialStock.outletId, outletId));
      if (outletRawMaterialIds.length > 0) {
        await tx.delete(rawMaterialStock).where(inArray(rawMaterialStock.rawMaterialId, outletRawMaterialIds));
      }
      await tx.delete(rawMaterials).where(eq(rawMaterials.outletId, outletId));

      // H. Hapus pengeluaran (expenses) & kategori pengeluaran (expense_categories)
      await tx.delete(expenses).where(eq(expenses.outletId, outletId));
      await tx.delete(expenseCategories).where(eq(expenseCategories.outletId, outletId));

      // I. Hapus shift kasir
      await tx.delete(shifts).where(eq(shifts.outletId, outletId));

      // J. Hapus diskon
      await tx.delete(discounts).where(eq(discounts.outletId, outletId));

      // K. Hapus ledger bagi hasil & rules bagi hasil
      await tx.delete(profitSharingLedger).where(eq(profitSharingLedger.outletId, outletId));
      await tx.delete(profitSharingRules).where(eq(profitSharingRules.outletId, outletId));

      // L. Hapus pengaturan outlet (settings)
      await tx.delete(settings).where(eq(settings.outletId, outletId));

      // M. Hapus penugasan role staf pada outlet ini (user_outlet_roles)
      await tx.delete(userOutletRoles).where(eq(userOutletRoles.outletId, outletId));

      // N. Terakhir: Hapus entitas outlet
      await tx.delete(outlets).where(eq(outlets.id, outletId));
    });

    try {
      revalidateTag('outlets', 'max');
      revalidatePath('/outlets');
      revalidatePath('/pos');
      revalidatePath('/dashboard');
    } catch (e) {
      console.warn('Revalidation warning:', e);
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteOutlet error:', err);
    return { success: false, error: err?.message || 'Gagal menghapus cabang outlet' };
  }
}

