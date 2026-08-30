'use server';

import { db } from '@/lib/db';
import { discounts } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createDiscount(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const outletId = (formData.get('outletId') as string) || 'out_default';
  const name = formData.get('name') as string;
  const type = formData.get('type') as 'percentage' | 'fixed';
  const value = Number(formData.get('value'));
  const minPurchase = Number(formData.get('minPurchase') || 0);

  if (!name || name.trim() === '') {
    throw new Error('Nama voucher/diskon wajib diisi');
  }

  if (!value || value <= 0) {
    throw new Error('Nilai diskon harus lebih dari 0');
  }

  if (type === 'percentage' && value > 100) {
    throw new Error('Diskon persentase tidak boleh melebihi 100%');
  }

  const id = `dsc_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const now = Math.floor(Date.now() / 1000);

  await db.insert(discounts).values({
    id,
    outletId,
    name: name.trim(),
    type,
    value,
    minPurchase,
    isActive: 1,
    createdAt: now,
  });

  revalidatePath('/discounts');
  revalidatePath('/pos');
}

export async function toggleDiscount(id: string, currentStatus: number) {
  const session = await getSession();
  if (!session) redirect('/login');

  const nextStatus = currentStatus === 1 ? 0 : 1;

  await db
    .update(discounts)
    .set({ isActive: nextStatus })
    .where(eq(discounts.id, id));

  revalidatePath('/discounts');
  revalidatePath('/pos');
}

export async function updateDiscount(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const outletId = (formData.get('outletId') as string) || 'out_default';
  const name = formData.get('name') as string;
  const type = formData.get('type') as 'percentage' | 'fixed';
  const value = Number(formData.get('value'));
  const minPurchase = Number(formData.get('minPurchase') || 0);

  if (!name || name.trim() === '') {
    throw new Error('Nama voucher/diskon wajib diisi');
  }

  if (!value || value <= 0) {
    throw new Error('Nilai diskon harus lebih dari 0');
  }

  if (type === 'percentage' && value > 100) {
    throw new Error('Diskon persentase tidak boleh melebihi 100%');
  }

  await db
    .update(discounts)
    .set({
      outletId,
      name: name.trim(),
      type,
      value,
      minPurchase,
    })
    .where(eq(discounts.id, id));

  revalidatePath('/discounts');
  revalidatePath('/pos');
  return { success: true };
}

export async function deleteDiscount(id: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const now = Math.floor(Date.now() / 1000);

  await db
    .update(discounts)
    .set({ deletedAt: now })
    .where(eq(discounts.id, id));

  revalidatePath('/discounts');
  revalidatePath('/pos');
}

