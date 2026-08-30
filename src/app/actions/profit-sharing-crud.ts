'use server';

import { db } from '@/lib/db';
import { profitSharingRules } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createRule(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const name = formData.get('name') as string;
  const percentage = Math.round(Number(formData.get('percentage')) || 0);
  const outletId = (formData.get('outletId') as string) || 'out_default';

  if (!name || percentage <= 0 || percentage > 100) {
    throw new Error('Nama penerima dan persentase (1-100%) wajib diisi');
  }

  const id = `psr_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = Math.floor(Date.now() / 1000);

  await db.insert(profitSharingRules).values({
    id,
    outletId,
    name,
    percentage,
    isActive: 1,
    createdAt: now,
  });

  revalidatePath('/bagi-hasil');
}

export async function toggleRule(id: string, currentStatus: number) {
  const session = await getSession();
  if (!session) redirect('/login');

  await db
    .update(profitSharingRules)
    .set({ isActive: currentStatus === 1 ? 0 : 1 })
    .where(eq(profitSharingRules.id, id));

  revalidatePath('/bagi-hasil');
  return { success: true };
}
