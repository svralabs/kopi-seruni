'use server';
import { db } from '@/lib/db';
import { shifts, orders } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import { eq, and, sum } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';

export async function openShift(outletId: string, openingCash: number) {
  const session = await getSession();
  if (!session) redirect('/login');

  const now = Math.floor(Date.now() / 1000);
  const shiftId = `shf_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

  await db.insert(shifts).values({
    id: shiftId,
    outletId,
    kasirId: session.user.id,
    openedAt: now,
    openingCash,
  });

  return { shiftId };
}

export async function closeShift(shiftId: string, outletId: string, closingCash: number, notes?: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const now = Math.floor(Date.now() / 1000);

  // Hitung expected cash: modal awal + total semua order cash di shift ini
  const shift = await db.query.shifts.findFirst({ where: eq(shifts.id, shiftId) });
  if (!shift) throw new Error('Shift tidak ditemukan');

  const [cashResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
    .from(orders)
    .where(and(
      eq(orders.shiftId, shiftId),
      eq(orders.paymentMethod, 'cash'),
      eq(orders.status, 'completed'),
    ));

  const expectedCash = shift.openingCash + (cashResult?.total ?? 0);

  await db
    .update(shifts)
    .set({ closedAt: now, closingCash, expectedCash, notes: notes ?? null })
    .where(eq(shifts.id, shiftId));

  return { expectedCash, closingCash, diff: closingCash - expectedCash };
}
