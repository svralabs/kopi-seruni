'use server';

import { db } from '@/lib/db';
import { profitSharingRules } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';
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

  // Check existing active rules for this specific outlet
  const existingRules = await db
    .select()
    .from(profitSharingRules)
    .where(and(eq(profitSharingRules.outletId, outletId), eq(profitSharingRules.isActive, 1)));

  const currentTotal = existingRules.reduce((sum, r) => sum + r.percentage, 0);

  if (currentTotal + percentage > 100) {
    throw new Error(
      `Total alokasi bagi hasil outlet ini (${currentTotal}%) + ${percentage}% melebihi batas 100%. Sisa maksimal yang tersedia: ${100 - currentTotal}%.`
    );
  }

  const id = `psr_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = Math.floor(Date.now() / 1000);

  await db.insert(profitSharingRules).values({
    id,
    outletId,
    name: name.trim(),
    percentage,
    isActive: 1,
    createdAt: now,
  });

  revalidatePath('/bagi-hasil');
}

export async function toggleRule(id: string, currentStatus: number) {
  const session = await getSession();
  if (!session) redirect('/login');

  const nextStatus = currentStatus === 1 ? 0 : 1;

  if (nextStatus === 1) {
    // If activating, check if total exceeds 100%
    const [targetRule] = await db
      .select()
      .from(profitSharingRules)
      .where(eq(profitSharingRules.id, id));

    if (targetRule) {
      const activeRules = await db
        .select()
        .from(profitSharingRules)
        .where(
          and(
            eq(profitSharingRules.outletId, targetRule.outletId),
            eq(profitSharingRules.isActive, 1)
          )
        );

      const currentTotal = activeRules.reduce((sum, r) => sum + r.percentage, 0);
      if (currentTotal + targetRule.percentage > 100) {
        throw new Error(
          `Tidak dapat mengaktifkan: total persentase akan melebihi 100% (saat ini ${currentTotal}% + ${targetRule.percentage}%).`
        );
      }
    }
  }

  await db
    .update(profitSharingRules)
    .set({ isActive: nextStatus })
    .where(eq(profitSharingRules.id, id));

  revalidatePath('/bagi-hasil');
  return { success: true };
}

export async function deleteRule(id: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  await db.delete(profitSharingRules).where(eq(profitSharingRules.id, id));

  revalidatePath('/bagi-hasil');
  return { success: true };
}
