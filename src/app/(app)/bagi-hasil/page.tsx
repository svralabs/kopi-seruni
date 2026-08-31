import { db } from '@/lib/db';
import { profitSharingRules, profitSharingLedger, outlets, orders, orderItems, expenses } from '@/lib/schema';
import { getOutlets, getProfitSharingRules } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import BagiHasilClient from './bagi-hasil-client';
import { desc, eq, and, sql, gte, lte } from 'drizzle-orm';

export default async function BagiHasilPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const { effectiveOutletId, accessibleOutlets } = await requireAuthRole(
    ['owner'],
    resolvedParams.outletId
  );
  const outletId = effectiveOutletId;

  let allOutlets: any[] = accessibleOutlets;
  let rulesList: any[] = [];
  let ledgerList: any[] = [];
  let currentMonthNetProfit = 0;
  let totalPaidDividends = 0;
  let totalPendingDividends = 0;

  try {
    const now = new Date();
    const startOfMonth = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    const endOfMonth = Math.floor(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000);

    const [rulesRes, rawLedger, revRes, cogsRes, expRes] = await Promise.all([
      getProfitSharingRules(outletId),
      db
        .select({
          ledger: profitSharingLedger,
          rule: profitSharingRules,
        })
        .from(profitSharingLedger)
        .leftJoin(profitSharingRules, eq(profitSharingLedger.ruleId, profitSharingRules.id))
        .where(eq(profitSharingLedger.outletId, outletId))
        .orderBy(desc(profitSharingLedger.createdAt)),
      db
        .select({ total: sql<number>`COALESCE(SUM(${orders.total}), 0)` })
        .from(orders)
        .where(
          and(
            eq(orders.outletId, outletId),
            eq(orders.status, 'completed'),
            gte(orders.createdAt, startOfMonth),
            lte(orders.createdAt, endOfMonth)
          )
        ),
      db
        .select({ total: sql<number>`COALESCE(SUM(${orderItems.costPrice} * ${orderItems.quantity}), 0)` })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orders.outletId, outletId),
            eq(orders.status, 'completed'),
            gte(orders.createdAt, startOfMonth),
            lte(orders.createdAt, endOfMonth)
          )
        ),
      db
        .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
        .from(expenses)
        .where(
          and(
            eq(expenses.outletId, outletId),
            gte(expenses.expenseDate, startOfMonth),
            lte(expenses.expenseDate, endOfMonth)
          )
        ),
    ]);

    rulesList = rulesRes;
    ledgerList = rawLedger.map((r) => ({
      ...r.ledger,
      ruleName: r.rule?.name || r.ledger.ruleId,
    }));

    const rev = Number(revRes[0]?.total || 0);
    const cogs = Number(cogsRes[0]?.total || 0);
    const exp = Number(expRes[0]?.total || 0);
    currentMonthNetProfit = Math.max(0, rev - cogs - exp);

    totalPaidDividends = ledgerList
      .filter((l) => l.status === 'paid')
      .reduce((sum, l) => sum + Number(l.shareAmount || 0), 0);

    totalPendingDividends = ledgerList
      .filter((l) => l.status === 'pending')
      .reduce((sum, l) => sum + Number(l.shareAmount || 0), 0);
  } catch (e) {
    console.warn('Error fetching bagi hasil data:', e);
  }

  return (
    <BagiHasilClient
      rulesList={rulesList}
      ledgerList={ledgerList}
      outlets={allOutlets}
      currentOutletId={outletId}
      currentNetProfit={currentMonthNetProfit}
      totalPaidDividends={totalPaidDividends}
      totalPendingDividends={totalPendingDividends}
    />
  );
}
