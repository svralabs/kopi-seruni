import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, expenses, orderItems } from '@/lib/schema';
import { sql, eq, and, gte, lte } from 'drizzle-orm';
import { formatRupiah, getDateRangeFromParams } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || 'this_month';
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const outletId = searchParams.get('outletId') || 'all';

  const { startEpoch, endEpoch, label: periodLabel } = getDateRangeFromParams({ period, from, to });

  const orderConditions = [eq(orders.status, 'completed')];
  if (startEpoch > 0) orderConditions.push(gte(orders.createdAt, startEpoch));
  if (endEpoch > 0) orderConditions.push(lte(orders.createdAt, endEpoch));
  if (outletId !== 'all') orderConditions.push(eq(orders.outletId, outletId));

  const revenueQuery = await db
    .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
    .from(orders)
    .where(and(...orderConditions));

  const totalRevenue = Number(revenueQuery[0]?.total || 0);

  const cogsQuery = await db
    .select({
      totalCost: sql<number>`COALESCE(SUM(order_items.cost_price * order_items.quantity), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(...orderConditions));

  const totalCOGS = Number(cogsQuery[0]?.totalCost || 0);

  const expenseConditions = [];
  if (startEpoch > 0) expenseConditions.push(gte(expenses.expenseDate, startEpoch));
  if (endEpoch > 0) expenseConditions.push(lte(expenses.expenseDate, endEpoch));
  if (outletId !== 'all') expenseConditions.push(eq(expenses.outletId, outletId));

  const expenseQuery = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(expenses)
    .where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined);

  const totalExpenses = Number(expenseQuery[0]?.total || 0);

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  const rows = [
    ['LAPORAN LABA RUGI — KOPI SERUNI', ''],
    ['Periode', periodLabel.toUpperCase()],
    ['Cabang Outlet', outletId.toUpperCase()],
    ['Waktu Ekspor', new Date().toLocaleString('id-ID')],
    ['', ''],
    ['KOMPONEN KEUANGAN', 'NOMINAL (RP)'],
    ['1. Total Revenue / Omset Penjualan', totalRevenue],
    ['2. Beban Pokok Penjualan (HPP / COGS)', totalCOGS],
    ['3. LABA KOTOR (GROSS PROFIT)', grossProfit],
    ['4. Beban Pengeluaran Operasional', totalExpenses],
    ['5. LABA BERSIH (NET PROFIT)', netProfit],
    ['Net Profit Margin (%)', `${netMargin}%`],
  ];

  const csvContent = '\uFEFF' + rows.map((e) => e.map(val => `"${val}"`).join(',')).join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="laporan-laba-rugi-${Date.now()}.csv"`,
    },
  });
}
