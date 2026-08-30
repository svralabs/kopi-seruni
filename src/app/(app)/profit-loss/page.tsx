import { db } from '@/lib/db';
import { orders, expenses, orderItems, outlets } from '@/lib/schema';
import { formatRupiah } from '@/lib/utils';
import { sql, eq, and, gte } from 'drizzle-orm';
import Link from 'next/link';
import { TrendingUp, Coins, Receipt, WalletCards, BarChart3, Store } from 'lucide-react';
import OutletFilter from '@/components/outlet-filter';


export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; outletId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const period = resolvedParams.period || 'this_month';
  const outletId = resolvedParams.outletId || 'all';

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

  let allOutlets: any[] = [];
  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalExpenses = 0;

  try {
    allOutlets = await db.select().from(outlets);

    const orderConditions = [eq(orders.status, 'completed')];
    if (startEpoch > 0) orderConditions.push(gte(orders.createdAt, startEpoch));
    if (outletId !== 'all') orderConditions.push(eq(orders.outletId, outletId));

    const revenueQuery = await db
      .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
      .from(orders)
      .where(and(...orderConditions));

    totalRevenue = Number(revenueQuery[0]?.total || 0);

    const cogsQuery = await db
      .select({
        totalCost: sql<number>`COALESCE(SUM(order_items.cost_price * order_items.quantity), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...orderConditions));

    totalCOGS = Number(cogsQuery[0]?.totalCost || 0);

    const expenseConditions = [];
    if (startEpoch > 0) expenseConditions.push(gte(expenses.expenseDate, startEpoch));
    if (outletId !== 'all') expenseConditions.push(eq(expenses.outletId, outletId));

    const expenseQuery = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(expenses)
      .where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined);

    totalExpenses = Number(expenseQuery[0]?.total || 0);
  } catch (e) {
    console.warn('Profit Loss DB query error:', e);
  }

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      {/* Header Bento */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Laporan Keuangan & Laba Rugi
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Analisis pendapatan kotor (Gross Profit), beban modal (COGS), dan laba bersih (Net Profit)
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Outlet Filter */}
          <OutletFilter outlets={allOutlets} selectedOutletId={outletId} />


          {/* Period Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-[#EBE7DF] shadow-xs text-xs">
            {[
              { key: 'today', label: 'Hari Ini' },
              { key: 'this_month', label: 'Bulan Ini' },
              { key: 'all', label: 'Semua' },
            ].map((t) => (
              <Link
                key={t.key}
                href={`/profit-loss?period=${t.key}${outletId !== 'all' ? `&outletId=${outletId}` : ''}`}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  period === t.key
                    ? 'bg-[#2E2520] text-white shadow-xs'
                    : 'text-[#8E867C] hover:text-[#201C1A]'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Revenue */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Total Revenue (Omset)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#54382B] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-3xl text-[#201C1A]">
              {formatRupiah(totalRevenue)}
            </h2>
            <p className="text-[10px] text-[#8E867C] mt-1">Penjualan produk lunas</p>
          </div>
        </div>

        {/* COGS */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Beban Pokok Penjualan (HPP)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#7A7268] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-3xl text-[#7A7268]">
              {formatRupiah(totalCOGS)}
            </h2>
            <p className="text-[10px] text-[#8E867C] mt-1">Total harga pokok bahan</p>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Laba Kotor (Gross Profit)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#2D7A47] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-3xl text-[#2D7A47]">
              {formatRupiah(grossProfit)}
            </h2>
            <p className="text-[10px] text-[#2D7A47] font-semibold mt-1">Margin Kotor: {grossMargin}%</p>
          </div>
        </div>

        {/* Operational Expenses */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Beban Operasional (Expenses)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#964B3B] flex items-center justify-center">
              <WalletCards className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-3xl text-[#964B3B]">
              {formatRupiah(totalExpenses)}
            </h2>
            <p className="text-[10px] text-[#8E867C] mt-1">Gaji, listrik, sewa, & supplies</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Laba Bersih (Net Profit)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#2D7A47] flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2
              className={`font-serif font-black text-4xl ${
                netProfit >= 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'
              }`}
            >
              {formatRupiah(netProfit)}
            </h2>
            <p className="text-xs text-[#2D7A47] font-bold mt-1.5">
              Net Profit Margin: {netMargin}% • Dasar perhitungan Bagi Hasil
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
