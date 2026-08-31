'use server';

import { db } from '@/lib/db';
import { profitSharingRules, profitSharingLedger, orders, orderItems, expenses } from '@/lib/schema';
import { getSession, getUserAccessibleOutlets } from '@/lib/auth-helpers';
import { calcShare } from '@/lib/utils';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createRule(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const name = formData.get('name') as string;
  const percentage = Math.round(Number(formData.get('percentage')) || 0);
  const outletId = (formData.get('outletId') as string) || 'out_default';

  const { accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
  if (!accessibleOutletIds.includes(outletId)) {
    throw new Error('Akses Ditolak: Anda tidak memiliki izin untuk mengelola bagi hasil di cabang ini.');
  }

  if (!name || percentage <= 0 || percentage > 100) {
    throw new Error('Nama penerima dan persentase (1-100%) wajib diisi');
  }

  const existingRules = await db
    .select()
    .from(profitSharingRules)
    .where(and(eq(profitSharingRules.outletId, outletId), eq(profitSharingRules.isActive, 1)));

  const currentTotal = existingRules.reduce((sum, r) => sum + r.percentage, 0);

  if (currentTotal + percentage > 100) {
    throw new Error(
      `Total alokasi bagi hasil outlet (${currentTotal}%) + ${percentage}% melebihi batas 100%. Sisa maksimal: ${100 - currentTotal}%.`
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

  revalidateTag('profit_sharing_rules', 'max');
  revalidatePath('/bagi-hasil');
}

export async function updateRule(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const name = formData.get('name') as string;
  const percentage = Math.round(Number(formData.get('percentage')) || 0);

  if (!name || percentage <= 0 || percentage > 100) {
    throw new Error('Nama penerima dan persentase (1-100%) wajib diisi');
  }

  const [targetRule] = await db
    .select()
    .from(profitSharingRules)
    .where(eq(profitSharingRules.id, id));

  if (!targetRule) throw new Error('Data aturan bagi hasil tidak ditemukan');

  const otherRules = await db
    .select()
    .from(profitSharingRules)
    .where(
      and(
        eq(profitSharingRules.outletId, targetRule.outletId),
        eq(profitSharingRules.isActive, 1)
      )
    );

  const currentOtherTotal = otherRules
    .filter((r) => r.id !== id)
    .reduce((sum, r) => sum + r.percentage, 0);

  if (targetRule.isActive === 1 && currentOtherTotal + percentage > 100) {
    throw new Error(
      `Total alokasi melebihi 100% (saat ini ${currentOtherTotal}% + ${percentage}% = ${currentOtherTotal + percentage}%).`
    );
  }

  await db
    .update(profitSharingRules)
    .set({
      name: name.trim(),
      percentage,
    })
    .where(eq(profitSharingRules.id, id));

  revalidateTag('profit_sharing_rules', 'max');
  revalidatePath('/bagi-hasil');
  return { success: true };
}

export async function toggleRule(id: string, currentStatus: number) {
  const session = await getSession();
  if (!session) redirect('/login');

  const nextStatus = currentStatus === 1 ? 0 : 1;

  if (nextStatus === 1) {
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

  revalidateTag('profit_sharing_rules', 'max');
  revalidatePath('/bagi-hasil');
  return { success: true };
}

export async function deleteRule(id: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  await db.delete(profitSharingRules).where(eq(profitSharingRules.id, id));

  revalidateTag('profit_sharing_rules', 'max');
  revalidatePath('/bagi-hasil');
  return { success: true };
}

export async function generateProfitSharing(
  outletId: string,
  periodStart: number,
  periodEnd: number,
  manualNetProfit?: number,
) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
  if (!accessibleOutletIds.includes(outletId)) {
    throw new Error('Akses Ditolak: Anda tidak memiliki izin untuk mengelola bagi hasil di cabang ini.');
  }

  let calculatedNetProfit = manualNetProfit || 0;

  if (!calculatedNetProfit || calculatedNetProfit <= 0) {
    const revenueQuery = await db
      .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          eq(orders.outletId, outletId),
          gte(orders.createdAt, periodStart),
          lte(orders.createdAt, periodEnd)
        )
      );
    const revenue = Number(revenueQuery[0]?.total || 0);

    const cogsQuery = await db
      .select({
        totalCost: sql<number>`COALESCE(SUM(order_items.cost_price * order_items.quantity), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.status, 'completed'),
          eq(orders.outletId, outletId),
          gte(orders.createdAt, periodStart),
          lte(orders.createdAt, periodEnd)
        )
      );
    const cogs = Number(cogsQuery[0]?.totalCost || 0);

    const expensesQuery = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(expenses)
      .where(
        and(
          eq(expenses.outletId, outletId),
          gte(expenses.expenseDate, periodStart),
          lte(expenses.expenseDate, periodEnd)
        )
      );
    const totalExpenses = Number(expensesQuery[0]?.total || 0);

    calculatedNetProfit = revenue - cogs - totalExpenses;
  }

  if (calculatedNetProfit <= 0) {
    throw new Error(`Net Profit untuk periode ini adalah ${calculatedNetProfit} (tidak ada profit untuk dibagi).`);
  }

  const rules = await db
    .select()
    .from(profitSharingRules)
    .where(and(eq(profitSharingRules.outletId, outletId), eq(profitSharingRules.isActive, 1)));

  if (rules.length === 0) {
    throw new Error('Belum ada penerima bagi hasil (rules) yang aktif untuk outlet ini.');
  }

  const now = Math.floor(Date.now() / 1000);

  const entries = rules.map((rule) => ({
    id: `psl_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
    outletId,
    ruleId: rule.id,
    periodStart,
    periodEnd,
    netProfit: calculatedNetProfit,
    shareAmount: calcShare(calculatedNetProfit, rule.percentage),
    status: 'pending' as const,
    createdAt: now,
  }));

  await db.insert(profitSharingLedger).values(entries);

  revalidatePath('/bagi-hasil');
  return entries.map((e) => ({
    name: rules.find((r) => r.id === e.ruleId)!.name,
    percentage: rules.find((r) => r.id === e.ruleId)!.percentage,
    shareAmount: e.shareAmount,
  }));
}

export async function markSharePaid(ledgerId: string, outletId: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const now = Math.floor(Date.now() / 1000);
  await db
    .update(profitSharingLedger)
    .set({ status: 'paid', paidAt: now })
    .where(eq(profitSharingLedger.id, ledgerId));

  revalidatePath('/bagi-hasil');
  return { success: true };
}
