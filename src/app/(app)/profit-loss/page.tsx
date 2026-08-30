import { db } from '@/lib/db';
import { orders, expenses, orderItems } from '@/lib/schema';
import { formatRupiah } from '@/lib/utils';
import { sql, eq } from 'drizzle-orm';
import Link from 'next/link';

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const period = resolvedParams.period || 'this_month';

  const now = new Date();
  let startEpoch = 0;
  let periodLabel = 'Bulan Ini';

  if (period === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startEpoch = Math.floor(startOfMonth.getTime() / 1000);
    periodLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } else if (period === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startEpoch = Math.floor(startOfDay.getTime() / 1000);
    periodLabel = 'Hari Ini';
  } else if (period === 'all') {
    startEpoch = 0;
    periodLabel = 'Semua Periode';
  }

  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalExpenses = 0;

  try {
    // 1. Total Revenue
    const revenueQuery = startEpoch > 0
      ? await db
          .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
          .from(orders)
          .where(sql`status = 'completed' AND created_at >= ${startEpoch}`)
      : await db
          .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
          .from(orders)
          .where(eq(orders.status, 'completed'));

    totalRevenue = revenueQuery[0]?.total || 0;

    // 2. Real COGS from order_items
    const cogsQuery = startEpoch > 0
      ? await db
          .select({
            totalCost: sql<number>`COALESCE(SUM(order_items.cost_price * order_items.quantity), 0)`,
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(sql`orders.status = 'completed' AND orders.created_at >= ${startEpoch}`)
      : await db
          .select({
            totalCost: sql<number>`COALESCE(SUM(cost_price * quantity), 0)`,
          })
          .from(orderItems);

    totalCOGS = cogsQuery[0]?.totalCost || 0;

    // 3. Expenses
    const expenseQuery = startEpoch > 0
      ? await db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(expenses)
          .where(sql`expense_date >= ${startEpoch}`)
      : await db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(expenses);

    totalExpenses = expenseQuery[0]?.total || 0;
  } catch (e) {
    console.warn('Error querying profit loss:', e);
  }

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Laporan Laba Rugi</h1>
          <p className="text-sm text-zinc-500">Laporan keuangan & profitabilitas periode: <span className="font-semibold text-zinc-800">{periodLabel}</span></p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm text-sm">
          <Link
            href="/profit-loss?period=today"
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'today' ? 'bg-amber-600 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Hari Ini
          </Link>
          <Link
            href="/profit-loss?period=this_month"
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'this_month' ? 'bg-amber-600 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Bulan Ini
          </Link>
          <Link
            href="/profit-loss?period=all"
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'all' ? 'bg-amber-600 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Semua
          </Link>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Pendapatan (Omset)</span>
          <p className="text-2xl font-extrabold text-zinc-900 mt-2">{formatRupiah(totalRevenue)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total HPP / Modal Bahan</span>
          <p className="text-2xl font-extrabold text-zinc-700 mt-2">{formatRupiah(totalCOGS)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Laba Kotor (Gross Profit)</span>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">{formatRupiah(grossProfit)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Laba Bersih (Net Profit)</span>
          <p className={`text-2xl font-extrabold mt-2 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatRupiah(netProfit)}
          </p>
          <span className="text-xs text-zinc-400 font-medium mt-1 inline-block">Margin: {netMargin}%</span>
        </div>
      </div>

      {/* Financial Statement Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
        <h3 className="font-bold text-lg text-zinc-900 border-b border-zinc-100 pb-3">
          Rincian Laba Rugi Standar Akuntansi
        </h3>

        <div className="space-y-4 text-sm">
          {/* Pendapatan */}
          <div>
            <div className="flex justify-between font-bold text-zinc-900 py-2 border-b border-zinc-100">
              <span>1. PENDAPATAN OPERASIONAL</span>
              <span>{formatRupiah(totalRevenue)}</span>
            </div>
            <div className="pl-4 py-1.5 flex justify-between text-zinc-600 text-xs">
              <span>Penjualan Bersih Kasir</span>
              <span>{formatRupiah(totalRevenue)}</span>
            </div>
          </div>

          {/* HPP */}
          <div>
            <div className="flex justify-between font-bold text-zinc-900 py-2 border-b border-zinc-100">
              <span>2. HARGA POKOK PENJUALAN (HPP)</span>
              <span className="text-zinc-700">({formatRupiah(totalCOGS)})</span>
            </div>
            <div className="pl-4 py-1.5 flex justify-between text-zinc-600 text-xs">
              <span>Beban Pokok Bahan Baku & Menu</span>
              <span>({formatRupiah(totalCOGS)})</span>
            </div>
          </div>

          {/* Laba Kotor */}
          <div className="bg-zinc-50 p-3 rounded-xl flex justify-between font-bold text-zinc-900">
            <span>LABA KOTOR (GROSS PROFIT)</span>
            <span className="text-amber-800">{formatRupiah(grossProfit)}</span>
          </div>

          {/* Beban Pengeluaran */}
          <div>
            <div className="flex justify-between font-bold text-zinc-900 py-2 border-b border-zinc-100">
              <span>3. BEBAN OPERASIONAL & UMUM</span>
              <span className="text-red-600">({formatRupiah(totalExpenses)})</span>
            </div>
            <div className="pl-4 py-1.5 flex justify-between text-zinc-600 text-xs">
              <span>Total Pengeluaran Kas Operasional</span>
              <span>({formatRupiah(totalExpenses)})</span>
            </div>
          </div>

          {/* Laba Bersih Final */}
          <div className={`p-4 rounded-xl flex justify-between font-extrabold text-lg ${
            netProfit >= 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
          }`}>
            <span>LABA BERSIH (NET PROFIT)</span>
            <span>{formatRupiah(netProfit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
