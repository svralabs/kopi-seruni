'use server';

import { db } from '@/lib/db';
import { profitSharingRules, profitSharingLedger, orders, orderItems, expenses } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import { calcShare } from '@/lib/utils';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Generate bagi hasil untuk periode dan outlet tertentu.
 * - Jika netProfit manual = 0/undefined, hitung otomatis dari DB (Revenue - HPP - Expenses)
 * - Ambil semua rule aktif untuk outlet tersebut (misal: Owner A 50%, Owner B 30%, Owner C 20%)
 * - Hitung share_amount = Math.floor(netProfit * percentage / 100)
 * - Insert ke ledger
 */
export async function generateProfitSharing(
  outletId: string,
  periodStart: number, // unixepoch
  periodEnd: number,   // unixepoch
  manualNetProfit?: number,
) {
  const session = await getSession();
  if (!session) redirect('/login');

  let calculatedNetProfit = manualNetProfit || 0;

  if (!calculatedNetProfit || calculatedNetProfit <= 0) {
    // 1. Calculate Revenue
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

    // 2. Calculate COGS
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

    // 3. Calculate Expenses
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
