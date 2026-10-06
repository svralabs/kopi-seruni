'use server';

import { db } from '@/lib/db';
import { settings, outlets } from '@/lib/schema';
import { getSession, getCurrentUserRole } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function saveSettings(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const outletId = (formData.get('outletId') as string) || 'out_default';

  const { role, allRoles } = await getCurrentUserRole(session.user.id);
  if (role === 'kasir') {
    throw new Error('Akses Ditolak: Kasir tidak memiliki izin untuk mengubah pengaturan.');
  }

  const hasAccess = role === 'owner' || allRoles.some((r) => r.outletId === outletId);
  if (!hasAccess) {
    throw new Error('Akses Ditolak: Anda tidak memiliki izin untuk mengubah pengaturan di cabang ini.');
  }

  const taxRate = formData.get('taxRate') as string;
  const receiptFooter = formData.get('receiptFooter') as string;
  const phone = formData.get('phone') as string;
  const address = formData.get('address') as string;

  const entries = [
    { key: 'tax_rate', value: taxRate || '11' },
    { key: 'receipt_footer', value: receiptFooter || 'Terima kasih atas kunjungan Anda!' },
  ];

  // 1. Update/Upsert key-value settings
  for (const item of entries) {
    const existing = await db
      .select()
      .from(settings)
      .where(and(eq(settings.outletId, outletId), eq(settings.key, item.key)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value: item.value })
        .where(and(eq(settings.outletId, outletId), eq(settings.key, item.key)));
    } else {
      await db.insert(settings).values({
        outletId,
        key: item.key,
        value: item.value,
      });
    }
  }

  // 2. Update Outlet address/phone if provided
  if (address || phone) {
    await db
      .update(outlets)
      .set({
        address: address || null,
        phone: phone || null,
      })
      .where(eq(outlets.id, outletId));
  }

  revalidatePath('/settings');
  revalidatePath('/pos');
}
